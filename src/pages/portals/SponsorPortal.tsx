// Sponsor portal — placeholder for Phase 8
import { useTranslation } from '@/i18n/TranslationProvider';
import { useAuth } from '@/contexts/AuthContext';
import { Award, Users, Calendar, ExternalLink } from 'lucide-react';

export default function SponsorPortal() {
    const { t } = useTranslation();
    const { profile } = useAuth();

    return (
        <div className="container section">
            <div style={{ marginBottom: 'var(--space-8)' }}>
                <h1 className="section-title" style={{ marginBottom: 'var(--space-2)' }}>
                    {t('sponsor_portal.title', 'Sponsor Portal')}
                </h1>
                <p className="text-muted">
                    {t('sponsor_portal.welcome', 'Welcome')}, {profile?.display_name}.
                </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-5)' }}>
                {[
                    { icon: <Award size={24} />, label: t('sponsor_portal.company', 'Company Details'), desc: t('sponsor_portal.company_desc', 'Update logo and description') },
                    { icon: <Users size={24} />, label: t('sponsor_portal.leads', 'Leads'), desc: t('sponsor_portal.leads_desc', 'Download attendee leads') },
                    { icon: <Calendar size={24} />, label: t('sponsor_portal.calendly', 'Meeting Scheduler'), desc: t('sponsor_portal.calendly_desc', 'Set up your Calendly link') },
                ].map((item) => (
                    <div key={item.label} className="card card--hover" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                        <div style={{ color: 'var(--color-gold)', marginBottom: 'var(--space-3)' }}>{item.icon}</div>
                        <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-text)', marginBottom: 'var(--space-2)' }}>{item.label}</h3>
                        <p className="text-muted text-sm">{item.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
