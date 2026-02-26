import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Calendar, Users, Star, Award,
    Globe, Download, BarChart2, Settings, LogOut, Menu, X,
    QrCode, ChevronDown, ChevronRight, Tag
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/i18n/TranslationProvider';
import clsx from 'clsx';
import './AdminLayout.css';

interface NavItem {
    label: string;
    to: string;
    icon: React.ReactNode;
    children?: { label: string; to: string }[];
}

export default function AdminLayout() {
    const { profile, role, signOut } = useAuth();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [expandedGroup, setExpandedGroup] = useState<string | null>('events');

    const navItems: NavItem[] = [
        {
            label: t('admin.nav.dashboard', 'Dashboard'),
            to: '/admin',
            icon: <LayoutDashboard size={18} />,
        },
        {
            label: t('admin.nav.events', 'Events'),
            to: '/admin/events',
            icon: <Calendar size={18} />,
            children: [
                { label: t('admin.nav.all_events', 'All Events'), to: '/admin/events' },
                { label: t('admin.nav.create_event', 'Create Event'), to: '/admin/events/create' },
            ],
        },
        {
            label: t('admin.nav.speakers', 'Speakers'),
            to: '/admin/speakers',
            icon: <Star size={18} />,
        },
        {
            label: t('admin.nav.sponsors', 'Sponsors'),
            to: '/admin/sponsors',
            icon: <Award size={18} />,
            children: [
                { label: t('admin.nav.all_sponsors', 'All Sponsors'), to: '/admin/sponsors' },
                { label: t('admin.nav.sponsor_leads', 'Leads'), to: '/admin/sponsors/leads' },
            ],
        },
        {
            label: t('admin.nav.attendees', 'Attendees'),
            to: '/admin/attendees',
            icon: <Users size={18} />,
        },
        {
            label: t('admin.nav.checkin', 'Check-in'),
            to: '/admin/check-in',
            icon: <QrCode size={18} />,
            children: [
                { label: t('admin.nav.checkin_list', 'Attendee List'), to: '/admin/check-in' },
                { label: t('admin.nav.checkin_scan', 'Scan QR'), to: '/admin/check-in/scan' },
            ],
        },
        {
            label: t('admin.nav.vouchers', 'Vouchers'),
            to: '/admin/vouchers',
            icon: <Tag size={18} />,
        },
        {
            label: t('admin.nav.translations', 'Translations'),
            to: '/admin/translations',
            icon: <Globe size={18} />,
        },
        {
            label: t('admin.nav.import_export', 'Import / Export'),
            to: '/admin/import-export',
            icon: <Download size={18} />,
        },
        {
            label: t('admin.nav.analytics', 'Analytics'),
            to: '/admin/analytics',
            icon: <BarChart2 size={18} />,
        },
        {
            label: t('admin.nav.settings', 'Settings'),
            to: '/admin/settings',
            icon: <Settings size={18} />,
        },
    ];

    const handleSignOut = async () => {
        await signOut();
        navigate('/');
    };

    return (
        <div className="admin-layout">
            {/* Sidebar */}
            <aside className={clsx('admin-sidebar', { 'admin-sidebar--collapsed': !sidebarOpen })}>
                {/* Sidebar Header */}
                <div className="admin-sidebar__header">
                    <NavLink to="/" className="admin-sidebar__logo">
                        <span className="text-gold">⬡ SQX</span>{sidebarOpen && ' EventOS'}
                    </NavLink>
                    <button
                        className="admin-sidebar__toggle"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        aria-label="Toggle sidebar"
                    >
                        {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
                    </button>
                </div>

                {/* Role Badge */}
                {sidebarOpen && (
                    <div className="admin-sidebar__profile">
                        <div className="admin-sidebar__avatar">
                            {profile?.display_name?.[0]?.toUpperCase() ?? 'A'}
                        </div>
                        <div>
                            <p className="admin-sidebar__name">{profile?.display_name}</p>
                            <span className="badge badge--gold">{role}</span>
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <nav className="admin-sidebar__nav">
                    {navItems.map((item) => {
                        const hasChildren = item.children && item.children.length > 0;
                        const isExpanded = expandedGroup === item.to;

                        return (
                            <div key={item.to}>
                                {hasChildren ? (
                                    <>
                                        <button
                                            className={clsx('admin-nav-item', { 'admin-nav-item--expanded': isExpanded })}
                                            onClick={() => setExpandedGroup(isExpanded ? null : item.to)}
                                            title={!sidebarOpen ? item.label : undefined}
                                        >
                                            <span className="admin-nav-item__icon">{item.icon}</span>
                                            {sidebarOpen && (
                                                <>
                                                    <span className="admin-nav-item__label">{item.label}</span>
                                                    <span className="admin-nav-item__chevron">
                                                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                    </span>
                                                </>
                                            )}
                                        </button>
                                        {sidebarOpen && isExpanded && (
                                            <div className="admin-nav-children">
                                                {item.children!.map((child) => (
                                                    <NavLink
                                                        key={child.to}
                                                        to={child.to}
                                                        end={child.to === '/admin/events' || child.to === '/admin/sponsors'}
                                                        className={({ isActive }) =>
                                                            clsx('admin-nav-child', { 'admin-nav-child--active': isActive })
                                                        }
                                                    >
                                                        {child.label}
                                                    </NavLink>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <NavLink
                                        to={item.to}
                                        end={item.to === '/admin'}
                                        className={({ isActive }) =>
                                            clsx('admin-nav-item', { 'admin-nav-item--active': isActive })
                                        }
                                        title={!sidebarOpen ? item.label : undefined}
                                    >
                                        <span className="admin-nav-item__icon">{item.icon}</span>
                                        {sidebarOpen && <span className="admin-nav-item__label">{item.label}</span>}
                                    </NavLink>
                                )}
                            </div>
                        );
                    })}
                </nav>

                {/* Sign Out */}
                <div className="admin-sidebar__footer">
                    <button className="admin-nav-item" onClick={handleSignOut} title={!sidebarOpen ? 'Sign Out' : undefined}>
                        <span className="admin-nav-item__icon"><LogOut size={18} /></span>
                        {sidebarOpen && <span className="admin-nav-item__label">{t('nav.sign_out', 'Sign Out')}</span>}
                    </button>
                </div>
            </aside>

            {/* Main */}
            <div className="admin-main">
                <main className="admin-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
