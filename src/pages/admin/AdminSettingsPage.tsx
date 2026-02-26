import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Save, Globe, Bell, Shield, Palette } from 'lucide-react';
import { useTranslation } from '@/i18n/TranslationProvider';
import { supabase } from '@/lib/supabase';

interface SettingsForm {
    app_name: string;
    default_language: string;
    contact_email: string;
    timezone: string;
    allow_public_registration: boolean;
    require_email_confirmation: boolean;
    maintenance_mode: boolean;
}

const TIMEZONES = ['Europe/Madrid', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'America/Mexico_City', 'Asia/Tokyo', 'Australia/Sydney'];
const LANGUAGES = [{ code: 'es', label: 'Español' }, { code: 'en', label: 'English' }];

const Section = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
    <div className="card" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-text)', marginBottom: 'var(--space-5)' }}>
            <span style={{ color: 'var(--color-gold)' }}>{icon}</span> {title}
        </h2>
        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>{children}</div>
    </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', alignItems: 'center', gap: 'var(--space-4)' }}>
        <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-muted)' }}>{label}</label>
        <div>{children}</div>
    </div>
);

const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
    <button
        onClick={() => onChange(!value)}
        type="button"
        style={{
            width: 44, height: 24, borderRadius: 999, border: 'none', cursor: 'pointer',
            background: value ? 'var(--color-gold)' : 'var(--color-surface-muted)',
            position: 'relative', transition: 'background 0.2s',
        }}
    >
        <span style={{
            position: 'absolute', top: 2, left: value ? 22 : 2,
            width: 20, height: 20, borderRadius: '50%', background: '#fff',
            transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        }} />
    </button>
);

export default function AdminSettingsPage() {
    const { t } = useTranslation();
    const [saved, setSaved] = useState(false);
    const [form, setForm] = useState<SettingsForm>({
        app_name: import.meta.env.VITE_APP_NAME ?? 'EventOS',
        default_language: import.meta.env.VITE_DEFAULT_LANGUAGE ?? 'es',
        contact_email: '',
        timezone: 'Europe/Madrid',
        allow_public_registration: true,
        require_email_confirmation: true,
        maintenance_mode: false,
    });

    const saveMutation = useMutation({
        mutationFn: async () => {
            const settings = Object.entries(form).map(([key, value]) => ({
                key,
                value: String(value),
            }));
            await supabase.from('settings').upsert(settings, { onConflict: 'key' });
        },
        onSuccess: () => {
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        },
    });

    const set = (key: keyof SettingsForm, value: string | boolean) =>
        setForm(f => ({ ...f, [key]: value }));

    return (
        <div>
            <div className="admin-page-header">
                <div>
                    <h1 className="admin-page-title">{t('admin.nav.settings', 'Settings')}</h1>
                    <p className="admin-page-subtitle">{t('admin.settings.subtitle', 'Global platform configuration')}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    {saved && <span style={{ fontSize: 'var(--text-sm)', color: '#10b981', fontWeight: 600 }}>✓ {t('admin.settings.saved', 'Saved!')}</span>}
                    <button className="btn btn--primary" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                        <Save size={15} /> {t('common.save', 'Save Changes')}
                    </button>
                </div>
            </div>

            <Section icon={<Palette size={16} />} title={t('admin.settings.general', 'General')}>
                <Field label={t('admin.settings.app_name', 'App Name')}>
                    <input className="form-input" style={{ width: '100%' }} value={form.app_name} onChange={e => set('app_name', e.target.value)} />
                </Field>
                <Field label={t('admin.settings.contact_email', 'Contact Email')}>
                    <input className="form-input" style={{ width: '100%' }} type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} />
                </Field>
            </Section>

            <Section icon={<Globe size={16} />} title={t('admin.settings.localization', 'Localization')}>
                <Field label={t('admin.settings.default_language', 'Default Language')}>
                    <select className="form-input" style={{ width: '100%' }} value={form.default_language} onChange={e => set('default_language', e.target.value)}>
                        {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                    </select>
                </Field>
                <Field label={t('admin.settings.timezone', 'Timezone')}>
                    <select className="form-input" style={{ width: '100%' }} value={form.timezone} onChange={e => set('timezone', e.target.value)}>
                        {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                    </select>
                </Field>
            </Section>

            <Section icon={<Shield size={16} />} title={t('admin.settings.security', 'Security & Access')}>
                <Field label={t('admin.settings.public_reg', 'Allow Public Registration')}>
                    <Toggle value={form.allow_public_registration} onChange={v => set('allow_public_registration', v)} />
                </Field>
                <Field label={t('admin.settings.email_confirm', 'Require Email Confirmation')}>
                    <Toggle value={form.require_email_confirmation} onChange={v => set('require_email_confirmation', v)} />
                </Field>
                <Field label={t('admin.settings.maintenance', 'Maintenance Mode')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Toggle value={form.maintenance_mode} onChange={v => set('maintenance_mode', v)} />
                        {form.maintenance_mode && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error, #ef4444)', fontWeight: 600 }}>⚠ Site is in maintenance mode</span>}
                    </div>
                </Field>
            </Section>

            <Section icon={<Bell size={16} />} title={t('admin.settings.notifications', 'Notifications')}>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                    {t('admin.settings.notifications_info', 'Email notification templates and Stripe webhook configuration are managed via environment variables.')}
                </p>
                <div style={{ fontFamily: 'monospace', fontSize: 'var(--text-xs)', background: 'var(--color-surface-muted)', padding: 'var(--space-4)', borderRadius: 8, color: 'var(--color-text-muted)', lineHeight: 1.8 }}>
                    VITE_SUPABASE_URL<br />
                    VITE_SUPABASE_ANON_KEY<br />
                    VITE_STRIPE_PUBLIC_KEY<br />
                    VITE_APP_NAME
                </div>
            </Section>
        </div>
    );
}
