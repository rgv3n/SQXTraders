import { Link } from 'react-router-dom';
import { useTranslation } from '@/i18n/TranslationProvider';
import './PublicFooter.css';

export default function PublicFooter() {
    const { t } = useTranslation();

    const currentYear = new Date().getFullYear();

    return (
        <footer className="footer">
            <div className="container">
                {/* Top gradient divider */}
                <div className="footer__divider" />

                <div className="footer__grid">
                    {/* Brand */}
                    <div className="footer__brand">
                        <Link to="/" className="footer__logo">
                            <span className="text-gold">⬡ SQX</span> EventOS
                        </Link>
                        <p className="footer__tagline">
                            {t('footer.tagline', 'The premier event platform for the global trading community.')}
                        </p>
                        <div className="footer__social">
                            <a
                                href="#"
                                className="footer__social-link"
                                aria-label="Discord"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Discord
                            </a>
                            <a
                                href="#"
                                className="footer__social-link"
                                aria-label="Telegram"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Telegram
                            </a>
                            <a
                                href="#"
                                className="footer__social-link"
                                aria-label="Twitter / X"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Twitter
                            </a>
                        </div>
                    </div>

                    {/* Events */}
                    <div className="footer__col">
                        <p className="footer__col-title">{t('footer.events', 'Events')}</p>
                        <nav className="footer__nav">
                            <Link to="/events" className="footer__nav-link">{t('nav.upcoming_events', 'Upcoming Events')}</Link>
                            <Link to="/past-events" className="footer__nav-link">{t('nav.past_events', 'Past Events')}</Link>
                            <Link to="/speakers" className="footer__nav-link">{t('nav.speakers', 'Speakers')}</Link>
                            <Link to="/sponsors" className="footer__nav-link">{t('nav.sponsors', 'Sponsors')}</Link>
                        </nav>
                    </div>

                    {/* Community */}
                    <div className="footer__col">
                        <p className="footer__col-title">{t('footer.community', 'Community')}</p>
                        <nav className="footer__nav">
                            <a href="#" className="footer__nav-link">{t('footer.discord', 'Join Discord')}</a>
                            <a href="#" className="footer__nav-link">{t('footer.telegram', 'Telegram Group')}</a>
                            <Link to="/networking" className="footer__nav-link">{t('nav.networking', 'Networking')}</Link>
                        </nav>
                    </div>

                    {/* Platform */}
                    <div className="footer__col">
                        <p className="footer__col-title">{t('footer.platform', 'Platform')}</p>
                        <nav className="footer__nav">
                            <Link to="/auth/login" className="footer__nav-link">{t('nav.sign_in', 'Sign In')}</Link>
                            <Link to="/auth/register" className="footer__nav-link">{t('nav.register', 'Register')}</Link>
                            <Link to="/portal/speaker" className="footer__nav-link">{t('nav.speaker_portal', 'Speaker Portal')}</Link>
                            <Link to="/portal/sponsor" className="footer__nav-link">{t('nav.sponsor_portal', 'Sponsor Portal')}</Link>
                        </nav>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="footer__bottom">
                    <a
                        href="https://companiesautomation.com"
                        className="footer__powered"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        {t('footer.powered_by', 'Powered by')}:{' '}
                        <span className="footer__powered-name">CompaniesAutomation.com</span>
                    </a>
                    <div className="footer__legal">
                        <Link to="/privacy" className="footer__legal-link">
                            {t('footer.privacy', 'Privacidad')}
                        </Link>
                        <Link to="/legal" className="footer__legal-link">
                            {t('footer.legal', 'Legal')}
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
