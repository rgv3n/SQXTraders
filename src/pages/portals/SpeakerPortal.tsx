// Speaker portal — placeholder for Phase 8
import { useTranslation } from '@/i18n/TranslationProvider';
import { useAuth } from '@/contexts/AuthContext';
import { Star, Edit, FileText } from 'lucide-react';

export default function SpeakerPortal() {
    const { t } = useTranslation();
    const { profile } = useAuth();

    return (
        <div className="container section">
            <div style={{ marginBottom: 'var(--space-8)' }}>
                <h1 className="section-title" style={{ marginBottom: 'var(--space-2)' }}>
                    {t('speaker_portal.title', 'Speaker Portal')}
                </h1>
                <p className="text-muted">
                    {t('speaker_portal.welcome', 'Welcome')}, {profile?.display_name}.
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-5)' }}>
                {[
                    { icon: <Star size={24} />, label: t('speaker_portal.edit_bio', 'Edit Bio & Photo'), desc: t('speaker_portal.edit_bio_desc', 'Update your speaker profile') },
                    { icon: <FileText size={24} />, label: t('speaker_portal.my_talk', 'My Talk Details'), desc: t('speaker_portal.my_talk_desc', 'Manage your presentation info') },
                    { icon: <Edit size={24} />, label: t('speaker_portal.resources', 'Upload Resources'), desc: t('speaker_portal.resources_desc', 'Share slides or materials') },
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
