import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Twitter, Linkedin, Globe, Github, Youtube } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Speaker } from '@/types/database';
import SEO from '@/components/SEO';

export default function SpeakerProfilePage() {
    const { slug } = useParams<{ slug: string }>();

    const { data: speaker, isLoading } = useQuery<Speaker | null>({
        queryKey: ['speaker-profile', slug],
        enabled: !!slug,
        queryFn: async () => {
            const { data } = await supabase
                .from('speakers')
                .select('*')
                .eq('slug', slug!)
                .maybeSingle();
            return (data ?? null) as Speaker | null;
        },
    });

    const { data: events = [] } = useQuery({
        queryKey: ['speaker-events', speaker?.id],
        enabled: !!speaker?.id,
        queryFn: async () => {
            const { data } = await supabase
                .from('event_speakers')
                .select('*, event:events(id, title, slug, start_date, status)')
                .eq('speaker_id', speaker!.id)
                .order('order_index');
            return ((data ?? []) as any[])
                .map((r: any) => r.event)
                .filter((e: any) => e && e.status === 'published');
        },
    });

    if (isLoading) {
        return (
            <div className="container section">
                <div style={{ height: 400, background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', animation: 'shimmer 1.5s infinite' }} />
            </div>
        );
    }

    if (!speaker) {
        return (
            <div className="container section" style={{ textAlign: 'center', padding: 'var(--space-20) 0' }}>
                <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>Speaker not found.</p>
                <Link to="/speakers" className="btn btn--ghost btn--sm"><ArrowLeft size={14} /> Back to speakers</Link>
            </div>
        );
    }

    const socialLinks = (speaker.social_links ?? {}) as Record<string, string>;

    return (
        <div>
            <SEO
                title={`${speaker.name} — Speaker`}
                description={speaker.bio ?? `${speaker.name}, ${speaker.role ?? ''} ${speaker.company ? `at ${speaker.company}` : ''}`}
                image={speaker.photo}
                url={`/speakers/${speaker.slug}`}
            />

            {/* Hero */}
            <div style={{ background: 'linear-gradient(to bottom, var(--color-bg-soft), var(--color-bg))', borderBottom: '1px solid var(--color-border)', padding: 'var(--space-12) 0 var(--space-10)' }}>
                <div className="container">
                    <Link to="/speakers" className="btn btn--ghost btn--sm" style={{ marginBottom: 'var(--space-6)' }}>
                        <ArrowLeft size={14} /> All speakers
                    </Link>

                    <div style={{ display: 'flex', gap: 'var(--space-8)', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        {/* Avatar */}
                        <div style={{ width: 120, height: 120, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', background: 'linear-gradient(135deg, var(--color-gold), var(--color-blue))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, fontWeight: 700, color: '#0a0b0f' }}>
                            {speaker.photo
                                ? <img src={speaker.photo} alt={speaker.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                : speaker.name[0]
                            }
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: 'var(--color-text)', marginBottom: 'var(--space-1)' }}>{speaker.name}</h1>
                            {(speaker.role || speaker.company) && (
                                <p style={{ fontSize: 'var(--text-lg)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
                                    {[speaker.role, speaker.company].filter(Boolean).join(' · ')}
                                </p>
                            )}

                            {/* Social links */}
                            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                                {(speaker.twitter || socialLinks.twitter) && (
                                    <a href={`https://twitter.com/${speaker.twitter ?? socialLinks.twitter}`} target="_blank" rel="noopener noreferrer" className="btn btn--ghost btn--sm">
                                        <Twitter size={14} /> Twitter
                                    </a>
                                )}
                                {(speaker.linkedin || socialLinks.linkedin) && (
                                    <a href={speaker.linkedin ?? socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="btn btn--ghost btn--sm">
                                        <Linkedin size={14} /> LinkedIn
                                    </a>
                                )}
                                {socialLinks.website && (
                                    <a href={socialLinks.website} target="_blank" rel="noopener noreferrer" className="btn btn--ghost btn--sm">
                                        <Globe size={14} /> Website
                                    </a>
                                )}
                                {socialLinks.github && (
                                    <a href={`https://github.com/${socialLinks.github}`} target="_blank" rel="noopener noreferrer" className="btn btn--ghost btn--sm">
                                        <Github size={14} /> GitHub
                                    </a>
                                )}
                                {socialLinks.youtube && (
                                    <a href={socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="btn btn--ghost btn--sm">
                                        <Youtube size={14} /> YouTube
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="container section speaker-profile-body">
                {/* Bio */}
                <div>
                    <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-text)', marginBottom: 'var(--space-4)' }}>About</h2>
                    {speaker.bio ? (
                        <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-muted)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{speaker.bio}</p>
                    ) : (
                        <p style={{ color: 'var(--color-text-faint)' }}>No bio available yet.</p>
                    )}
                </div>

                {/* Events sidebar */}
                {events.length > 0 && (
                    <div className="card" style={{ padding: 'var(--space-5)' }}>
                        <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 'var(--space-4)' }}>Speaking at</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                            {events.map((ev: any) => (
                                <Link key={ev.id} to={`/events/${ev.slug}`} style={{ display: 'block', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', textDecoration: 'none', transition: 'border-color 0.15s' }}
                                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-gold)')}
                                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}>
                                    <p style={{ fontWeight: 600, color: 'var(--color-text)', fontSize: 'var(--text-sm)', marginBottom: 2 }}>{ev.title}</p>
                                    {ev.start_date && (
                                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                                            {new Date(ev.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </p>
                                    )}
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .speaker-profile-body { display: grid; grid-template-columns: 1fr 320px; gap: var(--space-10); align-items: start; }
                @media (max-width: 768px) {
                    .speaker-profile-body { grid-template-columns: 1fr; }
                    .speaker-hero-inner { flex-direction: column; }
                }
            `}</style>
        </div>
    );
}
