import { useTranslation } from '@/i18n/TranslationProvider';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Event } from '@/types/database';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Play } from 'lucide-react';
import { format } from 'date-fns';

export default function PastEventsPage() {
    const { t } = useTranslation();

    const { data: events = [] } = useQuery<Event[]>({
        queryKey: ['events', 'past'],
        queryFn: async () => {
            const { data } = await supabase
                .from('events')
                .select('*')
                .eq('status', 'published')
                .lt('start_date', new Date().toISOString())
                .order('start_date', { ascending: false });
            return (data ?? []) as Event[];
        },
    });

    return (
        <div>
            <div style={{ background: 'var(--color-bg-soft)', borderBottom: '1px solid var(--color-border)', padding: 'var(--space-16) 0 var(--space-12)' }}>
                <div className="container">
                    <div className="section-label">{t('past_events.label', 'Archive')}</div>
                    <h1 className="section-title">{t('past_events.title', 'Past Events')}</h1>
                    <p className="section-subtitle">{t('past_events.subtitle', 'Relive our best moments. Watch recordings and discover what we built together.')}</p>
                </div>
            </div>
            <div className="container section">
                {events.length === 0 ? (
                    <p className="text-muted" style={{ textAlign: 'center', padding: 'var(--space-16)' }}>
                        {t('past_events.empty', 'No past events yet.')}
                    </p>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-6)', paddingBottom: 'var(--space-16)' }}>
                        {events.map((event) => (
                            <Link key={event.id} to={`/events/${event.slug}`} className="card card--hover" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
                                <div style={{ height: 180, background: 'var(--color-surface-2)', overflow: 'hidden' }}>
                                    {event.theme?.hero_image && (
                                        <img src={event.theme.hero_image} alt={event.title ?? ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    )}
                                </div>
                                <div style={{ padding: 'var(--space-5)', flex: 1 }}>
                                    <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text)', marginBottom: 'var(--space-2)' }}>{event.title}</h2>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                            <Calendar size={12} /> {format(new Date(event.start_date), 'MMMM d, yyyy')}
                                        </span>
                                        {event.city && <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><MapPin size={12} />{event.city}</span>}
                                    </div>
                                </div>
                                {event.stream_url && (
                                    <div style={{ padding: 'var(--space-3) var(--space-5)', borderTop: '1px solid var(--color-border)' }}>
                                        <span className="btn btn--secondary btn--xs w-full" style={{ justifyContent: 'center' }}>
                                            <Play size={12} /> {t('past_events.watch', 'Watch Recording')}
                                        </span>
                                    </div>
                                )}
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
