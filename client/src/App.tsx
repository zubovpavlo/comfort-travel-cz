import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { type ReactNode } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import HomePage from './pages/HomePage';
import ResultsPage from './pages/ResultsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import FavoritesPage from './pages/FavoritesPage';
import TripDetailPage from './pages/TripDetailPage';
import AccommodationDetailPage from './pages/AccommodationDetailPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminDatabasePage from './pages/admin/AdminDatabasePage';

const queryClient = new QueryClient();

/** Regular user pages — redirect admins to /admin */
function UserRoute({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth();
  if (isAdmin) return <Navigate to="/admin" replace />;
  return <>{children}</>;
}

/** Admin-only pages — redirect unauthenticated to login, non-admins to home */
function AdminRoute({ children }: { children: ReactNode }) {
  const { user, isAdmin } = useAuth();
  if (!user) return <Navigate to="/prihlaseni" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1">
        <Routes>
          {/* Public */}
          <Route path="/prihlaseni" element={<LoginPage />} />
          <Route path="/registrace" element={<RegisterPage />} />

          {/* User-only routes */}
          <Route path="/" element={<UserRoute><HomePage /></UserRoute>} />
          <Route path="/hledat" element={<Navigate to="/" replace />} />
          <Route path="/vysledky" element={<UserRoute><ResultsPage /></UserRoute>} />
          <Route path="/profil" element={<UserRoute><ProfilePage /></UserRoute>} />
          <Route path="/oblibene" element={<UserRoute><FavoritesPage /></UserRoute>} />
          <Route path="/detail" element={<UserRoute><TripDetailPage /></UserRoute>} />
          <Route path="/ubytovani/:externalId" element={<UserRoute><AccommodationDetailPage /></UserRoute>} />

          {/* Admin-only routes */}
          <Route path="/admin" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
          <Route path="/admin/uzivatele" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
          <Route path="/admin/databaze" element={<AdminRoute><AdminDatabasePage /></AdminRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <Toaster position="top-right" />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
