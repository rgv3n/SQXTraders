import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Calendar, MapPin, Globe, Wifi } from 'lucide-react';
import { useTranslation } from '@/i18n/TranslationProvider';
import { supabase } from '@/lib/supabase';

interface EventForm {
    title: string;
    slug: string;
    description: string;
    short_description: string;
    start_date: string;
    end_date: string;
    timezone: string;
    venue_name: string;
    venue_city: string;
    venue_country: string;
    venue_address: string;
    is_hybrid: boolean;
    stream_url: string;
    capacity: number | string;
    hero_image: string;
    status: 'draft' | 'published' | 'cancelled' | 'past';
}

const STATUSES = ['draft', 'published', 'cancelled', 'past'] as const;
const TIMEZONES = ['Europe/Madrid', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'America/Mexico_City', 'Asia/Tokyo'];

const emptyForm: EventForm = {
    title: '', slug: '', description: '', short_description: '',
    start_date: '', end_date: '', timezone: 'Europe/Madrid',
    venue_name: '', venue_city: '', venue_country: 'ES', venue_address: '',
    is_hybrid: false, stream_url: '', capacity: '', hero_image: '',
    status: 'draft',
};

function slugify(s: string) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const SectionCard = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
    <div className="card" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-5)' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-text)', marginBottom: 'var(--space-5)' }}>
            <span style={{ color: 'var(--color-gold)' }}>{icon}</span> {title}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>{children}</div>
    </div>
);

const Input = ({
    label,
    value,
    onChange,
    fullWidth,
    type = 'text',
    placeholder
}: {
    label: string;
    value: string;
    onChange: (val: string) => void;
    fullWidth?: boolean;
    type?: string;
    placeholder?: string;
}) => (
    <div style={fullWidth ? { gridColumn: '1 / -1' } : undefined}>
        <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 4 }}>{label}</label>
        <input
            className="form-input"
            type={type}
            style={{ width: '100%' }}
            placeholder={placeholder}
            value={value ?? ''}
            onChange={e => onChange(e.target.value)}
        />
    </div>
);

export default function AdminCreateEventPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const qc = useQueryClient();
    const [form, setForm] = useState<EventForm>(emptyForm);
    const [error, setError] = useState<string | null>(null);

    const set = (key: keyof EventForm, value: string | boolean | number) =>
        setForm(f => ({ ...f, [key]: value }));

    const handleTitleChange = (title: string) => {
        setForm(f => ({ ...f, title, slug: f.slug || slugify(title) }));
    };

    const createMutation = useMutation({
        mutationFn: async () => {
            setError(null);
            const payload = {
                title: form.title,
                slug: form.slug || slugify(form.title),
                description: form.description,
                start_date: form.start_date,
                end_date: form.end_date || form.start_date, // NOT NULL — fallback to start_date
                timezone: form.timezone,
                venue_name: form.venue_name,
                city: form.venue_city,
                country: form.venue_country,
                address: form.venue_address,
                is_hybrid: form.is_hybrid,
                stream_url: form.stream_url || null,
                max_capacity: form.capacity ? Number(form.capacity) : null,
                og_image: form.hero_image || null,
                status: form.status,
                feature_flags: { networking: true, speaker_pages: true },
            };
            const { data, error } = await supabase.from('events').insert(payload).select().single();
            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            qc.invalidateQueries({ queryKey: ['admin-events'] });
            navigate(`/admin/events/${data.id}`);
        },
        onError: (err: any) => setError(err.message ?? 'Error creating event'),
    });

    return (
        <div style={{ maxWidth: 800 }}>
            <div className="admin-page-header">
                <div>
                    <button className="btn btn--ghost btn--sm" style={{ marginBottom: 'var(--space-2)' }} onClick={() => navigate('/admin/events')}>
                        <ArrowLeft size={14} /> {t('common.back', 'Back')}
                    </button>
                    <h1 className="admin-page-title">{t('admin.events.create', 'New Event')}</h1>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
                    <select className="form-input" value={form.status} onChange={e => set('status', e.target.value as EventForm['status'])} style={{ width: 140 }}>
                        {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </select>
                    <button className="btn btn--primary" onClick={() => createMutation.mutate()} disabled={!form.title || !form.start_date || createMutation.isPending}>
                        <Save size={15} /> {t('common.save', 'Save')}
                    </button>
                </div>
            </div>

            {error && <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: 'var(--space-4)', borderRadius: 8, marginBottom: 'var(--space-5)', fontSize: 'var(--text-sm)' }}>{error}</div>}

            <SectionCard icon={<Calendar size={16} />} title={t('admin.event.section.basic', 'Basic Information')}>
                <Input label={t('admin.event.title', 'Title') + ' *'} value={form.title} onChange={handleTitleChange} placeholder="SQX Summit 2025" fullWidth />
                <Input label={t('admin.event.slug', 'URL Slug')} value={form.slug} onChange={v => set('slug', v)} placeholder="sqx-summit-2025" />
                <Input label={t('admin.event.hero_image', 'Hero Image URL')} value={form.hero_image} onChange={v => set('hero_image', v)} placeholder="https://..." />
                <Input label={t('admin.event.short_desc', 'Short Description')} value={form.short_description} onChange={v => set('short_description', v)} placeholder="One-line teaser..." fullWidth />
                <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 4 }}>{t('admin.event.description', 'Full Description')}</label>
                    <textarea className="form-input" rows={5} style={{ width: '100%', resize: 'vertical' }} value={form.description} onChange={e => set('description', e.target.value)} />
                </div>
            </SectionCard>

            <SectionCard icon={<Calendar size={16} />} title={t('admin.event.section.dates', 'Dates & Time')}>
                <Input label={t('admin.event.start_date', 'Start Date & Time') + ' *'} value={form.start_date} onChange={v => set('start_date', v)} type="datetime-local" />
                <Input label={t('admin.event.end_date', 'End Date & Time')} value={form.end_date} onChange={v => set('end_date', v)} type="datetime-local" />
                <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 4 }}>Timezone</label>
                    <select className="form-input" style={{ width: '100%' }} value={form.timezone} onChange={e => set('timezone', e.target.value)}>
                        {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                    </select>
                </div>
            </SectionCard>

            <SectionCard icon={<MapPin size={16} />} title={t('admin.event.section.venue', 'Venue')}>
                <Input label={t('admin.event.venue_name', 'Venue Name')} value={form.venue_name} onChange={v => set('venue_name', v)} placeholder="Teatro Principal" fullWidth />
                <Input label={t('admin.event.venue_address', 'Address')} value={form.venue_address} onChange={v => set('venue_address', v)} fullWidth />
                <Input label={t('admin.event.venue_city', 'City')} value={form.venue_city} onChange={v => set('venue_city', v)} placeholder="Madrid" />
                <Input label={t('admin.event.venue_country', 'Country Code')} value={form.venue_country} onChange={v => set('venue_country', v)} placeholder="ES" />
                <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 4 }}>Capacity</label>
                    <input className="form-input" type="number" style={{ width: '100%' }} value={form.capacity} onChange={e => set('capacity', e.target.value)} placeholder="500" />
                </div>
            </SectionCard>

            <SectionCard icon={<Wifi size={16} />} title={t('admin.event.section.online', 'Online / Hybrid')}>
                <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <input type="checkbox" id="is_hybrid" checked={form.is_hybrid} onChange={e => set('is_hybrid', e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--color-gold)' }} />
                    <label htmlFor="is_hybrid" style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)', cursor: 'pointer' }}>
                        <Globe size={14} style={{ display: 'inline', marginRight: 6 }} />
                        {t('admin.event.is_hybrid', 'This event has an online component (hybrid)')}
                    </label>
                </div>
                {form.is_hybrid && <Input label={t('admin.event.stream_url', 'Stream URL')} value={form.stream_url} onChange={v => set('stream_url', v)} placeholder="https://youtube.com/live/..." fullWidth />}
            </SectionCard>
        </div>
    );
}
