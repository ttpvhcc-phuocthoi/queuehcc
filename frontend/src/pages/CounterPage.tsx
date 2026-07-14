import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearSessionWorker, getSessionWorkerId } from '../session';

type Customer = {
  id: number;
  name: string | null;
  phoneNumber: string | null;
  priorityLevel: number;
  queueNumber: number;
  status: string;
  counterId: number;
};

type WorkerInfo = {
  id: number;
  displayName: string;
  counterId: number;
};

const STATUS_CONVERT: Record<string, string> = {
  WAITING: 'Đang chờ',
  PROCESSING: 'Đang xử lý',
  COMPLETED: 'Hoàn tất',
  SKIPPED: 'Bỏ qua'
};

const PRIORITY_CONVERT: Record<number, string> = {
  0: 'Bình thường',
  1: 'Ưu tiên'
};

function CounterPage() {
  const navigate = useNavigate();
  const [worker, setWorker] = useState<WorkerInfo | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const workerId = getSessionWorkerId();
    if (!workerId) {
      return;
    }

    async function loadCounterData(showLoading = false) {
      try {
        if (showLoading) {
          setLoading(true);
        }
        setError('');

        const workerResponse = await fetch(`/workers/${workerId}`);
        if (!workerResponse.ok) {
          throw new Error('Unable to load worker info');
        }

        const workerData = await workerResponse.json();
        setWorker({
          id: workerData.id,
          displayName: workerData.displayName,
          counterId: workerData.counterId
        });

        const customerResponse = await fetch(
          `/customers?counterId=${workerData.counterId}`
        );
        if (!customerResponse.ok) {
          throw new Error('Unable to load counter customer');
        }

        const customersData = await customerResponse.json();
        setCustomers(customersData ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load counter data');
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    }

    loadCounterData(true);

    const intervalId = window.setInterval(() => {
      void loadCounterData(false);
    }, 3000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  async function updateStatus(customerId: number, status: string) {
    const targetCustomer = customers.find((item) => item.id === customerId);

    if (status === 'PROCESSING' && targetCustomer?.status !== 'WAITING') {
      setError('Chỉ khách hàng đang chờ mới có thể được gọi.');
      return;
    }

    if (status === 'PROCESSING' && customers.some((item) => item.status === 'PROCESSING')) {
      setError('Chỉ cho phép một khách hàng đang được xử lý tại một thời điểm.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await fetch(`/customers/${customerId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        throw new Error('Unable to update customer status');
      }

      const updated = await response.json();
      setCustomers((current) => {
        const nextCustomers = current.map((item) => (item.id === updated.id ? updated : item));
        return nextCustomers.sort((a, b) => {
          const statusOrder = { PROCESSING: 0, WAITING: 1, SKIPPED: 2, COMPLETED: 3 } as Record<string, number>;
          const rankA = statusOrder[a.status] ?? 99;
          const rankB = statusOrder[b.status] ?? 99;
          if (rankA !== rankB) {
            return rankA - rankB;
          }
          return a.queueNumber - b.queueNumber;
        });
      });

      if (status === 'PROCESSING' && updated.counterId) {
        const notificationPayload = {
          counterId: updated.counterId,
          queueNumber: updated.queueNumber
        };

        if (typeof BroadcastChannel !== 'undefined') {
          const channel = new BroadcastChannel('queuehcc-display');
          channel.postMessage(notificationPayload);
          channel.close();
        }

        window.localStorage.setItem('queuehcc-display-notification', JSON.stringify(notificationPayload));
        window.localStorage.removeItem('queuehcc-display-notification');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Status update failed');
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    clearSessionWorker();
    navigate('/login', { replace: true });
  }

  return (
    <div className="wrapper">
      <div className="table">
        <div className="header-row">
          <div>
            <h1>Thông tin quầy</h1>
            {worker && <p>Tài khoản: {worker.displayName}</p>}
          </div>
          <button className="secondary" onClick={logout}>
            Đăng xuất
          </button>
        </div>

        {loading && <p>Đang tải dữ liệu…</p>}
        {error && <div className="error">{error}</div>}

        {!loading && customers.length === 0 && <p>Không có khách hàng nào đang chờ.</p>}

        {!loading && customers.length > 0 && (
          <div className="table-card">
            <table className="customer-table">
              <thead>
                <tr>
                  <th>Số thứ tự</th>
                  <th>Trạng thái</th>
                  <th>Ưu tiên</th>
                  <th>Họ và tên</th>
                  <th>Số điện thoại</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td>{customer.queueNumber}</td>
                    <td>{STATUS_CONVERT[customer.status] || customer.status}</td>
                    <td>{PRIORITY_CONVERT[customer.priorityLevel] || customer.priorityLevel}</td>
                    <td>{customer.name ?? '—'}</td>
                    <td>{customer.phoneNumber ?? '—'}</td>
                    <td>
                      {customer.status === 'COMPLETED' ? (
                        <span className="completed-pill">Đã hoàn tất</span>
                      ) : (
                        <div className="table-actions">
                          {customer.status !== 'PROCESSING' && (
                            <button onClick={() => updateStatus(customer.id, 'PROCESSING')}>Gọi</button>
                          )}
                          <button className="secondary" onClick={() => updateStatus(customer.id, 'COMPLETED')}>
                            Hoàn tất
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default CounterPage;
