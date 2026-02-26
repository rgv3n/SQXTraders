import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, CheckCircle, XCircle, ScanLine } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from '@/i18n/TranslationProvider';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

interface CheckInRow {
    id: string;
    name: string;
    email: string;
    qr_code_value: string;
    checkin_status: 'pending' | 'checked_in' | 'no_show';
    checkin_time: string | null;
    ticket_type: string;
}

export default function AdminCheckInPage() {
    const { t } = useTranslation();
    const qc = useQueryClient();
    const [search, setSearch] = useState('');
    const [lastAction, setLastAction] = useState<{ name: string; ok: boolean } | null>(null);

    const { data: rows = [] } = useQuery({
        queryKey: ['admin-checkin'],
        queryFn: async () => {
            const { data } = await supabase
                .from('attendees')
                .select('id, name, email, qr_code_value, checkin_status, checkin_time, ticket_types(name)')
                .order('name');
            return ((data ?? []) as any[]).map(a => ({
                ...a,
                ticket_type: a.ticket_types?.name ?? '—',
            })) as CheckInRow[];
        },
    });

    const checkInMutation = useMutation({
        mutationFn: async ({ id, checkin }: { id: string; checkin: boolean }) => {
            await supabase.from('attendees').update({
                checkin_status: checkin ? 'checked_in' : 'pending',
                checkin_time: checkin ? new Date().toISOString() : null,
            }).eq('id', id);
        },
        onSuccess: (_, { id, checkin }) => {
            qc.invalidateQueries({ queryKey: ['admin-checkin'] });
            const row = rows.find(r => r.id === id);
            if (row) setLastAction({ name: row.name, ok: checkin });
            setTimeout(() => setLastAction(null), 3000);
        },
    });

    const filtered = rows.filter(r =>
        `${r.name} ${r.email}`.toLowerCase().includes(search.toLowerCase())
    );

    const checkedIn = rows.filter(r => r.checkin_status === 'checked_in').length;
    const total = rows.length;
    const pct = total > 0 ? Math.round((checkedIn / total) * 100) : 0;

    return (
        <div>
            <div className="admin-page-header">
                <div>
                    <h1 className="admin-page-title">{t('admin.nav.check_in', 'Check-in')}</h1>
                    <p className="admin-page-subtitle">
                        {checkedIn} / {total} ({pct}%) {t('admin.checkin.present', 'present')}
                    </p>
                </div>
                <Link to="/admin/check-in/scan" className="btn btn--primary">
                    <ScanLine size={16} />
                    {t('admin.checkin.scan_qr', 'Scan QR')}
                </Link>
            </div>

            {/* Progress bar */}
            <div style={{ background: 'var(--color-surface-2)', borderRadius: 999, height: 8, marginBottom: 'var(--space-6)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: 'var(--color-gold)', borderRadius: 999, transition: 'width 0.4s ease' }} />
            </div>

            {/* Toast */}
            {lastAction && (
                <div style={{
                    position: 'fixed', bottom: 24, right: 24, zIndex: 999,
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: lastAction.ok ? 'var(--color-success)' : 'var(--color-error)',
                    color: '#fff', padding: '12px 20px', borderRadius: 12,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)', fontSize: 'var(--text-sm)', fontWeight: 600,
                }}>
                    {lastAction.ok ? <CheckCircle size={18} /> : <XCircle size={18} />}
                    {lastAction.name} — {lastAction.ok ? t('admin.checkin.marked_in', 'Checked IN') : t('admin.checkin.marked_out', 'Checked OUT')}
                </div>
            )}

            {/* Search */}
            <div style={{ position: 'relative', marginBottom: 'var(--space-6)', maxWidth: 400 }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input
                    className="form-input"
                    style={{ width: '100%', paddingLeft: 38 }}
                    placeholder={t('common.search', 'Search...')}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            <div className="admin-table-wrapper">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>{t('admin.table.name', 'Name')}</th>
                            <th>Email</th>
                            <th>{t('admin.table.ticket', 'Ticket')}</th>
                            <th>{t('admin.table.status', 'Status')}</th>
                            <th style={{ textAlign: 'center' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                    {t('admin.attendees.empty', 'No results.')}
                                </td>
                            </tr>
                        ) : filtered.map(r => (
                            <tr key={r.id} style={r.checkin_status === 'checked_in' ? { opacity: 0.6 } : undefined}>
                                <td style={{ fontWeight: 600 }}>{r.name}</td>
                                <td style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>{r.email}</td>
                                <td><span className="badge badge--default">{r.ticket_type}</span></td>
                                <td>
                                    {r.checkin_status === 'checked_in' ? (
                                        <span className="badge badge--green" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                            <CheckCircle size={12} />
                                            {r.checkin_time ? format(new Date(r.checkin_time), 'HH:mm') : 'In'}
                                        </span>
                                    ) : (
                                        <span className="badge badge--default">{t('admin.checkin.pending', 'Pending')}</span>
                                    )}
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                    <button
                                        className={`btn btn--sm ${r.checkin_status === 'checked_in' ? 'btn--ghost' : 'btn--primary'}`}
                                        onClick={() => checkInMutation.mutate({ id: r.id, checkin: r.checkin_status !== 'checked_in' })}
                                    >
                                        {r.checkin_status === 'checked_in'
                                            ? t('admin.checkin.undo', 'Undo')
                                            : t('admin.checkin.check_in', 'Check In')}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
