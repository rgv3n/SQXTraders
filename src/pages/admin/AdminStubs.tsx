// Admin placeholder pages — these will be built out in Phase 7
import { useTranslation } from '@/i18n/TranslationProvider';

function PlaceholderPage({ titleKey, title }: { titleKey: string; title: string }) {
    const { t } = useTranslation();
    return (
        <div>
            <div className="admin-page-header">
                <div>
                    <h1 className="admin-page-title">{t(titleKey, title)}</h1>
                    <p className="admin-page-subtitle" style={{ color: 'var(--color-text-muted)' }}>
                        {t('admin.coming_soon', 'Full implementation coming in Phase 7.')}
                    </p>
                </div>
            </div>
            <div className="card" style={{ padding: 'var(--space-12)', textAlign: 'center' }}>
                <p className="text-muted">🚧 {t('admin.under_construction', 'Under construction')}</p>
            </div>
        </div>
    );
}

export function AdminSpeakersPage() {
    return <PlaceholderPage titleKey="admin.nav.speakers" title="Speakers" />;
}
export function AdminSponsorsPage() {
    return <PlaceholderPage titleKey="admin.nav.sponsors" title="Sponsors" />;
}
export function AdminAttendeesPage() {
    return <PlaceholderPage titleKey="admin.nav.attendees" title="Attendees" />;
}
export function AdminCheckInPage() {
    return <PlaceholderPage titleKey="admin.nav.checkin" title="Check-in" />;
}
export function AdminTranslationsPage() {
    return <PlaceholderPage titleKey="admin.nav.translations" title="Translations" />;
}
export function AdminImportExportPage() {
    return <PlaceholderPage titleKey="admin.nav.import_export" title="Import / Export" />;
}
export function AdminAnalyticsPage() {
    return <PlaceholderPage titleKey="admin.nav.analytics" title="Analytics" />;
}
export function AdminSettingsPage() {
    return <PlaceholderPage titleKey="admin.nav.settings" title="Settings" />;
}
export function AdminCreateEventPage() {
    return <PlaceholderPage titleKey="admin.nav.create_event" title="Create Event" />;
}
export function AdminEventDetailPage() {
    return <PlaceholderPage titleKey="admin.nav.edit_event" title="Edit Event" />;
}
