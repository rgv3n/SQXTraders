import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
    Calendar, MapPin, Users, Zap, Share2, ExternalLink,
    Clock, Globe, ChevronRight, Play, Lock
} from 'lucide-react';
import { useTranslation } from '@/i18n/TranslationProvider';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Event, Speaker, Sponsor, TicketType } from '@/types/database';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import CountdownTimer from '@/components/public/CountdownTimer';
import './EventDetailPage.css';

export default function EventDetailPage() {
    const { slug } = useParams<{ slug: string }>();
    const { t, language } = useTranslation();
    const { user } = useAuth();
    const navigate = useNavigate();
    const dateLocale = language === 'es' ? es : enUS;
    const [activeTab, setActiveTab] = useState<'agenda' | 'speakers' | 'sponsors'>('agenda');

    // Fetch event
    const { data: event, isLoading: loadingEvent } = useQuery<Event | null>({
        queryKey: ['event', slug],
        queryFn: async () => {
            const { data } = await supabase
                .from('events')
                .select('*')
                .eq('slug', slug!)
                .single();
            return (data ?? null) as Event | null;
        },
        enabled: !!slug,
    });

    // Fetch speakers for event
    const { data: speakers = [] } = useQuery<Speaker[]>({
        queryKey: ['speakers', event?.id],
        enabled: !!event?.id,
        queryFn: async () => {
            const { data } = await supabase
                .from('speakers')
                .select('*')
                .eq('event_id', event!.id)
                .order('order_index', { ascending: true });
            return (data ?? []) as Speaker[];
        },
    });

    // Fetch sponsors
    const { data: sponsors = [] } = useQuery<Sponsor[]>({
        queryKey: ['sponsors', event?.id],
        enabled: !!event?.id,
        queryFn: async () => {
            const { data } = await supabase
                .from('sponsors')
                .select('*')
                .eq('event_id', event!.id)
                .order('created_at', { ascending: true });
            return (data ?? []) as Sponsor[];
        },
    });

    // Fetch ticket types
    const { data: ticketTypes = [] } = useQuery<TicketType[]>({
        queryKey: ['ticket-types', event?.id],
        enabled: !!event?.id,
        queryFn: async () => {
            const { data } = await supabase
                .from('ticket_types')
                .select('*')
                .eq('event_id', event!.id)
                .eq('is_hidden', false)             // Only show public ticket types
                .order('price', { ascending: true });
            return (data ?? []) as TicketType[];
        },
    });

    if (loadingEvent) return <EventDetailSkeleton />;
    if (!event) {
        return (
            <div className="container" style={{ padding: 'var(--space-24)', textAlign: 'center' }}>
                <p className="text-muted">{t('event.not_found', 'Event not found.')}</p>
                <Link to="/events" className="btn btn--primary" style={{ marginTop: 'var(--space-4)' }}>
                    {t('events.back', 'Back to Events')}
                </Link>
            </div>
        );
    }

    const startDate = new Date(event.start_date);
    const endDate = new Date(event.end_date);
    const isUpcoming = startDate > new Date();
    const anySalesOpen = ticketTypes.some(tt => tt.sales_open !== false);

    return (
        <div className="event-detail">
            {/* Hero / Banner */}
            <div
                className="event-detail__hero"
                style={(event.og_image || event.theme?.hero_image) ? { backgroundImage: `url(${event.og_image || event.theme?.hero_image})` } : undefined}
            >
                <div className="event-detail__hero-overlay" />
                <div className="container event-detail__hero-content">
                    <div className="event-detail__breadcrumb">
                        <Link to="/events">{t('nav.events', 'Events')}</Link>
                        <ChevronRight size={13} />
                        <span>{event.title}</span>
                    </div>
                    <div className="event-detail__badges">
                        {event.is_hybrid && (
                            <span className="badge badge--blue">
                                <Zap size={10} /> {t('event.hybrid', 'Hybrid')}
                            </span>
                        )}
                        <span className="badge badge--gold">
                            {format(startDate, 'yyyy', { locale: dateLocale })}
                        </span>
                    </div>
                    <h1 className="event-detail__title font-display">{event.title}</h1>
                    <div className="event-detail__meta">
                        <span><Calendar size={15} />{format(startDate, 'MMM d', { locale: dateLocale })} – {format(endDate, 'MMM d, yyyy', { locale: dateLocale })}</span>
                        {event.city && <span><MapPin size={15} />{event.city}{event.country ? `, ${event.country}` : ''}</span>}
                        <span><Clock size={15} />{format(startDate, 'p', { locale: dateLocale })} {event.timezone ?? ''}</span>
                        {speakers.length > 0 && <span><Users size={15} />{speakers.length} {t('event.speakers', 'Speakers')}</span>}
                    </div>
                    <div className="event-detail__actions">
                        <button
                            className="btn btn--outline btn--sm"
                            onClick={() => navigator.share ? navigator.share({ title: event.title ?? '', url: window.location.href }) : undefined}
                        >
                            <Share2 size={14} /> {t('event.share', 'Share')}
                        </button>
                        {event.stream_url && !isUpcoming && (
                            <a href={event.stream_url} target="_blank" rel="noopener noreferrer" className="btn btn--secondary btn--sm">
                                <Play size={14} /> {t('event.watch', 'Watch Recording')}
                            </a>
                        )}
                    </div>
                </div>
            </div>

            {/* Countdown (if upcoming) */}
            {isUpcoming && (
                <div className="event-detail__countdown">
                    <div className="container" style={{ textAlign: 'center' }}>
                        <CountdownTimer targetDate={event.start_date} />
                    </div>
                </div>
            )}

            <div className="container event-detail__body">
                {/* Left Column: Content */}
                <div className="event-detail__main">
                    {/* Description */}
                    {event.description && (
                        <div className="event-detail__description">
                            <p>{event.description}</p>
                        </div>
                    )}

                    {/* Tabs */}
                    <div className="event-detail__tabs">
                        {(['agenda', 'speakers', 'sponsors'] as const).map((tab) => (
                            <button
                                key={tab}
                                className={`events-tab ${activeTab === tab ? 'events-tab--active' : ''}`}
                                onClick={() => setActiveTab(tab)}
                            >
                                {t(`event.tab.${tab}`, tab.charAt(0).toUpperCase() + tab.slice(1))}
                            </button>
                        ))}
                    </div>

                    {/* Tab: Agenda */}
                    {activeTab === 'agenda' && (
                        <div className="event-agenda">
                            {event.agenda && Array.isArray(event.agenda) && event.agenda.length > 0 ? (
                                event.agenda.map((item: any, i: number) => (
                                    <div key={i} className="agenda-item card">
                                        <div className="agenda-item__time">{item.time}</div>
                                        <div className="agenda-item__content">
                                            <h3 className="agenda-item__title">{item.title}</h3>
                                            {item.speaker && <p className="agenda-item__speaker">{item.speaker}</p>}
                                            {item.description && <p className="agenda-item__desc text-muted">{item.description}</p>}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-muted" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
                                    {t('event.agenda.coming_soon', 'Agenda coming soon.')}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Tab: Speakers */}
                    {activeTab === 'speakers' && (
                        <div className="speakers-grid">
                            {speakers.length > 0 ? speakers.map((speaker) => (
                                <div key={speaker.id} className="speaker-card card card--hover">
                                    <div className="speaker-card__avatar">
                                        {speaker.photo ? (
                                            <img src={speaker.photo} alt={speaker.name} />
                                        ) : (
                                            <span>{speaker.name[0]}</span>
                                        )}
                                    </div>
                                    <h3 className="speaker-card__name">{speaker.name}</h3>
                                    <p className="speaker-card__role text-muted">{speaker.role}</p>
                                    {speaker.company && <p className="speaker-card__company text-faint">{speaker.company}</p>}
                                    {speaker.slug && (
                                        <Link to={`/speakers/${speaker.slug}`} className="btn btn--ghost btn--xs" style={{ marginTop: 'var(--space-3)' }}>
                                            {t('event.speaker.view_profile', 'View Profile')} <ExternalLink size={11} />
                                        </Link>
                                    )}
                                </div>
                            )) : (
                                <p className="text-muted" style={{ textAlign: 'center', padding: 'var(--space-12)', gridColumn: '1/-1' }}>
                                    {t('event.speakers.coming_soon', 'Speakers coming soon.')}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Tab: Sponsors */}
                    {activeTab === 'sponsors' && (
                        <div>
                            {sponsors.length > 0 ? (
                                (['platinum', 'gold', 'silver', 'bronze'] as const).map((tier) => {
                                    const tierSponsors = sponsors.filter((s) => s.tier === tier);
                                    if (!tierSponsors.length) return null;
                                    return (
                                        <div key={tier} style={{ marginBottom: 'var(--space-8)' }}>
                                            <p className={`sponsors-tier__label tier--${tier}`}>
                                                {t(`sponsor.tier.${tier}`, tier.charAt(0).toUpperCase() + tier.slice(1))}
                                            </p>
                                            <div className="sponsors-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
                                                {tierSponsors.map((sponsor) => (
                                                    <div key={sponsor.id} className="sponsor-logo-card card card--hover">
                                                        {sponsor.logo ? (
                                                            <img src={sponsor.logo} alt={sponsor.name} className="sponsor-logo-card__img" />
                                                        ) : (
                                                            <span className="sponsor-logo-card__name">{sponsor.name}</span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="text-muted" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
                                    {t('event.sponsors.coming_soon', 'Sponsors coming soon.')}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Column: Ticket Sidebar */}
                <aside className="event-detail__sidebar">
                    <div className="ticket-box card">
                        <h2 className="ticket-box__title">
                            {isUpcoming ? t('event.tickets.title', 'Get Your Ticket') : t('event.tickets.past', 'Event Ended')}
                        </h2>
                        {isUpcoming ? (
                            <>
                                {ticketTypes.map((ticket) => (
                                    <div key={ticket.id} className="ticket-type" style={{ opacity: ticket.sales_open === false ? 0.65 : 1 }}>
                                        <div>
                                            <p className="ticket-type__name">{ticket.name}</p>
                                            {ticket.description && (
                                                <p className="ticket-type__desc text-faint">{ticket.description}</p>
                                            )}
                                        </div>
                                        <div className="ticket-type__price">
                                            {ticket.sales_open === false ? (
                                                <span className="badge badge--gold">{t('ticket.coming_soon', 'Coming soon')}</span>
                                            ) : ticket.price === 0 ? (
                                                <span className="badge badge--green">{t('ticket.free', 'Free')}</span>
                                            ) : (
                                                <span className="ticket-price">
                                                    {ticket.currency === 'USD' ? '$' : ticket.currency}{ticket.price}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {ticketTypes.length === 0 && (
                                    <p className="text-muted text-sm">{t('event.tickets.coming_soon', 'Registration coming soon.')}</p>
                                )}
                                <div style={{ marginTop: 'var(--space-5)' }}>
                                    {!anySalesOpen ? (
                                        <button className="btn btn--primary w-full" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                                            {t('event.cta.coming_soon', 'Sales coming soon')}
                                        </button>
                                    ) : user ? (
                                        <Link to={`/events/${slug}/register`} className="btn btn--primary w-full">
                                            {t('event.cta.register', 'Register Now')}
                                        </Link>
                                    ) : (
                                        <Link to="/auth/login" state={{ from: `/events/${slug}/register` }} className="btn btn--primary w-full">
                                            <Lock size={14} />
                                            {t('event.cta.sign_in', 'Sign in to Register')}
                                        </Link>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="text-muted text-sm">{t('event.tickets.past_info', 'This event has ended.')}</p>
                                {event.stream_url && (
                                    <a href={event.stream_url} target="_blank" rel="noopener noreferrer" className="btn btn--secondary w-full" style={{ marginTop: 'var(--space-4)' }}>
                                        <Play size={14} />
                                        {t('event.watch_recording', 'Watch Recording')}
                                    </a>
                                )}
                            </>
                        )}
                    </div>

                    {/* Quick Info Card */}
                    <div className="event-info-card card" style={{ marginTop: 'var(--space-4)' }}>
                        <h3 className="event-info-card__title">{t('event.info.title', 'Event Info')}</h3>
                        <ul className="event-info-list">
                            <li className="event-info-item">
                                <Calendar size={14} />
                                <div>
                                    <p className="text-sm">{format(startDate, 'MMMM d, yyyy', { locale: dateLocale })}</p>
                                    <p className="text-faint text-xs">{t('event.info.dates', 'Dates')}</p>
                                </div>
                            </li>
                            {event.city && (
                                <li className="event-info-item">
                                    <MapPin size={14} />
                                    <div>
                                        <p className="text-sm">{event.venue_name ?? ''}</p>
                                        <p className="text-faint text-xs">{event.city}{event.country ? `, ${event.country}` : ''}</p>
                                    </div>
                                </li>
                            )}
                            {event.is_hybrid && (
                                <li className="event-info-item">
                                    <Globe size={14} />
                                    <div>
                                        <p className="text-sm">{t('event.info.hybrid', 'In-Person + Online')}</p>
                                        <p className="text-faint text-xs">{t('event.info.hybrid_desc', 'Hybrid event')}</p>
                                    </div>
                                </li>
                            )}
                        </ul>
                    </div>
                </aside>
            </div>
        </div>
    );
}

function EventDetailSkeleton() {
    return (
        <div>
            <div style={{ height: 380, background: 'var(--color-surface)', animation: 'shimmer 1.5s infinite' }} />
            <div className="container" style={{ paddingTop: 'var(--space-8)' }}>
                <div style={{ height: 24, width: '40%', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)' }} />
                <div style={{ height: 48, width: '60%', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }} />
            </div>
        </div>
    );
}
