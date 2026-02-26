import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

// Providers
import { AuthProvider } from '@/contexts/AuthContext';
import { TranslationProvider } from '@/i18n/TranslationProvider';

// Guards
import {
  RequireAuth,
  RequireAdmin,
  RequireSpeakerPortal,
  RequireSponsorPortal,
  RedirectIfAuthenticated,
} from '@/routes/guards';

// Layouts
import PublicLayout from '@/components/layouts/PublicLayout';
import AdminLayout from '@/components/layouts/AdminLayout';

// Public Pages
import HomePage from '@/pages/public/HomePage';
import EventsPage from '@/pages/public/EventsPage';
import EventDetailPage from '@/pages/public/EventDetailPage';
import EventRegisterPage from '@/pages/public/EventRegisterPage';
import OrderSuccessPage from '@/pages/public/OrderSuccessPage';
import SpeakersPage from '@/pages/public/SpeakersPage';
import SponsorsPage from '@/pages/public/SponsorsPage';
import PastEventsPage from '@/pages/public/PastEventsPage';

// Auth Pages
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';

// Admin Pages
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminEventsPage from '@/pages/admin/AdminEventsPage';
import AdminSpeakersPage from '@/pages/admin/AdminSpeakersPage';
import AdminSponsorsPage from '@/pages/admin/AdminSponsorsPage';
import AdminSponsorLeadsPage from '@/pages/admin/AdminSponsorLeadsPage';
import AdminAttendeesPage from '@/pages/admin/AdminAttendeesPage';
import AdminCheckInPage from '@/pages/admin/AdminCheckInPage';
import AdminTranslationsPage from '@/pages/admin/AdminTranslationsPage';
import AdminAnalyticsPage from '@/pages/admin/AdminAnalyticsPage';
import AdminSettingsPage from '@/pages/admin/AdminSettingsPage';
import AdminCreateEventPage from '@/pages/admin/AdminCreateEventPage';
import AdminImportExportPage from '@/pages/admin/AdminImportExportPage';
import AdminCheckInScanPage from '@/pages/admin/AdminCheckInScanPage';
// Import/Export still a stub — coming next sprint
import AdminEventDetailPage from '@/pages/admin/AdminEventDetailPage';
import AdminVouchersPage from '@/pages/admin/AdminVouchersPage';

// Portals / user pages
import MyTicketsPage from '@/pages/portal/MyTicketsPage';

// Portals
import SpeakerPortal from '@/pages/portals/SpeakerPortal';
import SponsorPortal from '@/pages/portals/SponsorPortal';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TranslationProvider>
          <BrowserRouter>
            <Routes>
              {/* ================================================
                  PUBLIC ROUTES
                  ================================================ */}
              <Route element={<PublicLayout />}>
                <Route index element={<HomePage />} />
                <Route path="events" element={<EventsPage />} />
                <Route path="events/:slug" element={<EventDetailPage />} />
                <Route path="events/:slug/register" element={<RequireAuth><EventRegisterPage /></RequireAuth>} />
                <Route path="order/success" element={<RequireAuth><OrderSuccessPage /></RequireAuth>} />
                <Route path="order/cancel" element={<EventDetailPage />} />
                <Route path="speakers" element={<SpeakersPage />} />
                <Route path="sponsors" element={<SponsorsPage />} />
                <Route path="past-events" element={<PastEventsPage />} />
                <Route path="my-tickets" element={<RequireAuth><MyTicketsPage /></RequireAuth>} />
              </Route>

              {/* ================================================
                  AUTH ROUTES
                  ================================================ */}
              <Route
                path="auth/login"
                element={
                  <RedirectIfAuthenticated>
                    <LoginPage />
                  </RedirectIfAuthenticated>
                }
              />
              <Route
                path="auth/register"
                element={
                  <RedirectIfAuthenticated>
                    <RegisterPage />
                  </RedirectIfAuthenticated>
                }
              />
              <Route
                path="auth/forgot-password"
                element={
                  <RedirectIfAuthenticated>
                    <ForgotPasswordPage />
                  </RedirectIfAuthenticated>
                }
              />
              <Route
                path="auth/reset-password"
                element={<ResetPasswordPage />}
              />

              {/* ================================================
                  ADMIN ROUTES
                  ================================================ */}
              <Route
                path="admin"
                element={
                  <RequireAdmin>
                    <AdminLayout />
                  </RequireAdmin>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="events" element={<AdminEventsPage />} />
                <Route path="events/create" element={<AdminCreateEventPage />} />
                <Route path="events/:id" element={<AdminEventDetailPage />} />
                <Route path="speakers" element={<AdminSpeakersPage />} />
                <Route path="sponsors" element={<AdminSponsorsPage />} />
                <Route path="sponsors/leads" element={<AdminSponsorLeadsPage />} />
                <Route path="attendees" element={<AdminAttendeesPage />} />
                <Route path="check-in" element={<AdminCheckInPage />} />
                <Route path="check-in/scan" element={<AdminCheckInScanPage />} />
                <Route path="vouchers" element={<AdminVouchersPage />} />
                <Route path="translations" element={<AdminTranslationsPage />} />
                <Route path="import-export" element={<AdminImportExportPage />} />
                <Route path="analytics" element={<AdminAnalyticsPage />} />
                <Route path="settings" element={<AdminSettingsPage />} />
              </Route>

              {/* ================================================
                  SPEAKER PORTAL
                  ================================================ */}
              <Route
                path="speaker-portal/*"
                element={
                  <RequireSpeakerPortal>
                    <SpeakerPortal />
                  </RequireSpeakerPortal>
                }
              />

              {/* ================================================
                  SPONSOR PORTAL
                  ================================================ */}
              <Route
                path="sponsor-portal/*"
                element={
                  <RequireSponsorPortal>
                    <SponsorPortal />
                  </RequireSponsorPortal>
                }
              />

              {/* 404 */}
              <Route
                path="*"
                element={
                  <div style={{ textAlign: 'center', padding: '8rem 1rem', color: 'var(--color-text-muted)' }}>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '4rem', color: 'var(--color-text)' }}>404</h1>
                    <p>Page not found.</p>
                  </div>
                }
              />
            </Routes>
          </BrowserRouter>

          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
                fontFamily: 'var(--font-sans)',
                fontSize: '0.875rem',
              },
            }}
          />
        </TranslationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
