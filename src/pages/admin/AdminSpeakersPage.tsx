import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit, ExternalLink, X, Save } from 'lucide-react';
import { useTranslation } from '@/i18n/TranslationProvider';
import { supabase } from '@/lib/supabase';
import { ImageUpload } from '@/components/admin/ImageUpload';
import { toast } from 'react-hot-toast';

interface Speaker {
    id: string;
    name: string;
    title: string;
    company: string;
    bio: string;
    photo: string | null;
    twitter: string | null;
    linkedin: string | null;
}

const empty: Omit<Speaker, 'id'> = {
    name: '', title: '', company: '', bio: '', photo: null, twitter: null, linkedin: null,
};

export default function AdminSpeakersPage() {
    const { t } = useTranslation();
    const qc = useQueryClient();
    const [modal, setModal] = useState<null | 'create' | Speaker>(null);
    const [form, setForm] = useState(empty);

    const { data: speakers = [], isLoading } = useQuery({
        queryKey: ['admin-speakers'],
        queryFn: async () => {
            const { data } = await supabase.from('speakers').select('*').order('name');
            return (data ?? []) as Speaker[];
        },
    });

    const saveMutation = useMutation({
        mutationFn: async () => {
            if (modal === 'create') {
                await supabase.from('speakers').insert({ ...form });
            } else if (modal && typeof modal === 'object') {
                await supabase.from('speakers').update({ ...form }).eq('id', modal.id);
            }
        },
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-speakers'] }); setModal(null); },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await supabase.from('speakers').delete().eq('id', id);
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-speakers'] }),
    });

    const openEdit = (s: Speaker) => { setForm({ name: s.name, title: s.title, company: s.company, bio: s.bio, photo: s.photo, twitter: s.twitter, linkedin: s.linkedin }); setModal(s); };
    const openCreate = () => { setForm(empty); setModal('create'); };

    return (
        <div>
            <div className="admin-page-header">
                <div>
                    <h1 className="admin-page-title">{t('admin.nav.speakers', 'Speakers')}</h1>
                    <p className="admin-page-subtitle">{t('admin.speakers.subtitle', 'Manage event speakers')}</p>
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
                                <th>{t('admin.table.name', 'Name')}</th>
                                <th>{t('admin.table.title', 'Title')}</th>
                                <th>{t('admin.table.company', 'Company')}</th>
                                <th>{t('admin.table.social', 'Social')}</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {speakers.length === 0 ? (
                                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>{t('speakers.empty', 'No speakers yet.')}</td></tr>
                            ) : speakers.map((s) => (
                                <tr key={s.id}>
                                    <td style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        {s.photo && <img src={s.photo} alt={s.name} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />}
                                        {s.name}
                                    </td>
                                    <td style={{ color: 'var(--color-text-muted)' }}>{s.title}</td>
                                    <td>{s.company}</td>
                                    <td>
                                        {s.twitter && <a href={s.twitter} target="_blank" rel="noreferrer" style={{ color: 'var(--color-gold)', marginRight: 8 }}><ExternalLink size={13} /></a>}
                                        {s.linkedin && <a href={s.linkedin} target="_blank" rel="noreferrer" style={{ color: 'var(--color-gold)' }}><ExternalLink size={13} /></a>}
                                    </td>
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

            {/* Modal */}
            {modal !== null && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="card" style={{ width: '100%', maxWidth: 540, padding: 'var(--space-8)', position: 'relative' }}>
                        <button style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }} onClick={() => setModal(null)}><X size={20} /></button>
                        <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 'var(--space-6)', color: 'var(--color-text)' }}>
                            {modal === 'create' ? t('admin.speakers.create', 'New Speaker') : t('admin.speakers.edit', 'Edit Speaker')}
                        </h2>
                        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                                {([['name', 'Name'], ['title', 'Title'], ['company', 'Company']] as [keyof typeof form, string][]).map(([key, label]) => (
                                    <div key={key} style={key === 'name' ? { gridColumn: '1 / -1' } : undefined}>
                                        <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 4 }}>{label}</label>
                                        <input
                                            className="form-input"
                                            value={(form[key] as string) ?? ''}
                                            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                ))}
                            </div>

                            <ImageUpload
                                label="Foto del Ponente"
                                value={form.photo}
                                onChange={(url) => setForm(f => ({ ...f, photo: url }))}
                            />

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                                {([['twitter', 'Twitter URL'], ['linkedin', 'LinkedIn URL']] as [keyof typeof form, string][]).map(([key, label]) => (
                                    <div key={key}>
                                        <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 4 }}>{label}</label>
                                        <input
                                            className="form-input"
                                            value={(form[key] as string) ?? ''}
                                            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                ))}
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 4 }}>Bio</label>
                                <textarea
                                    className="form-input"
                                    rows={3}
                                    value={form.bio}
                                    onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                                    style={{ width: '100%', resize: 'vertical' }}
                                />
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
