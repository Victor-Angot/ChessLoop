import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '../components/auth/ProtectedRoute'
import { RouteFallback } from '../components/RouteFallback'

const App = lazy(() => import('../App'))
const AdminAnalyticsPage = lazy(() => import('../pages/AdminAnalyticsPage'))
const AccountPage = lazy(() => import('../pages/AccountPage'))
const ForgotPasswordPage = lazy(() => import('../pages/ForgotPasswordPage'))
const LoginPage = lazy(() => import('../pages/LoginPage'))
const ResetPasswordPage = lazy(() => import('../pages/ResetPasswordPage'))
const SignupPage = lazy(() => import('../pages/SignupPage'))

export function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/account"
          element={
            <ProtectedRoute>
              <AccountPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <ProtectedRoute>
              <AdminAnalyticsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/*" element={<App />} />
      </Routes>
    </Suspense>
  )
}
