/**
 * Local translation fallbacks — used when Supabase is unavailable or
 * the text_translations table hasn't been seeded yet.
 *
 * Keys here are the same keys used in:
 *   supabase/migrations/008_seed_data.sql
 *   All components via t('key', 'fallback')
 */

export type SupportedLanguage = 'es' | 'en';

type TranslationsDict = Record<string, string>;

export const LOCAL_TRANSLATIONS: Record<SupportedLanguage, TranslationsDict> = {
    // =============================================
    // ESPAÑOL
    // =============================================
    es: {
        // ------ Navbar ------
        'nav.events': 'Eventos',
        'nav.speakers': 'Ponentes',
        'nav.sponsors': 'Sponsors',
        'nav.past_events': 'Histórico',
        'nav.login': 'Iniciar sesión',
        'nav.sign_in': 'Iniciar sesión',
        'nav.register': 'Registrarse',
        'nav.my_account': 'Mi cuenta',
        'nav.dashboard': 'Dashboard',
        'nav.logout': 'Cerrar sesión',
        'nav.sign_out': 'Cerrar sesión',
        'nav.speaker_portal': 'Mi portal',
        'nav.sponsor_portal': 'Mi portal',

        // ------ Home Hero ------
        'home.hero.title_1': 'Trading Sin',
        'home.hero.title_2': 'Fronteras.',
        'home.hero.title_3': 'Tu Próximo Summit.',
        'home.hero.next_event': 'Próximo Evento',
        'home.hero.subtitle':
            'La conferencia de referencia para traders algorítmicos. Ponentes de clase mundial, estrategias de vanguardia y una comunidad que mueve mercados.',
        'home.hero.cta_primary': 'Reservar Plaza',
        'home.hero.cta_explore': 'Ver Eventos',
        'home.hero.cta_secondary': 'Ver Charlas Anteriores',
        'home.hero.hybrid': 'También Online',

        // ------ Home Stats ------
        'home.stat.attendees': 'Asistentes',
        'home.stat.speakers': 'Ponentes Expertos',
        'home.stat.sponsors': 'Sponsors',
        'home.stat.editions': 'Ediciones',
        'home.stats.events': 'Eventos Realizados',
        'home.stats.speakers': 'Ponentes',
        'home.stats.attendees': 'Asistentes',
        'home.stats.countries': 'Países',

        // ------ Home Sections ------
        'home.upcoming.label': 'Próximos',
        'home.upcoming.title': 'Próximos Eventos',
        'home.upcoming.see_all': 'Ver todos',
        'home.sponsors.label': 'Patrocinadores',
        'home.sponsors.title': 'Con el apoyo de',
        'home.testimonials.label': 'Testimonios',
        'home.testimonials.title': 'Lo que dicen nuestros asistentes',
        'home.cta.label': '¿Listo?',
        'home.cta.title': 'Únete al Próximo SQX Summit',
        'home.cta.subtitle':
            'Plazas limitadas. Asegura tu lugar entre los mejores traders algorítmicos del mundo.',
        'home.cta.button': 'Regístrate ahora',
        'home.cta.button_explore': 'Explorar eventos',
        'home.cta.see_speakers': 'Conoce a los ponentes',

        // ------ Events Page ------
        'events.title': 'Todos los Eventos',
        'events.subtitle': 'Conferencias, talleres y networking para traders algorítmicos',
        'events.tab.upcoming': 'Próximos',
        'events.tab.past': 'Anteriores',
        'events.search': 'Buscar eventos...',
        'events.empty': 'No hay eventos disponibles',
        'events.register': 'Inscribirse',

        // ------ Event Cards ------
        'event.hybrid': 'Híbrido',
        'event.live': 'Presencial',
        'event.online': 'Online',
        'event.status.open': 'Inscripción abierta',
        'event.view_details': 'Ver detalles',
        'event.tickets': 'Entradas',
        'event.agenda': 'Programa',
        'event.speakers': 'Ponentes',
        'event.sponsors': 'Sponsors',
        'event.register': 'Inscribirse',
        'event.login_to_register': 'Inicia sesión para inscribirte',
        'event.already_registered': '¡Ya estás inscrito!',
        'event.venue': 'Lugar',
        'event.date': 'Fecha',
        'event.capacity': 'Aforo',
        'event.get_ticket': 'Obtener Entrada',

        // ------ Countdown ------
        'countdown.days': 'días',
        'countdown.hours': 'horas',
        'countdown.minutes': 'min',
        'countdown.seconds': 'seg',
        'countdown.live': '¡EN DIRECTO!',
        'countdown.starts_in': 'Empieza en',

        // ------ Speakers Page ------
        'speakers.title': 'Ponentes',
        'speakers.subtitle': 'Conoce a los expertos que configuran el futuro del trading',
        'speakers.empty': 'No hay ponentes disponibles',
        'speaker.social.twitter': 'Twitter',
        'speaker.social.linkedin': 'LinkedIn',

        // ------ Sponsors Page ------
        'sponsors.title': 'Nuestros Sponsors',
        'sponsors.subtitle': 'Empresas líderes que hacen posible este evento',
        'sponsors.empty': 'No hay sponsors disponibles',
        'sponsor.tier.platinum': 'Platinum',
        'sponsor.tier.gold': 'Gold',
        'sponsor.tier.silver': 'Silver',
        'sponsor.tier.bronze': 'Bronze',
        'sponsor.tier.media': 'Media Partner',
        'sponsor.tier.community': 'Comunidad',
        'sponsor.website': 'Visitar web',
        'sponsor.contact': 'Contactar',

        // ------ Past Events ------
        'past_events.title': 'Eventos Anteriores',
        'past_events.subtitle': 'Revive las mejores charlas y talleres de ediciones pasadas',
        'past_events.empty': 'No hay eventos anteriores',
        'past_events.watch': 'Ver grabación',

        // ------ Auth ------
        'auth.login.title': 'Bienvenido de nuevo',
        'auth.login.subtitle': 'Inicia sesión para acceder a tu cuenta',
        'auth.login.email': 'Email',
        'auth.login.password': 'Contraseña',
        'auth.login.submit': 'Iniciar sesión',
        'auth.login.forgot': '¿Olvidaste tu contraseña?',
        'auth.login.no_account': '¿No tienes cuenta?',
        'auth.login.register_link': 'Regístrate',
        'auth.login.or': 'O',
        'auth.login.magic_link': 'Acceder con magic link',
        'auth.register.title': 'Crear cuenta',
        'auth.register.subtitle': 'Únete a la comunidad SQX Traders',
        'auth.register.name': 'Nombre completo',
        'auth.register.email': 'Email',
        'auth.register.password': 'Contraseña',
        'auth.register.gdpr': 'Acepto la política de privacidad y el tratamiento de mis datos',
        'auth.register.submit': 'Crear cuenta',
        'auth.register.has_account': '¿Ya tienes cuenta?',
        'auth.register.login_link': 'Inicia sesión',
        'auth.error.invalid_credentials': 'Credenciales incorrectas. Inténtalo de nuevo.',
        'auth.error.email_taken': 'Este email ya está registrado.',

        // ------ Admin ------
        'admin.dashboard.title': 'Dashboard',
        'admin.dashboard.subtitle': 'Resumen del sistema',
        'admin.stats.upcoming': 'Próximos Eventos',
        'admin.stats.attendees': 'Total Asistentes',
        'admin.stats.revenue': 'Ingresos Totales',
        'admin.stats.speakers': 'Ponentes',
        'admin.nav.events': 'Eventos',
        'admin.nav.speakers': 'Ponentes',
        'admin.nav.sponsors': 'Sponsors',
        'admin.nav.attendees': 'Asistentes',
        'admin.nav.check_in': 'Check-in',
        'admin.nav.translations': 'Traducciones',
        'admin.nav.import': 'Importar/Exportar',
        'admin.nav.analytics': 'Analítica',
        'admin.nav.settings': 'Configuración',
        'admin.events.title': 'Gestión de Eventos',
        'admin.events.create': 'Crear Evento',
        'admin.events.empty': 'No hay eventos',

        // ------ Portals ------
        'portal.speaker.title': 'Portal de Ponente',
        'portal.speaker.subtitle': 'Gestiona tu perfil y materiales',
        'portal.sponsor.title': 'Portal de Sponsor',
        'portal.sponsor.subtitle': 'Gestiona tu presencia y leads',

        // ------ Footer ------
        'footer.rights': 'Todos los derechos reservados',
        'footer.privacy': 'Privacidad',
        'footer.terms': 'Términos',
        'footer.cookies': 'Cookies',
        'footer.contact': 'Contacto',

        // ------ Common ------
        'common.loading': 'Cargando...',
        'common.error': 'Ha ocurrido un error',
        'common.retry': 'Reintentar',
        'common.save': 'Guardar',
        'common.cancel': 'Cancelar',
        'common.delete': 'Eliminar',
        'common.edit': 'Editar',
        'common.create': 'Crear',
        'common.search': 'Buscar',
        'common.filter': 'Filtrar',
        'common.all': 'Todos',
        'common.back': 'Volver',
        'common.more': 'Ver más',
        'common.less': 'Ver menos',
    },

    // =============================================
    // ENGLISH
    // =============================================
    en: {
        // ------ Navbar ------
        'nav.events': 'Events',
        'nav.speakers': 'Speakers',
        'nav.sponsors': 'Sponsors',
        'nav.past_events': 'Archive',
        'nav.login': 'Log in',
        'nav.sign_in': 'Log in',
        'nav.register': 'Register',
        'nav.my_account': 'My Account',
        'nav.dashboard': 'Dashboard',
        'nav.logout': 'Log out',
        'nav.sign_out': 'Log out',
        'nav.speaker_portal': 'My Portal',
        'nav.sponsor_portal': 'My Portal',

        // ------ Home Hero ------
        'home.hero.title_1': 'Trading Without',
        'home.hero.title_2': 'Borders.',
        'home.hero.title_3': 'Your Next Summit Awaits.',
        'home.hero.next_event': 'Next Event',
        'home.hero.subtitle':
            'The premier conference for algorithmic traders. World-class speakers, cutting-edge strategies, and a community that moves markets.',
        'home.hero.cta_primary': 'Get Your Ticket',
        'home.hero.cta_explore': 'Explore Events',
        'home.hero.cta_secondary': 'Watch Past Talks',
        'home.hero.hybrid': 'Also Online',

        // ------ Home Stats ------
        'home.stat.attendees': 'Attendees',
        'home.stat.speakers': 'Expert Speakers',
        'home.stat.sponsors': 'Sponsors',
        'home.stat.editions': 'Editions',
        'home.stats.events': 'Events Held',
        'home.stats.speakers': 'Speakers',
        'home.stats.attendees': 'Attendees',
        'home.stats.countries': 'Countries',

        // ------ Home Sections ------
        'home.upcoming.label': 'Upcoming',
        'home.upcoming.title': 'Next Events',
        'home.upcoming.see_all': 'See all',
        'home.sponsors.label': 'Partners',
        'home.sponsors.title': 'Supported by',
        'home.testimonials.label': 'Testimonials',
        'home.testimonials.title': 'Voices from the Community',
        'home.cta.label': 'Ready?',
        'home.cta.title': 'Join the Next SQX Summit',
        'home.cta.subtitle':
            'Limited seats. Secure your spot among the world\'s top algorithmic traders.',
        'home.cta.button': 'Register Now',
        'home.cta.button_explore': 'Explore Events',
        'home.cta.see_speakers': 'Meet the Speakers',

        // ------ Events Page ------
        'events.title': 'All Events',
        'events.subtitle': 'Conferences, workshops, and networking for algorithmic traders',
        'events.tab.upcoming': 'Upcoming',
        'events.tab.past': 'Past',
        'events.search': 'Search events...',
        'events.empty': 'No events available',
        'events.register': 'Register',

        // ------ Event Cards ------
        'event.hybrid': 'Hybrid',
        'event.live': 'In-Person',
        'event.online': 'Online',
        'event.status.open': 'Registration Open',
        'event.view_details': 'View Details',
        'event.tickets': 'Tickets',
        'event.agenda': 'Agenda',
        'event.speakers': 'Speakers',
        'event.sponsors': 'Sponsors',
        'event.register': 'Register',
        'event.login_to_register': 'Sign in to register',
        'event.already_registered': 'You\'re registered!',
        'event.venue': 'Venue',
        'event.date': 'Date',
        'event.capacity': 'Capacity',
        'event.get_ticket': 'Get Ticket',

        // ------ Countdown ------
        'countdown.days': 'days',
        'countdown.hours': 'hours',
        'countdown.minutes': 'min',
        'countdown.seconds': 'sec',
        'countdown.live': 'LIVE NOW!',
        'countdown.starts_in': 'Starts in',

        // ------ Speakers Page ------
        'speakers.title': 'Speakers',
        'speakers.subtitle': 'Meet the experts shaping the future of trading',
        'speakers.empty': 'No speakers available',
        'speaker.social.twitter': 'Twitter',
        'speaker.social.linkedin': 'LinkedIn',

        // ------ Sponsors Page ------
        'sponsors.title': 'Our Sponsors',
        'sponsors.subtitle': 'Leading companies making this event possible',
        'sponsors.empty': 'No sponsors available',
        'sponsor.tier.platinum': 'Platinum',
        'sponsor.tier.gold': 'Gold',
        'sponsor.tier.silver': 'Silver',
        'sponsor.tier.bronze': 'Bronze',
        'sponsor.tier.media': 'Media Partner',
        'sponsor.tier.community': 'Community',
        'sponsor.website': 'Visit website',
        'sponsor.contact': 'Contact',

        // ------ Past Events ------
        'past_events.title': 'Past Events',
        'past_events.subtitle': 'Relive the best talks and workshops from previous editions',
        'past_events.empty': 'No past events',
        'past_events.watch': 'Watch recording',

        // ------ Auth ------
        'auth.login.title': 'Welcome back',
        'auth.login.subtitle': 'Sign in to access your account',
        'auth.login.email': 'Email',
        'auth.login.password': 'Password',
        'auth.login.submit': 'Sign in',
        'auth.login.forgot': 'Forgot your password?',
        'auth.login.no_account': "Don't have an account?",
        'auth.login.register_link': 'Register',
        'auth.login.or': 'Or',
        'auth.login.magic_link': 'Sign in with magic link',
        'auth.register.title': 'Create Account',
        'auth.register.subtitle': 'Join the SQX Traders community',
        'auth.register.name': 'Full name',
        'auth.register.email': 'Email',
        'auth.register.password': 'Password',
        'auth.register.gdpr': 'I accept the privacy policy and data processing terms',
        'auth.register.submit': 'Create account',
        'auth.register.has_account': 'Already have an account?',
        'auth.register.login_link': 'Sign in',
        'auth.error.invalid_credentials': 'Invalid credentials. Please try again.',
        'auth.error.email_taken': 'This email is already registered.',

        // ------ Admin ------
        'admin.dashboard.title': 'Dashboard',
        'admin.dashboard.subtitle': 'System overview',
        'admin.stats.upcoming': 'Upcoming Events',
        'admin.stats.attendees': 'Total Attendees',
        'admin.stats.revenue': 'Total Revenue',
        'admin.stats.speakers': 'Speakers',
        'admin.nav.events': 'Events',
        'admin.nav.speakers': 'Speakers',
        'admin.nav.sponsors': 'Sponsors',
        'admin.nav.attendees': 'Attendees',
        'admin.nav.check_in': 'Check-in',
        'admin.nav.translations': 'Translations',
        'admin.nav.import': 'Import/Export',
        'admin.nav.analytics': 'Analytics',
        'admin.nav.settings': 'Settings',
        'admin.events.title': 'Event Management',
        'admin.events.create': 'Create Event',
        'admin.events.empty': 'No events yet',

        // ------ Portals ------
        'portal.speaker.title': 'Speaker Portal',
        'portal.speaker.subtitle': 'Manage your profile and materials',
        'portal.sponsor.title': 'Sponsor Portal',
        'portal.sponsor.subtitle': 'Manage your presence and leads',

        // ------ Footer ------
        'footer.rights': 'All rights reserved',
        'footer.privacy': 'Privacy',
        'footer.terms': 'Terms',
        'footer.cookies': 'Cookies',
        'footer.contact': 'Contact',

        // ------ Common ------
        'common.loading': 'Loading...',
        'common.error': 'Something went wrong',
        'common.retry': 'Retry',
        'common.save': 'Save',
        'common.cancel': 'Cancel',
        'common.delete': 'Delete',
        'common.edit': 'Edit',
        'common.create': 'Create',
        'common.search': 'Search',
        'common.filter': 'Filter',
        'common.all': 'All',
        'common.back': 'Back',
        'common.more': 'Show more',
        'common.less': 'Show less',
    },
};

/** List of all supported languages */
export const SUPPORTED_LANGUAGES: { code: SupportedLanguage; label: string; flag: string }[] = [
    { code: 'es', label: 'Español', flag: '🇪🇸' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
];
