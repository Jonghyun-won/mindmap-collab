import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MindMapEditor from './pages/MindMapEditor';
import AcceptInvite from './pages/AcceptInvite';

function LoginRedirect() {
  const pendingInvite = localStorage.getItem('pending_invite');
  if (pendingInvite) {
    localStorage.removeItem('pending_invite');
    return <Navigate to={`/invite/${pendingInvite}`} />;
  }
  return <Navigate to="/" />;
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={user ? <LoginRedirect /> : <Login />}
        />
        <Route
          path="/"
          element={user ? <Dashboard /> : <Navigate to="/login" />}
        />
        <Route
          path="/dashboard"
          element={user ? <Dashboard /> : <Navigate to="/login" />}
        />
        <Route
          path="/editor/:id"
          element={user ? <MindMapEditor /> : <Navigate to="/login" />}
        />
        <Route
          path="/invite/:token"
          element={<AcceptInvite />}
        />
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
