import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const isShowForm = false;

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

type Customer = {
    id: number;
    queueNumber: number;
    counterId: number;
    priorityLevel: number;
    status: string;
    name: string | null;
    phoneNumber: string | null;
};

type LocationState = {
    customer: Customer;
    counterName?: string;
};

function QueueSuccessPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const state = location.state as LocationState | null;
    const [customer, setCustomer] = useState<Customer | null>(state?.customer ?? null);
    const [fullName, setFullName] = useState(state?.customer?.name ?? '');
    const [phoneNumber, setPhoneNumber] = useState(state?.customer?.phoneNumber ?? '');
    const [isPriority, setIsPriority] = useState((state?.customer?.priorityLevel ?? 0) === 1);
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        const nextCustomer = state?.customer ?? null;
        setCustomer(nextCustomer);
        setFullName(nextCustomer?.name ?? '');
        setPhoneNumber(nextCustomer?.phoneNumber ?? '');
        setIsPriority((nextCustomer?.priorityLevel ?? 0) === 1);
        setError('');
        setSuccessMessage('');
    }, [state?.customer]);

    async function handleUpdate() {
        if (!customer) {
            return;
        }

        try {
            setUpdating(true);
            setError('');
            setSuccessMessage('');

            const response = await fetch(`${API_URL}/customers/${customer.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: fullName.trim() || null,
                    phoneNumber: phoneNumber.trim() || null,
                    priorityLevel: isPriority ? 1 : 0
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.error || 'Unable to update customer information');
            }

            const updatedCustomer = await response.json();
            setCustomer(updatedCustomer);
            setFullName(updatedCustomer.name ?? '');
            setPhoneNumber(updatedCustomer.phoneNumber ?? '');
            setIsPriority(updatedCustomer.priorityLevel === 1);
            setSuccessMessage('Thông tin được cập nhật.');
            navigate('/queue/success', { replace: true, state: { customer: updatedCustomer, counterName: state?.counterName } });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to update customer information');
        } finally {
            setUpdating(false);
        }
    }

    return (
        <div className="page">
            <div className="card wide">
                <button type="button" className="secondary" onClick={() => navigate('/queue')}>
                    Back
                </button>
                <div className="center">
                    <h1>LẤY SỐ THÀNH CÔNG</h1>
                    <h2>Quầy {customer?.counterId}: {state?.counterName}</h2>
                </div>

                {customer ? (
                    <>
                        <div className="queue-number-box">
                            <div className="queue-label">SỐ THỨ TỰ</div>
                            <div className="queue-number">{customer.queueNumber}</div>
                        </div>

                        {isShowForm ? (
                            <div className="customer-form-card">
                                <h2>Thông tin cá nhân <strong>(KHÔNG BẮT BUỘC)</strong></h2>
                                {error && <div className="error">{error}</div>}
                                {successMessage && <div className="success-message">{successMessage}</div>}
                                <label>
                                    Họ và tên
                                    <input
                                        value={fullName}
                                        onChange={(event) => setFullName(event.target.value)}
                                        placeholder="Nhập họ và tên"
                                    />
                                </label>
                                <label>
                                    Số điện thoại
                                    <input
                                        value={phoneNumber}
                                        onChange={(event) => setPhoneNumber(event.target.value)}
                                        placeholder="Nhập số điện thoại"
                                    />
                                </label>
                                <label className="checkbox-row">
                                    <input
                                        type="checkbox"
                                        checked={isPriority}
                                        onChange={(event) => setIsPriority(event.target.checked)}
                                    />
                                    <span>Ưu tiên (lớn tuổi, khuyết tật, ...)</span>
                                </label>
                                <div className="text-right">
                                    <button type="button" id="update-button" onClick={handleUpdate} disabled={updating}>
                                        {updating ? 'Đang cập nhật...' : 'Cập nhật'}
                                    </button>
                                </div>
                            </div>
                        ) : (<div></div>)}
                    </>
                ) : (
                    <div className="error">Không tìm thấy kết quả. Vui lòng quay lại và thử lại.</div>
                )}
            </div>
        </div>
    );
}

export default QueueSuccessPage;
