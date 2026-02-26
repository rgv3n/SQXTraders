import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Save, Trash2, X, Search, Languages } from 'lucide-react';
import { useTranslation } from '@/i18n/TranslationProvider';
import { supabase } from '@/lib/supabase';

interface TranslationRow {
    key: string;
    es: string;
    en: string;
    id_es?: string;
    id_en?: string;
    object_id?: string;
}

export default function AdminTranslationsPage() {
    const { t, refreshTranslations } = useTranslation();
    const qc = useQueryClient();
    const [search, setSearch] = useState('');
    const [editRow, setEditRow] = useState<TranslationRow | null>(null);
    const [newKey, setNewKey] = useState('');
    const [newEs, setNewEs] = useState('');
    const [newEn, setNewEn] = useState('');
    const [adding, setAdding] = useState(false);

    const { data: rows = [], isLoading } = useQuery({
        queryKey: ['admin-translations'],
        queryFn: async () => {
            const { data: objects } = await supabase.from('text_objects').select('id, key');
            if (!objects) return [];
            const { data: translations } = await supabase
                .from('text_translations')
                .select('id, object_id, language_code, content');
            const map: Record<string, TranslationRow> = {};
            for (const obj of objects) {
                map[obj.id] = { key: obj.key, es: '', en: '', object_id: obj.id };
            }
            for (const tr of translations ?? []) {
                if (map[tr.object_id]) {
                    if (tr.language_code === 'es') { map[tr.object_id].es = tr.content; map[tr.object_id].id_es = tr.id; }
                    if (tr.language_code === 'en') { map[tr.object_id].en = tr.content; map[tr.object_id].id_en = tr.id; }
                }
            }
            return Object.values(map) as TranslationRow[];
        },
    });

    const saveMutation = useMutation({
        mutationFn: async (row: TranslationRow) => {
            const upserts = [
                { object_id: row.object_id, language_code: 'es', content: row.es },
                { object_id: row.object_id, language_code: 'en', content: row.en },
            ];
            await supabase.from('text_translations').upsert(upserts, { onConflict: 'object_id,language_code' });
        },
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-translations'] }); refreshTranslations(); setEditRow(null); },
    });

    const addMutation = useMutation({
        mutationFn: async () => {
            const { data: obj } = await supabase.from('text_objects').insert({ key: newKey }).select().single();
            if (!obj) throw new Error('Failed to create object');
            await supabase.from('text_translations').insert([
                { object_id: obj.id, language_code: 'es', content: newEs },
                { object_id: obj.id, language_code: 'en', content: newEn },
            ]);
        },
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-translations'] }); refreshTranslations(); setAdding(false); setNewKey(''); setNewEs(''); setNewEn(''); },
    });

    const deleteMutation = useMutation({
        mutationFn: async (objectId: string) => { await supabase.from('text_objects').delete().eq('id', objectId); },
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-translations'] }); refreshTranslations(); },
    });

    const filtered = rows.filter(r => r.key.toLowerCase().includes(search.toLowerCase()) || r.es.toLowerCase().includes(search.toLowerCase()) || r.en.toLowerCase().includes(search.toLowerCase()));

    return (
        <div>
            <div className="admin-page-header">
                <div>
                    <h1 className="admin-page-title">{t('admin.nav.translations', 'Translations')}</h1>
                    <p className="admin-page-subtitle">{rows.length} {t('admin.translations.keys', 'keys')} · ES / EN</p>
                </div>
                <button className="btn btn--primary" onClick={() => setAdding(true)}>
                    <Plus size={15} /> {t('admin.translations.add', 'Add Key')}
                </button>
            </div>

            <div style={{ position: 'relative', marginBottom: 'var(--space-6)', maxWidth: 400 }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input className="form-input" style={{ width: '100%', paddingLeft: 38 }} placeholder={t('common.search', 'Search key or text...')} value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {isLoading ? <p className="text-muted">{t('common.loading', 'Loading...')}</p> : (
                <div className="admin-table-wrapper">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th style={{ width: '25%' }}>{t('admin.translations.key', 'Key')}</th>
                                <th>🇪🇸 ES</th>
                                <th>🇬🇧 EN</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(row => (
                                <tr key={row.key}>
                                    <td style={{ fontFamily: 'monospace', fontSize: 'var(--text-xs)', color: 'var(--color-gold)' }}>{row.key}</td>
                                    <td style={{ fontSize: 'var(--text-sm)' }}>{row.es || <span style={{ color: 'var(--color-text-muted)' }}>—</span>}</td>
                                    <td style={{ fontSize: 'var(--text-sm)' }}>{row.en || <span style={{ color: 'var(--color-text-muted)' }}>—</span>}</td>
                                    <td style={{ display: 'flex', gap: 8 }}>
                                        <button className="btn btn--ghost btn--xs" onClick={() => setEditRow({ ...row })}><Languages size={13} /></button>
                                        {row.object_id && <button className="btn btn--ghost btn--xs" style={{ color: 'var(--color-error)' }} onClick={() => deleteMutation.mutate(row.object_id!)}><Trash2 size={13} /></button>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Edit Modal */}
            {editRow && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="card" style={{ width: '100%', maxWidth: 520, padding: 'var(--space-8)', position: 'relative' }}>
                        <button style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }} onClick={() => setEditRow(null)}><X size={20} /></button>
                        <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 4, color: 'var(--color-text)' }}>{t('admin.translations.edit', 'Edit Translation')}</h2>
                        <p style={{ fontSize: 'var(--text-xs)', fontFamily: 'monospace', color: 'var(--color-gold)', marginBottom: 'var(--space-6)' }}>{editRow.key}</p>
                        {(['es', 'en'] as const).map((lang) => {
                            const label = lang === 'es' ? '🇪🇸 Español' : '🇬🇧 English';
                            return (
                                <div key={lang} style={{ marginBottom: 'var(--space-4)' }}>
                                    <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 4 }}>{label}</label>
                                    <textarea className="form-input" rows={3} style={{ width: '100%', resize: 'vertical' }}
                                        value={(editRow[lang] as string) ?? ''}
                                        onChange={e => setEditRow(r => ({ ...r!, [lang]: e.target.value }))}
                                    />
                                </div>
                            );
                        })}
                        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
                            <button className="btn btn--ghost" onClick={() => setEditRow(null)}>{t('common.cancel', 'Cancel')}</button>
                            <button className="btn btn--primary" onClick={() => saveMutation.mutate(editRow)} disabled={saveMutation.isPending}><Save size={14} /> {t('common.save', 'Save')}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Modal */}
            {adding && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="card" style={{ width: '100%', maxWidth: 520, padding: 'var(--space-8)', position: 'relative' }}>
                        <button style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }} onClick={() => setAdding(false)}><X size={20} /></button>
                        <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 'var(--space-6)', color: 'var(--color-text)' }}>{t('admin.translations.add', 'New Translation Key')}</h2>
                        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 4 }}>Key (e.g. home.hero.title)</label>
                                <input className="form-input" style={{ width: '100%', fontFamily: 'monospace' }} value={newKey} onChange={e => setNewKey(e.target.value)} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 4 }}>🇪🇸 Español</label>
                                <textarea className="form-input" rows={2} style={{ width: '100%', resize: 'vertical' }} value={newEs} onChange={e => setNewEs(e.target.value)} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 4 }}>🇬🇧 English</label>
                                <textarea className="form-input" rows={2} style={{ width: '100%', resize: 'vertical' }} value={newEn} onChange={e => setNewEn(e.target.value)} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-6)', justifyContent: 'flex-end' }}>
                            <button className="btn btn--ghost" onClick={() => setAdding(false)}>{t('common.cancel', 'Cancel')}</button>
                            <button className="btn btn--primary" onClick={() => addMutation.mutate()} disabled={addMutation.isPending || !newKey}><Plus size={14} /> {t('admin.translations.add', 'Add')}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
