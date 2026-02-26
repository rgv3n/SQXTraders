import { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { Menu, X, Globe, LogIn, User, LayoutDashboard, ChevronDown, Ticket } from 'lucide-react';
import { useTranslation } from '@/i18n/TranslationProvider';
import { SUPPORTED_LANGUAGES } from '@/i18n/localTranslations';
import { useAuth } from '@/contexts/AuthContext';
import clsx from 'clsx';
import './PublicNavbar.css';

export default function PublicNavbar() {
    const { t, language, setLanguage, availableLanguages } = useTranslation();
    const { isAuthenticated, profile, role, signOut } = useAuth();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [langOpen, setLangOpen] = useState(false);
    const [userOpen, setUserOpen] = useState(false);
    const navigate = useNavigate();

    const navItems = [
        { label: t('nav.events', 'Events'), to: '/events' },
        { label: t('nav.speakers', 'Speakers'), to: '/speakers' },
        { label: t('nav.sponsors', 'Sponsors'), to: '/sponsors' },
        { label: t('nav.past_events', 'Past Events'), to: '/past-events' },
    ];

    const handleSignOut = async () => {
        await signOut();
        navigate('/');
        setUserOpen(false);
    };

    // label lookup from the single-source-of-truth list
    const langInfo = Object.fromEntries(
        SUPPORTED_LANGUAGES.map((l) => [l.code, `${l.code.toUpperCase()} ${l.flag}`])
    );

    return (
        <header className="navbar">
            <div className="container navbar__inner">
                {/* Logo */}
                <Link to="/" className="navbar__logo">
                    <span className="navbar__logo-icon">⬡</span>
                    <span className="navbar__logo-text">
                        <span className="text-gold">SQX</span> EventOS
                    </span>
                </Link>

                {/* Desktop Nav */}
                <nav className="navbar__nav">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                clsx('navbar__link', { 'navbar__link--active': isActive })
                            }
                        >
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                {/* Desktop Actions */}
                <div className="navbar__actions">
                    {/* Language Switcher */}
                    <div className="navbar__dropdown">
                        <button
                            className="navbar__lang-btn"
                            onClick={() => { setLangOpen(!langOpen); setUserOpen(false); }}
                            aria-label="Switch language"
                        >
                            <Globe size={15} />
                            <span>{langInfo[language] ?? language.toUpperCase()}</span>
                            <ChevronDown size={13} />
                        </button>
                        {langOpen && (
                            <div className="navbar__dropdown-menu">
                                {SUPPORTED_LANGUAGES.map(({ code, label, flag }) => (
                                    <button
                                        key={code}
                                        className={clsx('navbar__dropdown-item', { 'navbar__dropdown-item--active': code === language })}
                                        onClick={() => { setLanguage(code); setLangOpen(false); }}
                                    >
                                        <span style={{ marginRight: '6px' }}>{flag}</span>
                                        {label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Auth */}
                    {isAuthenticated ? (
                        <div className="navbar__dropdown">
                            <button
                                className="navbar__user-btn"
                                onClick={() => { setUserOpen(!userOpen); setLangOpen(false); }}
                            >
                                {profile?.photo ? (
                                    <img src={profile.photo} alt={profile.display_name} className="navbar__avatar" />
                                ) : (
                                    <span className="navbar__avatar-placeholder">
                                        {profile?.display_name?.[0]?.toUpperCase() ?? 'U'}
                                    </span>
                                )}
                                <ChevronDown size={13} />
                            </button>
                            {userOpen && (
                                <div className="navbar__dropdown-menu navbar__dropdown-menu--right">
                                    <div className="navbar__dropdown-header">
                                        <p className="navbar__dropdown-name">{profile?.display_name}</p>
                                        <span className="badge badge--gold">{role}</span>
                                    </div>
                                    <div className="divider" style={{ margin: '0.5rem 0' }} />
                                    {(role === 'admin' || role === 'superadmin') && (
                                        <button
                                            className="navbar__dropdown-item"
                                            onClick={() => { navigate('/admin'); setUserOpen(false); }}
                                        >
                                            <LayoutDashboard size={14} /> Admin Panel
                                        </button>
                                    )}
                                    <button
                                        className="navbar__dropdown-item"
                                        onClick={() => { navigate('/my-tickets'); setUserOpen(false); }}
                                    >
                                        <Ticket size={14} /> {t('nav.my_tickets', 'My Tickets')}
                                    </button>
                                    {role === 'speaker' && (
                                        <button
                                            className="navbar__dropdown-item"
                                            onClick={() => { navigate('/portal/speaker'); setUserOpen(false); }}
                                        >
                                            <User size={14} /> {t('nav.speaker_portal', 'My Portal')}
                                        </button>
                                    )}
                                    {role === 'sponsor' && (
                                        <button
                                            className="navbar__dropdown-item"
                                            onClick={() => { navigate('/portal/sponsor'); setUserOpen(false); }}
                                        >
                                            <User size={14} /> {t('nav.sponsor_portal', 'My Portal')}
                                        </button>
                                    )}
                                    <button className="navbar__dropdown-item navbar__dropdown-item--danger" onClick={handleSignOut}>
                                        {t('nav.sign_out', 'Sign Out')}
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <Link to="/auth/login" className="btn btn--primary btn--sm">
                            <LogIn size={14} />
                            {t('nav.sign_in', 'Sign In')}
                        </Link>
                    )}
                </div>

                {/* Mobile Hamburger */}
                <button
                    className="navbar__hamburger"
                    onClick={() => setMobileOpen(!mobileOpen)}
                    aria-label="Toggle mobile menu"
                >
                    {mobileOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
            </div>

            {/* Mobile Menu */}
            {mobileOpen && (
                <div className="navbar__mobile">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className="navbar__mobile-link"
                            onClick={() => setMobileOpen(false)}
                        >
                            {item.label}
                        </NavLink>
                    ))}
                    <div className="navbar__mobile-actions">
                        <div className="navbar__mobile-lang">
                            {SUPPORTED_LANGUAGES.map(({ code, label, flag }) => (
                                <button
                                    key={code}
                                    className={clsx('btn btn--ghost btn--sm', { 'text-gold': code === language })}
                                    onClick={() => { setLanguage(code); setMobileOpen(false); }}
                                >
                                    {flag} {label}
                                </button>
                            ))}
                        </div>
                        {!isAuthenticated && (
                            <Link
                                to="/auth/login"
                                className="btn btn--primary"
                                onClick={() => setMobileOpen(false)}
                            >
                                <LogIn size={16} />
                                {t('nav.sign_in', 'Sign In')}
                            </Link>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
}
