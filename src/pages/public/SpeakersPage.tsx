import { Link } from 'react-router-dom';
import { useTranslation } from '@/i18n/TranslationProvider';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Speaker } from '@/types/database';
import { ExternalLink, Twitter, Linkedin } from 'lucide-react';
import './SpeakersPage.css';

export default function SpeakersPage() {
    const { t } = useTranslation();

    const { data: speakers = [], isLoading } = useQuery<Speaker[]>({
        queryKey: ['speakers-directory'],
        queryFn: async () => {
            const { data } = await supabase
                .from('speakers')
                .select('*')
                .order('name', { ascending: true });
            return (data ?? []) as Speaker[];
        },
    });

    return (
        <div>
            <div className="speakers-page-header">
                <div className="hero-glow hero-glow--blue" style={{ top: '-80px', left: '50%' }} />
                <div className="container">
                    <div className="section-label">{t('speakers.label', 'Lineup')}</div>
                    <h1 className="section-title">{t('speakers.title', 'Our Speakers')}</h1>
                    <p className="section-subtitle">{t('speakers.subtitle', 'World-class experts from the algorithmic trading and fintech world.')}</p>
                </div>
            </div>

            <div className="container section">
                {isLoading ? (
                    <div className="speakers-grid-full">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="card" style={{ height: 240, animation: 'shimmer 1.5s infinite', background: 'var(--color-surface)' }} />
                        ))}
                    </div>
                ) : speakers.length === 0 ? (
                    <p className="text-muted" style={{ textAlign: 'center', padding: 'var(--space-16)' }}>
                        {t('speakers.empty', 'Speakers coming soon.')}
                    </p>
                ) : (
                    <div className="speakers-grid-full stagger">
                        {speakers.map((speaker) => (
                            <div key={speaker.id} className="speaker-dir-card card card--hover animate-fade-in-up">
                                <div className="speaker-dir-card__avatar">
                                    {speaker.photo ? (
                                        <img src={speaker.photo} alt={speaker.name} />
                                    ) : (
                                        <span className="font-display">{speaker.name[0]}</span>
                                    )}
                                </div>
                                <div className="speaker-dir-card__body">
                                    <h2 className="speaker-dir-card__name">{speaker.name}</h2>
                                    <p className="speaker-dir-card__role text-muted">{speaker.role}</p>
                                    {speaker.company && <p className="text-faint text-sm">{speaker.company}</p>}
                                    {speaker.bio && (
                                        <p className="speaker-dir-card__bio text-sm text-muted">{speaker.bio}</p>
                                    )}
                                    <div className="speaker-dir-card__footer">
                                        {speaker.twitter && (
                                            <a href={`https://twitter.com/${speaker.twitter}`} target="_blank" rel="noopener noreferrer" className="btn btn--ghost btn--xs">
                                                <Twitter size={13} />
                                            </a>
                                        )}
                                        {speaker.linkedin && (
                                            <a href={speaker.linkedin} target="_blank" rel="noopener noreferrer" className="btn btn--ghost btn--xs">
                                                <Linkedin size={13} />
                                            </a>
                                        )}
                                        {speaker.slug && (
                                            <Link to={`/speakers/${speaker.slug}`} className="btn btn--ghost btn--xs">
                                                {t('speakers.view_profile', 'Profile')} <ExternalLink size={12} />
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
