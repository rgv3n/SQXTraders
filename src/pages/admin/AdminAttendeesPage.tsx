import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Download } from 'lucide-react';
import { useTranslation } from '@/i18n/TranslationProvider';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

interface Attendee {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    ticket_type: string;
    checked_in: boolean;
    checked_in_at: string | null;
    created_at: string;
    order_id: string;
}

export default function AdminAttendeesPage() {
    const { t } = useTranslation();
    const [search, setSearch] = useState('');

    const { data: attendees = [], isLoading } = useQuery({
        queryKey: ['admin-attendees'],
        queryFn: async () => {
            const { data } = await supabase
                .from('attendees')
                .select(`
                    id, first_name, last_name, email, checked_in, checked_in_at, created_at, order_id,
                    registrations!inner(ticket_types(name))
                `)
                .order('created_at', { ascending: false });
            return ((data ?? []) as any[]).map(a => ({
                ...a,
                ticket_type: a.registrations?.[0]?.ticket_types?.name ?? '—',
            })) as Attendee[];
        },
    });

    const filtered = attendees.filter(a =>
        `${a.first_name} ${a.last_name} ${a.email}`.toLowerCase().includes(search.toLowerCase())
    );

    const exportCSV = () => {
        const rows = [
            ['Name', 'Email', 'Ticket', 'Checked In', 'Registered'],
            ...filtered.map(a => [
                `${a.first_name} ${a.last_name}`,
                a.email,
                a.ticket_type,
                a.checked_in ? 'Yes' : 'No',
                format(new Date(a.created_at), 'yyyy-MM-dd HH:mm'),
            ]),
        ];
        const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'attendees.csv'; a.click();
        URL.revokeObjectURL(url);
    };

    const checkedInCount = attendees.filter(a => a.checked_in).length;

    return (
        <div>
            <div className="admin-page-header">
                <div>
                    <h1 className="admin-page-title">{t('admin.nav.attendees', 'Attendees')}</h1>
                    <p className="admin-page-subtitle">
                        {attendees.length} {t('admin.attendees.total', 'registered')} · {checkedInCount} {t('admin.attendees.checked_in', 'checked in')}
                    </p>
                </div>
                <button className="btn btn--ghost" onClick={exportCSV}>
                    <Download size={15} /> {t('admin.export.csv', 'Export CSV')}
                </button>
            </div>

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

            {isLoading ? (
                <p className="text-muted">{t('common.loading', 'Loading...')}</p>
            ) : (
                <div className="admin-table-wrapper">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>{t('admin.table.name', 'Name')}</th>
                                <th>Email</th>
                                <th>{t('admin.table.ticket', 'Ticket')}</th>
                                <th>{t('admin.table.registered', 'Registered')}</th>
                                <th>{t('admin.table.checkin', 'Check-in')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>{t('admin.attendees.empty', 'No attendees found.')}</td></tr>
                            ) : filtered.map(a => (
                                <tr key={a.id}>
                                    <td style={{ fontWeight: 600 }}>{a.first_name} {a.last_name}</td>
                                    <td style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>{a.email}</td>
                                    <td><span className="badge badge--default">{a.ticket_type}</span></td>
                                    <td style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>{format(new Date(a.created_at), 'MMM d, yyyy')}</td>
                                    <td>
                                        {a.checked_in
                                            ? <span className="badge badge--green">✓ {format(new Date(a.checked_in_at!), 'HH:mm')}</span>
                                            : <span className="badge badge--default">{t('admin.checkin.pending', 'Pending')}</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
