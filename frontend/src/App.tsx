import { useEffect, useState } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import CounterPage from './pages/CounterPage';
import QueuePage from './pages/QueuePage';
import QueueSuccessPage from './pages/QueueSuccessPage';
import DisplayPage from './pages/DisplayPage';
import LandingPage from './pages/LandingPage';
import { getSessionWorkerId, subscribeToSessionChange } from './session';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(getSessionWorkerId()));

  useEffect(() => {
    const unsubscribe = subscribeToSessionChange(() => {
      setIsAuthenticated(Boolean(getSessionWorkerId()));
    });

    return unsubscribe;
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/queue" element={<QueuePage />} />
      <Route path="/queue/success" element={<QueueSuccessPage />} />
      <Route path="/display" element={<DisplayPage />} />
      <Route
        path="/counter"
        element={isAuthenticated ? <CounterPage /> : <Navigate to="/login" replace />}
      />
      <Route path="/" element={<Navigate to="/landing" replace />} />
    </Routes>
  );
}

export default App;
