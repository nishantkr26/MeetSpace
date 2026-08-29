import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Auth } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { JoinMeeting } from './pages/JoinMeeting';
import { Lobby } from './pages/Lobby';
import { Meeting } from './pages/Meeting';
import { ErrorBoundary } from './components/ErrorBoundary';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Auth />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/join"
            element={
              <ProtectedRoute>
                <JoinMeeting />
              </ProtectedRoute>
            }
          />
          {/* Every route into a meeting goes through the lobby: it is what calls
              api.joinMeeting, and that row is what the roster is built from. */}
          <Route
            path="/lobby/:meetingCode"
            element={
              <ProtectedRoute>
                <Lobby />
              </ProtectedRoute>
            }
          />
          <Route
            path="/meeting/:meetingCode"
            element={
              <ProtectedRoute>
                <Meeting />
              </ProtectedRoute>
            }
          />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
