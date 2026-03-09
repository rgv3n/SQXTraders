import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, MapPin, Users, Zap, Play, ChevronRight } from 'lucide-react';
import { useTranslation } from '@/i18n/TranslationProvider';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Event, Sponsor, Testimonial } from '@/types/database';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import CountdownTimer from '@/components/public/CountdownTimer';
import SEO from '@/components/SEO';
import './HomePage.css';

export default function HomePage() {
    const { t, language } = useTranslation();
    const heroRef = useRef<HTMLDivElement>(null);

    // Fetch upcoming events
    const { data: events = [] } = useQuery<Event[]>({
        queryKey: ['events', 'published'],
        queryFn: async () => {
            const { data } = await supabase
                .from('events')
                .select('*')
                .eq('status', 'published')
                .gte('start_date', new Date().toISOString())
                .order('start_date', { ascending: true })
                .limit(6);
            return (data ?? []) as Event[];
        },
    });

    // Fetch sponsors for featured event
    const featuredEvent = events[0];

    const { data: sponsors = [] } = useQuery<Sponsor[]>({
        queryKey: ['sponsors', 'featured', featuredEvent?.id],
        enabled: !!featuredEvent?.id,
        queryFn: async () => {
            const { data } = await supabase
                .from('sponsors')
                .select('*')
                .eq('event_id', featuredEvent!.id)
                .order('created_at', { ascending: true });
            return (data ?? []) as Sponsor[];
        },
    });

    const { data: testimonials = [] } = useQuery<Testimonial[]>({
        queryKey: ['testimonials', featuredEvent?.id],
        enabled: !!featuredEvent?.id,
        queryFn: async () => {
            const { data } = await supabase
                .from('testimonials')
                .select('*, quote_trans:text_translations!quote_text_id(content, language_code), role_trans:text_translations!role_text_id(content, language_code)')
                .eq('event_id', featuredEvent!.id)
                .limit(6);
            return (data ?? []) as Testimonial[];
        },
    });

    const dateLocale = language === 'es' ? es : enUS;

    const stats = [
        { value: '2,400+', label: t('home.stat.attendees', 'Attendees') },
        { value: '80+', label: t('home.stat.speakers', 'Expert Speakers') },
        { value: '40+', label: t('home.stat.sponsors', 'Sponsors') },
        { value: '6', label: t('home.stat.editions', 'Editions') },
    ];

    const sponsorTiers = ['platinum', 'gold', 'silver', 'bronze'];

    return (
        <div className="home">
            <SEO
                url="/"
                jsonLd={{
                    '@context': 'https://schema.org',
                    '@type': 'EventSeries',
                    name: 'SQX Traders Summit',
                    description: 'The premier conference series for algorithmic traders.',
                    organizer: { '@type': 'Organization', name: 'SQX Traders' },
                }}
            />
            {/* ======================================================
          HERO SECTION
          ====================================================== */}
            <section className="hero" ref={heroRef}>
                {/* Background Effects */}
                <div className="hero__bg">
                    <div className="hero-glow hero-glow--gold" style={{ top: '-100px', left: '5%' }} />
                    <div className="hero-glow hero-glow--blue" style={{ top: '200px', right: '5%' }} />
                    <div className="hero__grid" />
                </div>

                <div className="container hero__content">
                    {/* Event Badge */}
                    {featuredEvent && (
                        <div className="hero__event-badge animate-fade-in-up">
                            <span className="badge badge--gold">
                                <Zap size={11} />
                                {t('home.hero.next_event', 'Next Event')}
                            </span>
                            <span className="hero__event-badge-name">
                                {featuredEvent.title ?? 'SQX Traders Summit 2026'}
                            </span>
                        </div>
                    )}

                    {/* Main Headline */}
                    <h1 className="hero__title animate-fade-in-up" style={{ animationDelay: '80ms' }}>
                        <span className="text-gradient">
                            {t('home.hero.title_1', 'Trading Without')}
                        </span>
                        <br />
                        {t('home.hero.title_2', 'Limits. Your Next')}
                        <br />
                        <span className="text-gradient">
                            {t('home.hero.title_3', 'Summit Awaits.')}
                        </span>
                    </h1>

                    <p className="hero__subtitle animate-fade-in-up" style={{ animationDelay: '160ms' }}>
                        {t(
                            'home.hero.subtitle',
                            'The premier conference for algorithmic traders. World-class speakers, cutting-edge strategies, and a community that moves markets.'
                        )}
                    </p>

                    {/* CTA Buttons */}
                    <div className="hero__ctas animate-fade-in-up" style={{ animationDelay: '240ms' }}>
                        {featuredEvent ? (
                            <Link to={`/events/${featuredEvent.slug}`} className="btn btn--primary btn--xl">
                                {t('home.hero.cta_primary', 'Get Your Ticket')}
                                <ArrowRight size={18} />
                            </Link>
                        ) : (
                            <Link to="/events" className="btn btn--primary btn--xl">
                                {t('home.hero.cta_explore', 'Explore Events')}
                                <ArrowRight size={18} />
                            </Link>
                        )}
                        <Link to="/past-events" className="btn btn--secondary btn--xl">
                            <Play size={16} />
                            {t('home.hero.cta_secondary', 'Watch Past Talks')}
                        </Link>
                    </div>

                    {/* Event Quick Info */}
                    {featuredEvent && (
                        <div className="hero__event-meta animate-fade-in-up" style={{ animationDelay: '320ms' }}>
                            <div className="hero__meta-item">
                                <Calendar size={14} />
                                {format(new Date(featuredEvent.start_date), 'MMMM d, yyyy', { locale: dateLocale })}
                            </div>
                            <div className="hero__meta-divider" />
                            {featuredEvent.city && (
                                <div className="hero__meta-item">
                                    <MapPin size={14} />
                                    {featuredEvent.city}{featuredEvent.country ? `, ${featuredEvent.country}` : ''}
                                </div>
                            )}
                            {featuredEvent.is_hybrid && (
                                <>
                                    <div className="hero__meta-divider" />
                                    <div className="hero__meta-item">
                                        <Zap size={14} />
                                        {t('home.hero.hybrid', 'Also Online')}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Countdown */}
                    {featuredEvent && (
                        <div className="animate-fade-in-up" style={{ animationDelay: '400ms' }}>
                            <CountdownTimer targetDate={featuredEvent.start_date} />
                        </div>
                    )}
                </div>
            </section>

            {/* ======================================================
          SOCIAL PROOF STATS
          ====================================================== */}
            <section className="stats-bar">
                <div className="container">
                    <div className="stats-bar__grid stagger">
                        {stats.map((stat) => (
                            <div key={stat.label} className="stats-bar__item animate-fade-in-up">
                                <span className="stats-bar__value font-display">{stat.value}</span>
                                <span className="stats-bar__label">{stat.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ======================================================
          UPCOMING EVENTS
          ====================================================== */}
            {events.length > 0 && (
                <section className="section upcoming-events">
                    <div className="container">
                        <div className="section-label">
                            <Calendar size={12} />
                            {t('home.upcoming.label', 'Upcoming')}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 'var(--space-8)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                            <h2 className="section-title" style={{ marginBottom: 0 }}>
                                {t('home.upcoming.title', 'Next Events')}
                            </h2>
                            <Link to="/events" className="btn btn--ghost btn--sm">
                                {t('home.upcoming.see_all', 'See all')} <ChevronRight size={14} />
                            </Link>
                        </div>
                        <div className="events-grid stagger">
                            {events.map((event) => (
                                <EventCard key={event.id} event={event} language={language} />
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* ======================================================
          SPONSORS SHOWCASE
          ====================================================== */}
            {sponsors.length > 0 && (
                <section className="section sponsors-section">
                    <div className="container">
                        <div className="section-label">
                            {t('home.sponsors.label', 'Partners')}
                        </div>
                        <h2 className="section-title">
                            {t('home.sponsors.title', 'Our Sponsors')}
                        </h2>
                        {sponsorTiers.map((tier) => {
                            const tierSponsors = sponsors.filter((s) => s.tier === tier);
                            if (!tierSponsors.length) return null;
                            return (
                                <div key={tier} className="sponsors-tier">
                                    <p className={`sponsors-tier__label tier--${tier}`}>
                                        {t(`sponsor.tier.${tier}`, tier.charAt(0).toUpperCase() + tier.slice(1))}
                                    </p>
                                    <div className={`sponsors-grid sponsors-grid--${tier}`}>
                                        {tierSponsors.map((sponsor) => (
                                            <Link
                                                key={sponsor.id}
                                                to={`/sponsors/${sponsor.slug}`}
                                                className="sponsor-logo-card card card--hover"
                                            >
                                                {sponsor.logo ? (
                                                    <img src={sponsor.logo} alt={sponsor.name} className="sponsor-logo-card__img" />
                                                ) : (
                                                    <span className="sponsor-logo-card__name">{sponsor.name}</span>
                                                )}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* ======================================================
          TESTIMONIALS
          ====================================================== */}
            {testimonials.length > 0 && (
                <section className="section testimonials-section">
                    <div className="container">
                        <div className="section-label">{t('home.testimonials.label', 'Testimonials')}</div>
                        <h2 className="section-title">{t('home.testimonials.title', 'Voices from the Community')}</h2>
                        <div className="testimonials-grid stagger">
                            {testimonials.map((testimonial) => (
                                <div key={testimonial.id} className="testimonial-card card card--hover animate-fade-in-up">
                                    <p className="testimonial-card__quote">
                                        "{testimonial.quote ?? '[quote]'}"
                                    </p>
                                    <div className="testimonial-card__author">
                                        {testimonial.media_url && (
                                            <img
                                                src={testimonial.media_url}
                                                alt={testimonial.author}
                                                className="testimonial-card__avatar"
                                            />
                                        )}
                                        <div>
                                            <p className="testimonial-card__name">{testimonial.author}</p>
                                            {testimonial.role && (
                                                <p className="testimonial-card__role">{testimonial.role}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* ======================================================
          CTA SECTION
          ====================================================== */}
            <section className="section cta-section">
                <div className="container">
                    <div className="cta-box">
                        <div className="hero-glow hero-glow--gold" style={{ top: '-100px', left: '30%' }} />
                        <div className="cta-box__content">
                            <span className="section-label" style={{ marginBottom: 'var(--space-4)' }}>
                                {t('home.cta.label', 'Ready?')}
                            </span>
                            <h2 className="cta-box__title font-display">
                                {t('home.cta.title', 'Join the Next SQX Summit')}
                            </h2>
                            <p className="cta-box__subtitle">
                                {t('home.cta.subtitle', 'Limited seats available. Secure your spot among the top algorithmic traders in the world.')}
                            </p>
                            <div className="hero__ctas">
                                {featuredEvent ? (
                                    <Link to={`/events/${featuredEvent.slug}`} className="btn btn--primary btn--lg">
                                        {t('home.cta.button', 'Register Now')}
                                        <ArrowRight size={16} />
                                    </Link>
                                ) : (
                                    <Link to="/events" className="btn btn--primary btn--lg">
                                        {t('home.cta.button_explore', 'Explore Events')}
                                        <ArrowRight size={16} />
                                    </Link>
                                )}
                                <Link to="/speakers" className="btn btn--outline btn--lg">
                                    {t('home.cta.see_speakers', 'Meet the Speakers')}
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

// ============================================================
// Event Card Component
// ============================================================
function EventCard({ event, language }: { event: Event; language: string }) {
    const { t } = useTranslation();
    const dateLocale = language === 'es' ? es : enUS;

    return (
        <Link to={`/events/${event.slug}`} className="event-card card card--hover card--glow animate-fade-in-up">
            {event.theme?.hero_image && (
                <div className="event-card__image">
                    <img src={event.theme.hero_image} alt={event.title ?? ''} />
                </div>
            )}
            <div className="event-card__body">
                <div className="event-card__meta">
                    <span className="badge badge--gold">
                        {event.is_hybrid ? t('event.hybrid', 'Hybrid') : t('event.live', 'Live')}
                    </span>
                    {event.status === 'published' && (
                        <span className="badge badge--green">{t('event.status.open', 'Registration Open')}</span>
                    )}
                </div>
                <h3 className="event-card__title">{event.title ?? 'Event'}</h3>
                <div className="event-card__details">
                    <span className="event-card__detail">
                        <Calendar size={13} />
                        {format(new Date(event.start_date), 'MMM d, yyyy', { locale: dateLocale })}
                    </span>
                    {event.city && (
                        <span className="event-card__detail">
                            <MapPin size={13} />
                            {event.city}
                        </span>
                    )}
                </div>
            </div>
            <div className="event-card__footer">
                <span className="btn btn--ghost btn--sm">
                    {t('event.view_details', 'View Details')} <ChevronRight size={13} />
                </span>
            </div>
        </Link>
    );
}
