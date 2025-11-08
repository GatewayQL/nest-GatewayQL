import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { client } from './lib/apollo-client';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import './index.css';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
  return (
    <ApolloProvider client={client}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route
                path="users"
                element={
                  <div className="space-y-6">
                    <h1 className="text-3xl font-bold">Users Management</h1>
                    <p>User management interface coming soon...</p>
                  </div>
                }
              />
              <Route
                path="credentials"
                element={
                  <div className="space-y-6">
                    <h1 className="text-3xl font-bold">
                      Credentials Management
                    </h1>
                    <p>Credentials management interface coming soon...</p>
                  </div>
                }
              />
              <Route
                path="health"
                element={
                  <div className="space-y-6">
                    <h1 className="text-3xl font-bold">Health Monitoring</h1>
                    <p>Health monitoring dashboard coming soon...</p>
                  </div>
                }
              />
              <Route
                path="analytics"
                element={
                  <div className="space-y-6">
                    <h1 className="text-3xl font-bold">Analytics</h1>
                    <p>Analytics dashboard coming soon...</p>
                  </div>
                }
              />
            </Route>
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ApolloProvider>
  );
}

export default App;
