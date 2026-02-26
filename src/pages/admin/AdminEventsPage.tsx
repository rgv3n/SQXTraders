// Admin Events list — stub for Phase 7
import { useTranslation } from '@/i18n/TranslationProvider';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

export default function AdminEventsPage() {
    const { t } = useTranslation();

    const { data: events = [] } = useQuery({
        queryKey: ['admin-events'],
        queryFn: async () => {
            const { data } = await supabase.from('events').select('*').order('start_date', { ascending: false });
            return data ?? [];
        },
    });

    return (
        <div>
            <div className="admin-page-header">
                <div>
                    <h1 className="admin-page-title">{t('admin.events.title', 'Events')}</h1>
                    <p className="admin-page-subtitle">{t('admin.events.subtitle', 'Manage all your events')}</p>
                </div>
                <Link to="/admin/events/create" className="btn btn--primary">
                    <Plus size={15} /> {t('admin.events.create', 'New Event')}
                </Link>
            </div>
            <div className="admin-table-wrapper">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>{t('admin.table.title', 'Title')}</th>
                            <th>{t('admin.table.date', 'Date')}</th>
                            <th>{t('admin.table.status', 'Status')}</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {events.length === 0 ? (
                            <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>{t('admin.events.empty', 'No events yet.')}</td></tr>
                        ) : (
                            events.map((event: any) => (
                                <tr key={event.id}>
                                    <td style={{ fontWeight: 600 }}>{event.title}</td>
                                    <td style={{ color: 'var(--color-text-muted)' }}>{format(new Date(event.start_date), 'MMM d, yyyy')}</td>
                                    <td><span className={`badge ${event.status === 'published' ? 'badge--green' : 'badge--default'}`}>{event.status}</span></td>
                                    <td>
                                        <Link to={`/admin/events/${event.id}`} className="btn btn--ghost btn--xs">{t('admin.table.edit', 'Edit')}</Link>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
