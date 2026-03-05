// Sponsors Directory — full implementation coming in Phase 6
import { useTranslation } from '@/i18n/TranslationProvider';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Sponsor } from '@/types/database';
import { ExternalLink } from 'lucide-react';
import SEO from '@/components/SEO';

export default function SponsorsPage() {
    const { t } = useTranslation();

    const { data: sponsors = [] } = useQuery<Sponsor[]>({
        queryKey: ['sponsors-directory'],
        queryFn: async () => {
            const { data } = await supabase
                .from('sponsors')
                .select('*')
                .order('name', { ascending: true });
            return (data ?? []) as Sponsor[];
        },
    });

    const tiers = ['platinum', 'gold', 'silver', 'bronze'] as const;

    return (
        <div>
            <SEO
                title="Sponsors & Partners"
                description="Meet the companies and brands sponsoring SQX EventOS trading events and conferences."
                url="/sponsors"
            />
            <div style={{ background: 'var(--color-bg-soft)', borderBottom: '1px solid var(--color-border)', padding: 'var(--space-16) 0 var(--space-12)' }}>
                <div className="container">
                    <div className="section-label">{t('sponsors.label', 'Partners')}</div>
                    <h1 className="section-title">{t('sponsors.title', 'Our Sponsors')}</h1>
                    <p className="section-subtitle">{t('sponsors.subtitle', 'Organizations powering the SQX Traders community worldwide.')}</p>
                </div>
            </div>
            <div className="container section">
                {tiers.map((tier) => {
                    const tierSponsors = sponsors.filter((s) => s.tier === tier);
                    if (!tierSponsors.length) return null;
                    return (
                        <div key={tier} style={{ marginBottom: 'var(--space-12)' }}>
                            <p className={`sponsors-tier__label tier--${tier}`}>
                                {t(`sponsor.tier.${tier}`, tier.charAt(0).toUpperCase() + tier.slice(1))}
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--space-5)' }}>
                                {tierSponsors.map((sponsor) => (
                                    <div key={sponsor.id} className="card card--hover" style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
                                        {sponsor.logo ? (
                                            <img src={sponsor.logo} alt={sponsor.name} style={{ maxHeight: 56, maxWidth: 160, objectFit: 'contain', marginBottom: 'var(--space-3)' }} />
                                        ) : (
                                            <p className="font-display" style={{ fontWeight: 700, marginBottom: 'var(--space-3)' }}>{sponsor.name}</p>
                                        )}
                                        {sponsor.website && (
                                            <a href={sponsor.website} target="_blank" rel="noopener noreferrer" className="btn btn--ghost btn--xs">
                                                <ExternalLink size={12} /> {t('sponsors.visit', 'Website')}
                                            </a>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
                {sponsors.length === 0 && (
                    <p className="text-muted" style={{ textAlign: 'center', padding: 'var(--space-16)' }}>
                        {t('sponsors.empty', 'Sponsors coming soon.')}
                    </p>
                )}
            </div>
        </div>
    );
}
