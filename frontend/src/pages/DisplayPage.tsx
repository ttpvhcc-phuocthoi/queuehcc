import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type Customer = {
  id: number;
  queueNumber: number;
  status: string;
  name: string | null;
  phoneNumber: string | null;
  priorityLevel: number;
};

type CounterMeta = {
  id: number;
  name: string;
};

type FeedItem = {
  counter: CounterMeta;
  processing: Customer | null;
  next: Customer | null;
};

const DEFAULT_COUNTERS: CounterMeta[] = [
  { id: 1, name: 'Trả kết quả' },
  { id: 2, name: 'TÀI CHÍNH, NỘI VỤ - Y TẾ' },
  { id: 3, name: 'XÂY DỰNG - CÔNG THƯƠNG' },
  { id: 4, name: 'ĐẤT ĐAI MÔI TRƯỜNG' },
  { id: 5, name: 'ĐẤT ĐAI' },
  { id: 6, name: 'TƯ PHÁP - HỘ TỊCH' }
];

function DisplayPage() {
  const navigate = useNavigate();
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const queueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);

  async function loadFeed(counterId: number) {
    try {
      const response = await fetch('/general/feed');
      if (!response.ok) {
        throw new Error('Unable to load display feed');
      }

      const data = await response.json();
      const feedItems = Array.isArray(data) ? data : [];

      setFeed((currentFeed) => {
        const currentById = new Map(currentFeed.map((item) => [item.counter.id, item]));
        const nextFeed = DEFAULT_COUNTERS.map((counter) => {
          const existing = currentById.get(counter.id);
          const matched = feedItems.find((item: FeedItem) => item.counter.id === counter.id);

          return matched
            ? {
                counter: matched.counter,
                processing: matched.processing ?? null,
                next: matched.next ?? null
              }
            : existing ?? {
                counter,
                processing: null,
                next: null
              };
        });

        return nextFeed.sort((a, b) => a.counter.id - b.counter.id);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load display feed');
    }
  }

  function playNotification(message: string) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    queueRef.current.push(message);

    if (isPlayingRef.current) {
      return;
    }

    const speakNext = () => {
      const nextMessage = queueRef.current.shift();
      if (!nextMessage) {
        isPlayingRef.current = false;
        return;
      }

      isPlayingRef.current = true;
      const utterance = new SpeechSynthesisUtterance(nextMessage);
      utterance.lang = 'vi-VN';
      utterance.rate = 0.8;
      utterance.onend = () => {
        speakNext();
      };
      utterance.onerror = () => {
        speakNext();
      };

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    };

    speakNext();
  }

  useEffect(() => {
    setLoading(true);
    const loadAllFeeds = async () => {
      await Promise.all(DEFAULT_COUNTERS.map((counter) => loadFeed(counter.id)));
      setLoading(false);
    };

    void loadAllFeeds();

    const intervalId = window.setInterval(() => {
      void Promise.all(DEFAULT_COUNTERS.map((counter) => loadFeed(counter.id)));
    }, 5000);

    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('queuehcc-display') : null;

    const handleMessage = (event: MessageEvent<{ counterId: number; queueNumber: number }>) => {
      const payload = event.data;
      if (!payload) {
        return;
      }

      playNotification(`Cho mời quầy ${payload.counterId} - Số ${payload.queueNumber}`);
    };

    channel?.addEventListener('message', handleMessage as EventListener);

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== 'queuehcc-display-notification') {
        return;
      }

      try {
        const payload = event.newValue ? JSON.parse(event.newValue) : null;
        if (!payload) {
          return;
        }

        playNotification(`Cho mời quầy ${payload.counterId} - Số ${payload.queueNumber}`);
      } catch {
        // Ignore invalid payloads
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      window.clearInterval(intervalId);
      channel?.removeEventListener('message', handleMessage as EventListener);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return (
    <div className="display-page">
      {loading && <p>Đang tải dữ liệu…</p>}
      {error && <div className="error">{error}</div>}

      {!loading && (
        <div className="display-grid">
          {DEFAULT_COUNTERS.map((counter) => {
            const item = feed.find((entry) => entry.counter.id === counter.id);
            return (
              <div key={counter.id} className="display-card">
                <div className="display-card-header">
                  <h2>Quầy {counter.id}</h2>
                  <span>{counter.name}</span>
                </div>

                <div className="display-section">
                  <div className="display-label">Đang xử lý</div>
                  {item?.processing ? (
                    <div className="display-number">{item.processing.queueNumber}</div>
                  ) : (
                    <div className="display-empty">—</div>
                  )}
                </div>

                <div className="display-section">
                  <div className="display-label">Tiếp theo</div>
                  {item?.next ? (
                    <div className="display-number secondary-number">{item.next.queueNumber}</div>
                  ) : (
                    <div className="display-empty">—</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default DisplayPage;
