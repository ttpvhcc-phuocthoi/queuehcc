import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const soundEnabled = true;

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

const COUNTERS: CounterMeta[] = [
    { id: 1, name: 'TRẢ KẾT QUẢ' },
    { id: 2, name: 'TÀI CHÍNH, NỘI VỤ - Y TẾ' },
    { id: 3, name: 'XÂY DỰNG - CÔNG THƯƠNG' },
    { id: 4, name: 'ĐẤT ĐAI MÔI TRƯỜNG' },
    { id: 5, name: 'ĐẤT ĐAI' },
    { id: 6, name: 'TƯ PHÁP - HỘ TỊCH' }
];


function normalizeFeedPayload(data: unknown): FeedItem[] {
    if (!Array.isArray(data)) {
        return [];
    }

    return data
        .map((item) => item as Partial<FeedItem> & { counter?: CounterMeta; processing?: Customer | null; next?: Customer | null })
        .filter((item): item is Partial<FeedItem> & { counter: CounterMeta; processing?: Customer | null; next?: Customer | null } => Boolean(item?.counter))
        .map((item) => ({
            counter: {
                id: Number(item.counter?.id ?? 0),
                name: String(item.counter?.name ?? '')
            },
            processing: item.processing ? { ...item.processing } : null,
            next: item.next ? { ...item.next } : null
        }))
        .filter((item) => item.counter.id > 0);
}

function LandingPage() {
    const navigate = useNavigate();
    const [feed, setFeed] = useState<FeedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const notificationQueueRef = useRef<string[]>([]);
    const isSpeakingRef = useRef(false);

    function buildProcessingMessage(item: FeedItem) {
        if (!item.processing) {
            return null;
        }

        const nameSuffix = item.processing.name ? ` ${item.processing.name}` : '';
        return `Cho mời số ${item.processing.queueNumber} ...... Quầy số ${item.counter.id} ... ${nameSuffix}`;
    }

    function playNextNotification() {
        if(!soundEnabled) return;

        if (isSpeakingRef.current || notificationQueueRef.current.length === 0) {
            return;
        }

        isSpeakingRef.current = true;
        const message = notificationQueueRef.current.shift();
        if (!message) {
            isSpeakingRef.current = false;
            return;
        }

        if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
            isSpeakingRef.current = false;
            playNextNotification();
            return;
        }

        const utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = 'vi-VN';
        utterance.rate = 0.9;
        utterance.onend = () => {
            isSpeakingRef.current = false;
            playNextNotification();
        };
        utterance.onerror = () => {
            isSpeakingRef.current = false;
            playNextNotification();
        };

        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    }

    function queueNotification(message: string | null) {
        if (!message) {
            return;
        }

        notificationQueueRef.current.push(message);
        playNextNotification();
    }

    function applyFeedPayload(data: unknown) {
        const feedItems = normalizeFeedPayload(data);

        setFeed((currentFeed) => {
            const currentById = new Map(currentFeed.map((item) => [item.counter.id, item]));
            const nextFeed = COUNTERS.map((counter) => {
                const existing = currentById.get(counter.id);
                const matched = feedItems.find((item) => item.counter.id === counter.id);

                return matched
                    ? {
                        counter: matched.counter,
                        processing: matched.processing ?? null,
                        next: matched.next ?? null
                    }
                    : {
                        counter,
                        processing: null,
                        next: null
                    };
            });

            const nextFeedById = new Map(nextFeed.map((item) => [item.counter.id, item]));
            currentFeed.forEach((item) => {
                const nextItem = nextFeedById.get(item.counter.id);
                const previousProcessing = item.processing;
                const nextProcessing = nextItem?.processing;

                if (
                    nextProcessing &&
                    nextProcessing.status === 'PROCESSING' &&
                    (!previousProcessing || previousProcessing.id !== nextProcessing.id)
                ) {
                    queueNotification(buildProcessingMessage(nextItem));
                }
            });

            return nextFeed.sort((a, b) => a.counter.id - b.counter.id);
        });
    }

    async function loadFeed() {
        try {
            const response = await fetch(`${API_URL}/general/feed`);
            if (!response.ok) {
                throw new Error('Unable to load display feed');
            }

            const data = await response.json();
            applyFeedPayload(data);
            setError('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to load display feed');
        }
    }

    useEffect(() => {
        let isMounted = true;
        const eventSource = new EventSource(`${API_URL}/general/feed/stream`);

        eventSource.addEventListener('connected', () => {
            if (isMounted) {
                setError('');
            }
        });

        eventSource.addEventListener('feed', (event) => {
            try {
                const payload = JSON.parse(event.data);
                applyFeedPayload(payload);
                if (isMounted) {
                    setLoading(false);
                    setError('');
                }
            } catch {
                if (isMounted) {
                    setError('Unable to parse live feed update');
                }
            }
        });

        eventSource.onerror = () => {
            if (isMounted) {
                setError('Live updates are unavailable');
            }
        };

        const initialiseFeed = async () => {
            setLoading(true);
            await loadFeed();
            if (isMounted) {
                setLoading(false);
            }
        };

        void initialiseFeed();

        return () => {
            isMounted = false;
            eventSource.close();
        };
    }, []);

    const cards = useMemo(
        () =>
            COUNTERS.map((counter) => {
                const item = feed.find((entry) => entry.counter.id === counter.id);

                return (
                    <div key={counter.id} className="landing-card">
                        <div className="landing-card-header">
                            <h2>Quầy {counter.id}</h2>
                            <span>{counter.name}</span>
                        </div>

                        <div className="landing-section">
                            <div className="landing-label">Đang xử lý</div>
                            {item?.processing ? (
                                <div className="landing-number">{item.processing.queueNumber} {item.processing.name}</div>
                            ) : (
                                <div className="landing-empty">—</div>
                            )}
                        </div>

                        <div className="landing-section">
                            <div className="landing-label">Tiếp theo</div>
                            {item?.next ? (
                                <div className="landing-number secondary-number">{item.next.queueNumber} {item.next.name}</div>
                            ) : (
                                <div className="landing-empty">—</div>
                            )}
                        </div>
                    </div>
                );
            }),
        [feed]
    );

    return (
        <div className="landing-page">
            {loading && <p>Đang tải dữ liệu…</p>}
            {error && <div className="error">{error}</div>}

            {!loading && <div className="landing-grid">{cards}</div>}
        </div>
    );
}

export default LandingPage;
