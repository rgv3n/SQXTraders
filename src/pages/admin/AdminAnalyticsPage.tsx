import { useQuery } from '@tanstack/react-query';
import { Users, Calendar, Ticket, TrendingUp, DollarSign } from 'lucide-react';
import { useTranslation } from '@/i18n/TranslationProvider';
import { supabase } from '@/lib/supabase';

interface TicketStat { name: string; count: number; revenue: number; }
interface DayStat { day: string; count: number; }

export default function AdminAnalyticsPage() {
    const { t } = useTranslation();

    const { data } = useQuery({
        queryKey: ['admin-analytics'],
        queryFn: async () => {
            const [regRes, ordRes, tickRes, dayRes] = await Promise.all([
                supabase.from('registrations').select('id', { count: 'exact' }),
                supabase.from('orders').select('total, created_at').eq('status', 'succeeded'),
                supabase.from('registrations').select('ticket_types(name, price)'),
                supabase.from('registrations').select('created_at').order('created_at'),
            ]);

            const totalReg = regRes.count ?? 0;
            const orders = ordRes.data ?? [];
            const totalRevenue = orders.reduce((s: number, o: any) => s + (o.total ?? 0), 0);

            // Ticket breakdown
            const tickMap: Record<string, TicketStat> = {};
            for (const r of (tickRes.data ?? []) as any[]) {
                const name = r.ticket_types?.name ?? 'Unknown';
                const price = r.ticket_types?.price ?? 0;
                if (!tickMap[name]) tickMap[name] = { name, count: 0, revenue: 0 };
                tickMap[name].count++;
                tickMap[name].revenue += price;
            }

            // Registrations by day (last 14 days)
            const dayMap: Record<string, number> = {};
            const now = new Date();
            for (let i = 13; i >= 0; i--) {
                const d = new Date(now); d.setDate(d.getDate() - i);
                dayMap[d.toISOString().slice(0, 10)] = 0;
            }
            for (const r of (dayRes.data ?? []) as any[]) {
                const day = r.created_at?.slice(0, 10);
                if (day && day in dayMap) dayMap[day]++;
            }
            const days: DayStat[] = Object.entries(dayMap).map(([day, count]) => ({ day, count }));
            const maxDay = Math.max(...days.map(d => d.count), 1);

            return { totalReg, totalRevenue, tickets: Object.values(tickMap), days, maxDay };
        },
    });

    const statCards = [
        { label: t('admin.stat.total_attendees', 'Total Registrations'), value: data?.totalReg ?? '—', icon: <Users size={20} />, color: 'var(--color-gold)' },
        { label: t('admin.stat.revenue', 'Revenue (USD)'), value: data?.totalRevenue != null ? `$${data.totalRevenue.toLocaleString()}` : '—', icon: <DollarSign size={20} />, color: '#10b981' },
        { label: t('admin.stat.ticket_types', 'Ticket Types'), value: data?.tickets.length ?? '—', icon: <Ticket size={20} />, color: '#6366f1' },
        { label: t('admin.stat.avg_revenue', 'Avg per Registrant'), value: data?.totalReg ? `$${Math.round(data.totalRevenue / data.totalReg).toLocaleString()}` : '—', icon: <TrendingUp size={20} />, color: '#f59e0b' },
    ];

    return (
        <div>
            <div className="admin-page-header">
                <div>
                    <h1 className="admin-page-title">{t('admin.nav.analytics', 'Analytics')}</h1>
                    <p className="admin-page-subtitle">{t('admin.analytics.subtitle', 'Registrations and revenue overview')}</p>
                </div>
            </div>

            {/* Stats */}
            <div className="admin-stats-grid" style={{ marginBottom: 'var(--space-8)' }}>
                {statCards.map(c => (
                    <div key={c.label} className="admin-stat-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                            <p className="admin-stat-label">{c.label}</p>
                            <span style={{ color: c.color }}>{c.icon}</span>
                        </div>
                        <p className="admin-stat-value font-display">{c.value}</p>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
                {/* Registrations chart (last 14 days) */}
                <div className="card" style={{ padding: 'var(--space-6)' }}>
                    <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-text)', marginBottom: 'var(--space-5)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Calendar size={16} /> {t('admin.analytics.reg_chart', 'Registrations (last 14 days)')}
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120 }}>
                        {(data?.days ?? []).map(d => (
                            <div key={d.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                <div style={{ width: '100%', borderRadius: '3px 3px 0 0', background: d.count > 0 ? 'var(--color-gold)' : 'var(--color-surface-muted)', height: `${(d.count / (data?.maxDay ?? 1)) * 100}%`, minHeight: d.count > 0 ? 4 : 0, transition: 'height 0.3s ease' }} />
                                {d.count > 0 && <span style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>{d.count}</span>}
                            </div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{data?.days[0]?.day?.slice(5)}</span>
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{data?.days[data.days.length - 1]?.day?.slice(5)}</span>
                    </div>
                </div>

                {/* Ticket breakdown */}
                <div className="card" style={{ padding: 'var(--space-6)' }}>
                    <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-text)', marginBottom: 'var(--space-5)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Ticket size={16} /> {t('admin.analytics.tickets', 'Breakdown by Ticket')}
                    </h2>
                    {(data?.tickets ?? []).length === 0 ? (
                        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>{t('admin.analytics.no_data', 'No data yet.')}</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                            {(data?.tickets ?? []).map(tk => {
                                const total = (data?.tickets ?? []).reduce((s, t) => s + t.count, 0) || 1;
                                const pct = Math.round((tk.count / total) * 100);
                                return (
                                    <div key={tk.name}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)', marginBottom: 4 }}>
                                            <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{tk.name}</span>
                                            <span style={{ color: 'var(--color-text-muted)' }}>{tk.count} ({pct}%) · ${tk.revenue.toLocaleString()}</span>
                                        </div>
                                        <div style={{ background: 'var(--color-surface-muted)', borderRadius: 999, height: 6, overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${pct}%`, background: 'var(--color-gold)', borderRadius: 999 }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
