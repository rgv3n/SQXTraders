import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit, X, Save } from 'lucide-react';
import { useTranslation } from '@/i18n/TranslationProvider';
import { supabase } from '@/lib/supabase';
import { ImageUpload } from '@/components/admin/ImageUpload';

interface Sponsor {
    id: string;
    name: string;
    tier: string;
    website: string | null;
    logo: string | null;
    description: string | null;
    contact_email: string | null;
}

const TIERS = ['platinum', 'gold', 'silver', 'bronze', 'media', 'community'];
const TIER_COLORS: Record<string, string> = {
    platinum: '#e5e4e2', gold: '#ffd700', silver: '#c0c0c0',
    bronze: '#cd7f32', media: '#6366f1', community: '#10b981',
};

const empty: Omit<Sponsor, 'id'> = { name: '', tier: 'gold', website: null, logo: null, description: null, contact_email: null };

export default function AdminSponsorsPage() {
    const { t } = useTranslation();
    const qc = useQueryClient();
    const [modal, setModal] = useState<null | 'create' | Sponsor>(null);
    const [form, setForm] = useState(empty);

    const { data: sponsors = [], isLoading } = useQuery({
        queryKey: ['admin-sponsors'],
        queryFn: async () => {
            const { data } = await supabase.from('sponsors').select('*').order('tier').order('name');
            return (data ?? []) as Sponsor[];
        },
    });

    const saveMutation = useMutation({
        mutationFn: async () => {
            if (modal === 'create') {
                const slug = `${form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${Math.random().toString(36).slice(2, 7)}`;
                const { error } = await supabase.from('sponsors').insert({ ...form, slug });
                if (error) throw error;
            } else if (modal && typeof modal === 'object') {
                const { error } = await supabase.from('sponsors').update({ ...form }).eq('id', modal.id);
                if (error) throw error;
            }
        },
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-sponsors'] }); setModal(null); },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => { await supabase.from('sponsors').delete().eq('id', id); },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-sponsors'] }),
    });

    const openEdit = (s: Sponsor) => {
        setForm({ name: s.name, tier: s.tier, website: s.website, logo: s.logo, description: s.description, contact_email: s.contact_email });
        setModal(s);
    };
    const openCreate = () => { setForm(empty); setModal('create'); };

    return (
        <div>
            <div className="admin-page-header">
                <div>
                    <h1 className="admin-page-title">{t('admin.nav.sponsors', 'Sponsors')}</h1>
                    <p className="admin-page-subtitle">{t('admin.sponsors.subtitle', 'Manage sponsorship tiers and companies')}</p>
                </div>
                <button className="btn btn--primary" onClick={openCreate}>
                    <Plus size={15} /> {t('common.create', 'Create')}
                </button>
            </div>

            {isLoading ? (
                <p className="text-muted">{t('common.loading', 'Loading...')}</p>
            ) : (
                <div className="admin-table-wrapper">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Logo</th>
                                <th>{t('admin.table.name', 'Name')}</th>
                                <th>{t('admin.table.tier', 'Tier')}</th>
                                <th>{t('admin.table.website', 'Website')}</th>
                                <th>{t('admin.table.contact', 'Contact')}</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {sponsors.length === 0 ? (
                                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>{t('sponsors.empty', 'No sponsors yet.')}</td></tr>
                            ) : sponsors.map((s) => (
                                <tr key={s.id}>
                                    <td>
                                        {s.logo && (
                                            <div style={{
                                                width: 80,
                                                height: 40,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                background: 'var(--color-surface-muted)',
                                                borderRadius: 4,
                                                padding: 4
                                            }}>
                                                <img
                                                    src={s.logo}
                                                    alt={s.name}
                                                    style={{
                                                        maxWidth: '100%',
                                                        maxHeight: '100%',
                                                        objectFit: 'contain'
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                                    <td>
                                        <span style={{ padding: '2px 10px', borderRadius: 999, fontSize: 'var(--text-xs)', fontWeight: 700, background: TIER_COLORS[s.tier] + '33', color: TIER_COLORS[s.tier], border: `1px solid ${TIER_COLORS[s.tier]}55` }}>
                                            {s.tier.toUpperCase()}
                                        </span>
                                    </td>
                                    <td style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>{s.website ?? '—'}</td>
                                    <td style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>{s.contact_email ?? '—'}</td>
                                    <td style={{ display: 'flex', gap: 8 }}>
                                        <button className="btn btn--ghost btn--xs" onClick={() => openEdit(s)}><Edit size={13} /></button>
                                        <button className="btn btn--ghost btn--xs" style={{ color: 'var(--color-error)' }} onClick={() => deleteMutation.mutate(s.id)}><Trash2 size={13} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {modal !== null && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="card" style={{ width: '100%', maxWidth: 520, padding: 'var(--space-8)', position: 'relative' }}>
                        <button style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }} onClick={() => setModal(null)}><X size={20} /></button>
                        <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 'var(--space-6)', color: 'var(--color-text)' }}>
                            {modal === 'create' ? t('admin.sponsors.create', 'New Sponsor') : t('admin.sponsors.edit', 'Edit Sponsor')}
                        </h2>
                        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                                {([['name', 'Name'], ['website', 'Website'], ['contact_email', 'Contact Email']] as [keyof typeof form, string][]).map(([key, label]) => (
                                    <div key={key} style={key === 'name' ? { gridColumn: '1 / -1' } : undefined}>
                                        <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 4 }}>{label}</label>
                                        <input className="form-input" value={(form[key] as string) ?? ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={{ width: '100%' }} />
                                    </div>
                                ))}
                            </div>

                            <ImageUpload
                                label="Logo del Patrocinador"
                                bucket="sponsors"
                                value={form.logo}
                                onChange={(url) => setForm(f => ({ ...f, logo: url }))}
                            />
                            <div>
                                <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 4 }}>Description</label>
                                <textarea
                                    className="form-input"
                                    rows={3}
                                    value={form.description ?? ''}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    style={{ width: '100%', resize: 'vertical' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 4 }}>Tier</label>
                                <select className="form-input" value={form.tier} onChange={e => setForm(f => ({ ...f, tier: e.target.value }))} style={{ width: '100%' }}>
                                    {TIERS.map(tier => <option key={tier} value={tier}>{tier.charAt(0).toUpperCase() + tier.slice(1)}</option>)}
                                </select>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-6)', justifyContent: 'flex-end' }}>
                            <button className="btn btn--ghost" onClick={() => setModal(null)}>{t('common.cancel', 'Cancel')}</button>
                            <button className="btn btn--primary" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                                <Save size={14} /> {t('common.save', 'Save')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
