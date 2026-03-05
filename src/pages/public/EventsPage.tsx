import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Search, ChevronRight, Zap } from 'lucide-react';
import { useTranslation } from '@/i18n/TranslationProvider';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Event } from '@/types/database';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import SEO from '@/components/SEO';
import './EventsPage.css';

type Tab = 'upcoming' | 'past';

export default function EventsPage() {
    const { t, language } = useTranslation();
    const [tab, setTab] = useState<Tab>('upcoming');
    const [search, setSearch] = useState('');
    const dateLocale = language === 'es' ? es : enUS;

    const { data: events = [], isLoading } = useQuery<Event[]>({
        queryKey: ['events', tab],
        queryFn: async () => {
            const now = new Date().toISOString();
            let q = supabase.from('events').select('*').eq('status', 'published');
            if (tab === 'upcoming') {
                q = q.gte('start_date', now).order('start_date', { ascending: true });
            } else {
                q = q.lt('start_date', now).order('start_date', { ascending: false });
            }
            const { data } = await q;
            return (data ?? []) as Event[];
        },
    });

    const filtered = events.filter((e) =>
        (e.title ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (e.city ?? '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="events-page">
            <SEO
                title="Trading Events"
                description="Browse all upcoming and past trading events, conferences and summits organised by SQX EventOS."
                url="/events"
            />
            {/* Page Header */}
            <div className="events-page__header">
                <div className="hero-glow hero-glow--gold" style={{ top: '-100px', left: '30%' }} />
                <div className="container">
                    <div className="section-label">
                        <Calendar size={12} />
                        {t('events.label', 'All Events')}
                    </div>
                    <h1 className="section-title">{t('events.title', 'SQX Traders Events')}</h1>
                    <p className="section-subtitle">{t('events.subtitle', 'In-person, hybrid, and online events for the global trading community.')}</p>
                </div>
            </div>

            <div className="container">
                {/* Tabs + Search */}
                <div className="events-page__controls">
                    <div className="events-page__tabs">
                        <button
                            className={`events-tab ${tab === 'upcoming' ? 'events-tab--active' : ''}`}
                            onClick={() => setTab('upcoming')}
                        >
                            {t('events.tab.upcoming', 'Upcoming')}
                        </button>
                        <button
                            className={`events-tab ${tab === 'past' ? 'events-tab--active' : ''}`}
                            onClick={() => setTab('past')}
                        >
                            {t('events.tab.past', 'Past Events')}
                        </button>
                    </div>
                    <div className="events-search">
                        <Search size={15} />
                        <input
                            type="text"
                            placeholder={t('events.search.placeholder', 'Search events...')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="events-search__input"
                        />
                    </div>
                </div>

                {/* Events Grid */}
                {isLoading ? (
                    <div className="events-page__loading">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="event-skeleton" />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="events-page__empty">
                        <p>{t('events.empty', 'No events found.')}</p>
                    </div>
                ) : (
                    <div className="events-list-grid stagger">
                        {filtered.map((event) => (
                            <Link
                                key={event.id}
                                to={`/events/${event.slug || event.id}`}
                                className="event-list-card card card--hover card--glow animate-fade-in-up"
                            >
                                {event.theme?.hero_image && (
                                    <div className="event-list-card__image">
                                        <img src={event.theme.hero_image} alt={event.title ?? ''} />
                                    </div>
                                )}
                                <div className="event-list-card__body">
                                    <div className="event-list-card__badges">
                                        {event.is_hybrid && (
                                            <span className="badge badge--blue">
                                                <Zap size={10} /> {t('event.hybrid', 'Hybrid')}
                                            </span>
                                        )}
                                        <span className="badge badge--gold">
                                            {format(new Date(event.start_date), 'yyyy', { locale: dateLocale })}
                                        </span>
                                    </div>
                                    <h2 className="event-list-card__title">{event.title ?? 'Event'}</h2>
                                    <div className="event-list-card__meta">
                                        <span>
                                            <Calendar size={13} />
                                            {format(new Date(event.start_date), 'MMMM d', { locale: dateLocale })}
                                            {' – '}
                                            {format(new Date(event.end_date), 'MMMM d, yyyy', { locale: dateLocale })}
                                        </span>
                                        {event.city && (
                                            <span>
                                                <MapPin size={13} />
                                                {event.city}{event.country ? `, ${event.country}` : ''}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="event-list-card__footer">
                                    <span className="btn btn--primary btn--sm">
                                        {t('event.view_details', 'View Event')} <ChevronRight size={13} />
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
