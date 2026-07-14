const SESSION_KEY = 'queuehcc_worker';
export const SESSION_CHANGED_EVENT = 'queuehcc-session-changed';

function notifySessionChange() {
  window.dispatchEvent(new Event(SESSION_CHANGED_EVENT));
}

export function saveSessionWorker(workerId: number) {
  localStorage.setItem(SESSION_KEY, String(workerId));
  notifySessionChange();
}

export function clearSessionWorker() {
  localStorage.removeItem(SESSION_KEY);
  notifySessionChange();
}

export function getSessionWorkerId() {
  const value = localStorage.getItem(SESSION_KEY);
  return value ? Number(value) : null;
}

export function subscribeToSessionChange(callback: () => void) {
  window.addEventListener(SESSION_CHANGED_EVENT, callback);

  return () => {
    window.removeEventListener(SESSION_CHANGED_EVENT, callback);
  };
}
