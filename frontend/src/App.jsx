import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';

import DashboardPage from './pages/DashboardPage';
import SearchPage from './pages/SearchPage';
import FavoritePage from './pages/FavoritePage';
import RecommendPage from './pages/RecommendPage';
import ReportBugPage from './pages/ReportBugPage';
import SeeAllPage from './pages/SeeAllPage';

import GenreSelectPage from './pages/preferences/GenreSelectPage';
import AuthorSelectPage from './pages/preferences/AuthorSelectPage';
import BookSelectPage from './pages/preferences/BookSelectPage';

import AdminHomePage from './pages/admin/AdminHomePage';
import ManageBookPage from './pages/admin/ManageBookPage';
import ManageAuthorPage from './pages/admin/ManageAuthorPage';
import ManageGenrePage from './pages/admin/ManageGenrePage';
import ManageUserPage from './pages/admin/ManageUserPage';
import ManageReportPage from './pages/admin/ManageReportPage';
import ManageReviewPage from './pages/admin/ManageReviewPage';
import BookReviewsPage from './pages/BookReviewsPage';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return children;
  return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />

            {/* Private */}
            <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
            <Route path="/search" element={<PrivateRoute><SearchPage /></PrivateRoute>} />
            <Route path="/favorites" element={<PrivateRoute><FavoritePage /></PrivateRoute>} />
            <Route path="/recommend" element={<PrivateRoute><RecommendPage /></PrivateRoute>} />
            <Route path="/report-bug" element={<PrivateRoute><ReportBugPage /></PrivateRoute>} />
            <Route path="/reviews" element={<PrivateRoute><BookReviewsPage /></PrivateRoute>} />
            <Route path="/seeall" element={<PrivateRoute><SeeAllPage /></PrivateRoute>} />

            {/* Preferences (onboarding) */}
            <Route path="/preferences/genres" element={<PrivateRoute><GenreSelectPage /></PrivateRoute>} />
            <Route path="/preferences/authors" element={<PrivateRoute><AuthorSelectPage /></PrivateRoute>} />
            <Route path="/preferences/books" element={<PrivateRoute><BookSelectPage /></PrivateRoute>} />

            {/* Admin */}
            <Route path="/admin" element={<PrivateRoute><AdminHomePage /></PrivateRoute>} />
            <Route path="/admin/books" element={<PrivateRoute><ManageBookPage /></PrivateRoute>} />
            <Route path="/admin/authors" element={<PrivateRoute><ManageAuthorPage /></PrivateRoute>} />
            <Route path="/admin/genres" element={<PrivateRoute><ManageGenrePage /></PrivateRoute>} />
            <Route path="/admin/users" element={<PrivateRoute><ManageUserPage /></PrivateRoute>} />
            <Route path="/admin/reports" element={<PrivateRoute><ManageReportPage /></PrivateRoute>} />
            <Route path="/admin/reviews" element={<PrivateRoute><ManageReviewPage /></PrivateRoute>} />

            {/* Default */}
            <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
