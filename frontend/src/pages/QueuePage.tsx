import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';


const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

type Counter = {
  id: number;
  name: string;
};

function QueuePage() {
  const navigate = useNavigate();
  const [counters, setCounters] = useState<Counter[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingId, setCreatingId] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadCounters() {
      try {
        setLoading(true);
        setError('');

        const response = await fetch(`${API_URL}/general/counters`);
        if (!response.ok) {
          throw new Error('Unable to load counters');
        }

        const data = await response.json();
        setCounters(data.slice(0, 6));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load counters');
      } finally {
        setLoading(false);
      }
    }

    loadCounters();
  }, []);

  async function handleCreateTicket(counter: Counter) {
    try {
      setCreatingId(counter.id);
      setError('');

      const response = await fetch(`${API_URL}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          counterId: counter.id,
          priorityLevel: 0
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Unable to create queue ticket');
      }

      const customer = await response.json();
      navigate('/queue/success', {
        state: {
          customer,
          counterName: counter.name
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create queue ticket');
    } finally {
      setCreatingId(null);
    }
  }

  return (
    <div className="queuepage-wrapper">
      <div className="container">
        <div className="header-row">
            <h1>Chọn quầy để lấy số thứ tự</h1>
        </div>

        {loading && <p>Loading counters…</p>}
        {error && <div className="error">{error}</div>}

        {!loading && (
          <div className="counter-grid" role="list">
            {counters.map((counter) => (
              <div
                key={counter.id}
                className={`counter-card${creatingId === counter.id ? ' is-loading' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => handleCreateTicket(counter)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleCreateTicket(counter);
                  }
                }}
              >
                <div className="counter-badge">Quầy {counter.id}</div>
                <h2 className='text-center'>{counter.name}</h2>
                {/* <p>{creatingId === counter.id ? 'Creating ticket…' : 'Tap to create a queue number'}</p> */}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default QueuePage;
