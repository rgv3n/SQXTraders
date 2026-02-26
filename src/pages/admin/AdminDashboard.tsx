import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
    Calendar, Users, Ticket, BarChart2, ArrowRight,
    TrendingUp, DollarSign, Star, Plus
} from 'lucide-react';
import { useTranslation } from '@/i18n/TranslationProvider';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import '@/components/layouts/AdminLayout.css';

interface DashboardStats {
    total_events: number;
    upcoming_events: number;
    total_attendees: number;
    total_revenue: number;
    total_speakers: number;
}

export default function AdminDashboard() {
    const { t } = useTranslation();

    const { data: stats } = useQuery<DashboardStats>({
        queryKey: ['admin-stats'],
        queryFn: async () => {
            const [eventsRes, attendeesRes, revenueRes, speakersRes] = await Promise.all([
                supabase.from('events').select('id, start_date', { count: 'exact' }),
                supabase.from('registrations').select('id', { count: 'exact' }),
                supabase.from('orders').select('total').eq('status', 'succeeded'),
                supabase.from('speakers').select('id', { count: 'exact' }),
            ]);

            const now = new Date().toISOString();
            const upcoming = (eventsRes.data ?? []).filter((e) => e.start_date >= now).length;
            const revenue = (revenueRes.data ?? []).reduce((sum: number, o: any) => sum + (o.total ?? 0), 0);

            return {
                total_events: eventsRes.count ?? 0,
                upcoming_events: upcoming,
                total_attendees: attendeesRes.count ?? 0,
                total_revenue: revenue,
                total_speakers: speakersRes.count ?? 0,
            };
        },
    });

    const { data: recentEvents = [] } = useQuery({
        queryKey: ['admin-recent-events'],
        queryFn: async () => {
            const { data } = await supabase
                .from('events')
                .select('id, title, start_date, status, slug')
                .order('created_at', { ascending: false })
                .limit(5);
            return data ?? [];
        },
    });

    const statCards = [
        {
            label: t('admin.stat.upcoming_events', 'Upcoming Events'),
            value: stats?.upcoming_events ?? '—',
            icon: <Calendar size={18} />,
            color: 'gold',
            delta: null,
        },
        {
            label: t('admin.stat.total_attendees', 'Total Attendees'),
            value: stats?.total_attendees ?? '—',
            icon: <Users size={18} />,
            color: 'blue',
            delta: null,
        },
        {
            label: t('admin.stat.revenue', 'Revenue (USD)'),
            value: stats?.total_revenue != null ? `$${stats.total_revenue.toLocaleString()}` : '—',
            icon: <DollarSign size={18} />,
            color: 'green',
            delta: null,
        },
        {
            label: t('admin.stat.speakers', 'Speakers'),
            value: stats?.total_speakers ?? '—',
            icon: <Star size={18} />,
            color: 'purple',
            delta: null,
        },
    ];

    const statusBadge = (status: string) => {
        const map: Record<string, string> = {
            draft: 'badge--default',
            published: 'badge--green',
            archived: 'badge--default',
        };
        return <span className={`badge ${map[status] ?? 'badge--default'}`}>{status}</span>;
    };

    return (
        <div>
            {/* Header */}
            <div className="admin-page-header">
                <div>
                    <h1 className="admin-page-title">{t('admin.dashboard.title', 'Dashboard')}</h1>
                    <p className="admin-page-subtitle">
                        {t('admin.dashboard.subtitle', 'Overview of your event platform')}
                    </p>
                </div>
                <Link to="/admin/events/create" className="btn btn--primary">
                    <Plus size={16} />
                    {t('admin.dashboard.create_event', 'New Event')}
                </Link>
            </div>

            {/* Stats */}
            <div className="admin-stats-grid">
                {statCards.map((card) => (
                    <div key={card.label} className="admin-stat-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                            <p className="admin-stat-label">{card.label}</p>
                            <span style={{ color: 'var(--color-text-muted)' }}>{card.icon}</span>
                        </div>
                        <p className="admin-stat-value font-display">{card.value}</p>
                    </div>
                ))}
            </div>

            {/* Recent Events Table */}
            <div style={{ marginBottom: 'var(--space-8)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
                    <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text)' }}>
                        {t('admin.dashboard.recent_events', 'Recent Events')}
                    </h2>
                    <Link to="/admin/events" className="btn btn--ghost btn--sm">
                        {t('admin.dashboard.see_all', 'See all')} <ArrowRight size={13} />
                    </Link>
                </div>

                <div className="admin-table-wrapper">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>{t('admin.table.event', 'Event')}</th>
                                <th>{t('admin.table.date', 'Date')}</th>
                                <th>{t('admin.table.status', 'Status')}</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentEvents.length === 0 ? (
                                <tr>
                                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                        {t('admin.table.no_events', 'No events yet.')}
                                    </td>
                                </tr>
                            ) : (
                                recentEvents.map((event: any) => (
                                    <tr key={event.id}>
                                        <td style={{ fontWeight: 600 }}>{event.title}</td>
                                        <td style={{ color: 'var(--color-text-muted)' }}>
                                            {format(new Date(event.start_date), 'MMM d, yyyy')}
                                        </td>
                                        <td>{statusBadge(event.status)}</td>
                                        <td>
                                            <Link
                                                to={`/admin/events/${event.id}`}
                                                className="btn btn--ghost btn--xs"
                                            >
                                                {t('admin.table.edit', 'Edit')} <ArrowRight size={12} />
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Quick Actions */}
            <div>
                <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text)', marginBottom: 'var(--space-4)' }}>
                    {t('admin.dashboard.quick_actions', 'Quick Actions')}
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)' }}>
                    {[
                        { icon: <Calendar size={20} />, label: t('admin.quick.create_event', 'Create Event'), to: '/admin/events/create' },
                        { icon: <Users size={20} />, label: t('admin.quick.manage_speakers', 'Manage Speakers'), to: '/admin/speakers' },
                        { icon: <Ticket size={20} />, label: t('admin.quick.ticket_types', 'Ticket Types'), to: '/admin/events' },
                        { icon: <BarChart2 size={20} />, label: t('admin.quick.analytics', 'Analytics'), to: '/admin/analytics' },
                    ].map((action) => (
                        <Link key={action.to} to={action.to} className="admin-stat-card card card--hover" style={{ textAlign: 'center', gap: 'var(--space-3)' }}>
                            <div style={{ color: 'var(--color-gold)', marginBottom: 'var(--space-2)' }}>{action.icon}</div>
                            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)' }}>{action.label}</p>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
