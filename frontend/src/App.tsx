import { useEffect, useState } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import CounterPage from './pages/CounterPage';
import QueuePage from './pages/QueuePage';
import QueueSuccessPage from './pages/QueueSuccessPage';
import DisplayPage from './pages/DisplayPage';
import LandingPage from './pages/LandingPage';
import { getSessionWorkerId, subscribeToSessionChange } from './session';
import MainLayout from './layout/mainlayout';


const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

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
      <Route element={<MainLayout />} >
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/queue" element={<QueuePage />} />
      </Route>

      <Route path="/login" element={<LoginPage />} />
      <Route path="/queue/success" element={<QueueSuccessPage />} />
      {/* <Route path="/display" element={<DisplayPage />} /> */}
      <Route
        path="/counter"
        element={isAuthenticated ? <CounterPage /> : <Navigate to="/login" replace />}
      />
      <Route path="/" element={<Navigate to="/landing" replace />} />
    </Routes>
  );
}

export default App;
