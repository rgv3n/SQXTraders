-- ============================================================
-- MIGRATION 008: Demo Seed Data
-- 1 event · 6 speakers · 6 sponsors · 4 ticket tiers
-- 8 sessions · 3 testimonials · translations ES + EN
-- ============================================================

-- ─── Helper: upsert text object + translations ───────────────
-- We create text_objects and their translations inline using CTEs

-- ─── EVENT ───────────────────────────────────────────────────
WITH event_title AS (
  INSERT INTO text_objects (key, default_language)
  VALUES ('event.sqx2025.title', 'es')
  ON CONFLICT (key) DO UPDATE SET key = EXCLUDED.key
  RETURNING id
),
event_desc AS (
  INSERT INTO text_objects (key, default_language)
  VALUES ('event.sqx2025.description', 'es')
  ON CONFLICT (key) DO UPDATE SET key = EXCLUDED.key
  RETURNING id
),
event_tagline AS (
  INSERT INTO text_objects (key, default_language)
  VALUES ('event.sqx2025.tagline', 'es')
  ON CONFLICT (key) DO UPDATE SET key = EXCLUDED.key
  RETURNING id
),
inserted_event AS (
  INSERT INTO events (
    slug, title, description, tagline,
    title_text_id, desc_text_id, tagline_text_id,
    status, start_date, end_date,
    venue_name, venue, address, city, country, timezone,
    is_hybrid, stream_url,
    theme, feature_flags, max_capacity
  )
  SELECT
    'sqx-summit-2025',
    'SQX Summit 2025',
    'El mayor evento de trading algorítmico y tecnología financiera de Europa. Tres días de conferencias, talleres y networking con los mejores expertos del sector.',
    'Trading sin fronteras',
    (SELECT id FROM event_title),
    (SELECT id FROM event_desc),
    (SELECT id FROM event_tagline),
    'published',
    '2025-10-15 09:00:00+02',
    '2025-10-17 18:00:00+02',
    'Palacio de Congresos Madrid',
    'Palacio de Congresos Madrid',
    'Paseo de la Castellana, 99, 28046 Madrid',
    'Madrid',
    'España',
    'Europe/Madrid',
    TRUE,
    'https://www.youtube.com/embed/placeholder',
    '{"accent_color":"#D4A853","hero_image":"https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1600&q=80","og_image":"https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80"}'::jsonb,
    '{"networking":true,"speaker_pages":true,"sponsor_pages":true,"attendee_directory":false,"streaming":true,"free_ticket_visibility":false,"verification_layer":true}'::jsonb,
    800
  ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title
  RETURNING id
)
-- Event title translations
INSERT INTO text_translations (text_object_id, language_code, content)
SELECT id, 'es', 'SQX Summit 2025' FROM event_title
ON CONFLICT (text_object_id, language_code) DO UPDATE SET content = EXCLUDED.content;

INSERT INTO text_translations (text_object_id, language_code, content)
SELECT id, 'en', 'SQX Summit 2025' FROM text_objects WHERE key = 'event.sqx2025.title'
ON CONFLICT (text_object_id, language_code) DO UPDATE SET content = EXCLUDED.content;

INSERT INTO text_translations (text_object_id, language_code, content)
SELECT id, 'es', 'El mayor evento de trading algorítmico y tecnología financiera de Europa. Tres días de conferencias, talleres y networking con los mejores expertos del sector.'
FROM text_objects WHERE key = 'event.sqx2025.description'
ON CONFLICT (text_object_id, language_code) DO UPDATE SET content = EXCLUDED.content;

INSERT INTO text_translations (text_object_id, language_code, content)
SELECT id, 'en', 'Europe''s largest algorithmic trading and financial technology event. Three days of talks, workshops, and networking with top industry experts.'
FROM text_objects WHERE key = 'event.sqx2025.description'
ON CONFLICT (text_object_id, language_code) DO UPDATE SET content = EXCLUDED.content;

INSERT INTO text_translations (text_object_id, language_code, content)
SELECT id, 'es', 'Trading sin fronteras' FROM text_objects WHERE key = 'event.sqx2025.tagline'
ON CONFLICT (text_object_id, language_code) DO UPDATE SET content = EXCLUDED.content;

INSERT INTO text_translations (text_object_id, language_code, content)
SELECT id, 'en', 'Trading Without Borders' FROM text_objects WHERE key = 'event.sqx2025.tagline'
ON CONFLICT (text_object_id, language_code) DO UPDATE SET content = EXCLUDED.content;

-- ─── SPEAKERS ────────────────────────────────────────────────
INSERT INTO speakers (event_id, name, role, company, bio, twitter, linkedin, slug, is_verified, is_featured, order_index, social_links, verification)
SELECT
  e.id,
  s.name, s.role, s.company, s.bio, s.twitter, s.linkedin, s.slug,
  TRUE, s.featured, s.ord,
  jsonb_build_object('twitter', s.twitter, 'linkedin', s.linkedin),
  '{}'::jsonb
FROM events e
CROSS JOIN (VALUES
  ('María García Ruiz', 'CTO & Co-founder', 'QuantEdge Capital', 'Experta en machine learning aplicado a mercados financieros con 15 años de experiencia en hedge funds europeos. Autora de "Algoritmos que Ganan".', 'mariagr_quant', 'https://linkedin.com/in/mariagarciaruiz', 'maria-garcia-ruiz', TRUE, 1),
  ('James Thornton', 'Head of Algo Trading', 'Citadel London', 'Former Goldman Sachs quant developer. Specialist in HFT infrastructure and latency optimization. Speaker at 50+ international conferences.', 'j_thornton_hft', 'https://linkedin.com/in/jamesthornton', 'james-thornton', TRUE, 2),
  ('Roberto Fernández', 'Fundador', 'AlgoTrading.es', 'Pioneer del trading cuantitativo en España. Creador de la comunidad SQX Traders con más de 20,000 miembros. Desarrollador de QuantConnect desde 2012.', 'robertofernandez_sqx', 'https://linkedin.com/in/robertofernandez', 'roberto-fernandez', TRUE, 3),
  ('Dr. Aisha Okonkwo', 'Research Director', 'DeepFinance AI', 'PhD MIT. Leading researcher in NLP for financial sentiment analysis and AI-driven portfolio management. Published in Nature Finance and Journal of Portfolio Management.', 'aisha_deepfinance', 'https://linkedin.com/in/aishaokonkwo', 'aisha-okonkwo', TRUE, 4),
  ('Carlos Martínez', 'Risk Manager', 'Sabadell Markets', 'Especialista en gestión de riesgo cuantitativo y regulación MiFID II. 12 años en banca de inversión. Consultor para el Banco de España.', 'carlosmtz_risk', 'https://linkedin.com/in/carlosmartinez', 'carlos-martinez', FALSE, 5),
  ('Elena Volkov', 'Quant Strategist', 'Polygon.io', 'Desarrolladora de estrategias de momentum y mean-reversion. Ex-Jane Street. Especialista en datos alternativos y market microstructure.', 'elena_volkov_q', 'https://linkedin.com/in/elenavolkov', 'elena-volkov', TRUE, 6)
) AS s(name, role, company, bio, twitter, linkedin, slug, featured, ord)
WHERE e.slug = 'sqx-summit-2025'
ON CONFLICT (event_id, slug) DO UPDATE SET name = EXCLUDED.name;

-- ─── SPONSORS ────────────────────────────────────────────────
INSERT INTO sponsors (event_id, name, tier, description, website, slug, links, lead_form_enabled, order_index)
SELECT
  e.id,
  s.name, s.tier::sponsor_tier, s.description, s.website, s.slug,
  jsonb_build_object('website', s.website),
  TRUE, s.ord
FROM events e
CROSS JOIN (VALUES
  ('Interactive Brokers', 'platinum', 'La plataforma de brokerage global líder para traders profesionales y algorítmicos. Acceso a más de 150 mercados en 33 países.', 'https://www.interactivebrokers.com', 'interactive-brokers', 1),
  ('QuantConnect', 'platinum', 'La plataforma de investigación y backtesting cuantitativo más grande del mundo. 250,000+ cuants desarrollando con C#, Python y F#.', 'https://www.quantconnect.com', 'quantconnect', 2),
  ('Polygon.io', 'gold', 'APIs de datos de mercado en tiempo real e históricos. La fuente de datos preferida por los mejores hedge funds y traders independientes.', 'https://polygon.io', 'polygon-io', 3),
  ('Alpaca Markets', 'gold', 'Brokerage con API-first para traders algorítmicos. Sin comisiones, sin mínimos. El broker favorito de los desarrolladores.', 'https://alpaca.markets', 'alpaca-markets', 4),
  ('Bookmap', 'silver', 'Visualización avanzada del order flow y market depth. La herramienta definitiva para analizar la liquidez del mercado en tiempo real.', 'https://bookmap.com', 'bookmap', 5),
  ('TradingView', 'silver', 'La plataforma de charting más popular del mundo con más de 50 millones de traders. Scripts en Pine Script y alertas avanzadas.', 'https://tradingview.com', 'tradingview', 6)
) AS s(name, tier, description, website, slug, ord)
WHERE e.slug = 'sqx-summit-2025'
ON CONFLICT (event_id, slug) DO UPDATE SET name = EXCLUDED.name;

-- ─── TICKET TYPES ────────────────────────────────────────────
INSERT INTO ticket_types (event_id, name, description, price, currency, is_free, is_hidden, visibility_mode, sort_order, is_active, perks)
SELECT
  e.id,
  t.name, t.description, t.price, 'EUR', t.is_free, t.is_hidden,
  t.visibility::ticket_visibility, t.ord, TRUE,
  t.perks::jsonb
FROM events e
CROSS JOIN (VALUES
  ('Gratuito',          'Acceso al live stream de todas las conferencias principales',    0,    TRUE, TRUE,  'PUBLIC',           1, '[{"icon":"📺","text":"Live streaming HD"},{"icon":"💬","text":"Chat de comunidad"},{"icon":"📚","text":"Grabaciones 7 días"}]'),
  ('Professional',      'Acceso presencial a todas las sesiones y workshops',             297,  FALSE, FALSE, 'PUBLIC',           2, '[{"icon":"🎫","text":"Acceso completo 3 días"},{"icon":"🍕","text":"Catering incluido"},{"icon":"🤝","text":"Networking sessions"},{"icon":"📦","text":"Kit del asistente"}]'),
  ('VIP',               'Acceso premium con zona VIP, cena de gala y sesiones exclusivas', 697, FALSE, FALSE, 'PUBLIC',           3, '[{"icon":"⭐","text":"Zona VIP"},{"icon":"🍷","text":"Cena de gala"},{"icon":"👥","text":"Almuerzo con ponentes"},{"icon":"🎤","text":"Workshop exclusivo"},{"icon":"📹","text":"Grabaciones premium"}]'),
  ('Invite Only',       'Acceso exclusivo solo por invitación para socios estratégicos',  0,    FALSE, FALSE, 'INVITE_ONLY',      4, '[{"icon":"🔑","text":"Acceso completo VIP"},{"icon":"🤝","text":"Reuniones 1:1 con ponentes"},{"icon":"📊","text":"Sesión de estrategia privada"}]')
) AS t(name, description, price, is_free, is_hidden, visibility, ord, perks)
WHERE e.slug = 'sqx-summit-2025'
ON CONFLICT DO NOTHING;

-- ─── SESSIONS (AGENDA) ───────────────────────────────────────
INSERT INTO sessions (event_id, title, description, start_time, end_time, track, session_type, is_featured, order_index, speaker_ids)
SELECT
  e.id,
  s.title, s.description,
  ('2025-10-15 '||s.start_time||'+02')::timestamptz,
  ('2025-10-15 '||s.end_time  ||'+02')::timestamptz,
  s.track, s.session_type::text, s.featured, s.ord,
  ARRAY(
    SELECT sp.id FROM speakers sp
    WHERE sp.event_id = e.id AND sp.slug = ANY(s.speaker_slugs)
  )
FROM events e
CROSS JOIN (VALUES
  ('09:00', '10:00', 'Keynote: El futuro del trading algorítmico en 2025',       'Tendencias en IA, datos alternativos y regulación que definirán el mercado en los próximos 5 años.',       'Main Stage', 'keynote',  TRUE,  1, ARRAY['roberto-fernandez']),
  ('10:15', '11:15', 'Machine Learning para predicción de precios',               'Arquitecturas de modelos LSTM y Transformer aplicadas a series temporales financieras.',                      'Track A',    'talk',     TRUE,  2, ARRAY['maria-garcia-ruiz']),
  ('10:15', '11:15', 'HFT Infrastructure: Latency < 1μs',                        'Cómo diseñar sistemas de alta frecuencia con C++ y FPGA para competir en microsegundos.',                     'Track B',    'talk',     FALSE, 3, ARRAY['james-thornton']),
  ('11:30', '12:30', 'Panel: Datos Alternativos — La ventaja competitiva',        'Expertos debaten sobre el uso de datos de satélite, redes sociales y ESG para generar alpha.',               'Main Stage', 'panel',    FALSE, 4, ARRAY['aisha-okonkwo','elena-volkov','carlos-martinez']),
  ('14:00', '16:00', 'Workshop: Backtest Profesional con QuantConnect',           'Taller práctico: construye, prueba y optimiza una estrategia de momentum en Python paso a paso.',             'Track A',    'workshop', TRUE,  5, ARRAY['elena-volkov']),
  ('14:00', '15:00', 'Gestión de Riesgo bajo MiFID II',                           'Requisitos regulatorios, límites de exposición y stress testing para fondos de inversión europeos.',           'Track B',    'talk',     FALSE, 6, ARRAY['carlos-martinez']),
  ('16:15', '17:15', 'Order Flow Analysis con Bookmap',                           'Cómo leer el flujo de órdenes institucionales y anticipar movimientos del mercado con market profile.',        'Track B',    'talk',     FALSE, 7, ARRAY['james-thornton']),
  ('17:30', '18:30', 'Panel de Cierre: Networking & Q&A',                         'Los ponentes responden preguntas de la audiencia y comparten sus mejores recursos para seguir aprendiendo.',  'Main Stage', 'panel',    FALSE, 8, ARRAY['maria-garcia-ruiz','roberto-fernandez','aisha-okonkwo'])
) AS s(start_time, end_time, title, description, track, session_type, featured, ord, speaker_slugs)
WHERE e.slug = 'sqx-summit-2025'
ON CONFLICT DO NOTHING;

-- ─── TESTIMONIALS ────────────────────────────────────────────
INSERT INTO testimonials (event_id, author, role, quote)
SELECT
  e.id, t.author, t.role, t.quote
FROM events e
CROSS JOIN (VALUES
  ('David Sánchez', 'Quant Trader · Independiente',       'El SQX Summit cambió completamente mi forma de desarrollar estrategias. En un solo día aprendí más que en años de libros. ¡Imprescindible!'),
  ('Laura Moreno',  'Portfolio Manager · Renta Variable', 'Las sesiones de machine learning fueron increíblemente prácticas. Salí con código real funcionando y contactos que hoy son socios de negocio.'),
  ('Mikel Etxebarria', 'CTO · FinTech Startup',          'La calidad de los ponentes y el nivel técnico de los workshops superó todas mis expectativas. Volveré sin duda el próximo año.')
) AS t(author, role, quote)
WHERE e.slug = 'sqx-summit-2025'
ON CONFLICT DO NOTHING;

-- ─── UI TRANSLATIONS (ES) ────────────────────────────────────
-- Insert all UI text keys used by the frontend

DO $$
DECLARE
  translations_es TEXT[][] := ARRAY[
    -- Home
    ARRAY['home.hero.title_1',          'Trading Sin'],
    ARRAY['home.hero.title_2',          'Fronteras'],
    ARRAY['home.hero.subtitle',         'El mayor evento de trading algorítmico de Europa. Conecta con los mejores expertos, aprende estrategias ganadoras y lleva tu trading al siguiente nivel.'],
    ARRAY['home.hero.cta_primary',      'Reservar Plaza'],
    ARRAY['home.hero.cta_secondary',    'Ver Programa'],
    ARRAY['home.stats.events',          'Eventos Realizados'],
    ARRAY['home.stats.speakers',        'Ponentes'],
    ARRAY['home.stats.attendees',       'Asistentes'],
    ARRAY['home.stats.countries',       'Países'],
    ARRAY['home.upcoming.title',        'Próximos Eventos'],
    ARRAY['home.sponsors.title',        'Con el apoyo de'],
    ARRAY['home.testimonials.title',    'Lo que dicen nuestros asistentes'],
    ARRAY['home.cta.title',             '¿Listo para el siguiente nivel?'],
    ARRAY['home.cta.subtitle',          'Únete a miles de traders que ya han transformado su forma de operar.'],
    ARRAY['home.cta.button',            'Obtener Entrada'],
    -- Nav
    ARRAY['nav.events',                 'Eventos'],
    ARRAY['nav.speakers',               'Ponentes'],
    ARRAY['nav.sponsors',               'Sponsors'],
    ARRAY['nav.past_events',            'Histórico'],
    ARRAY['nav.login',                  'Iniciar Sesión'],
    ARRAY['nav.register',               'Registrarse'],
    ARRAY['nav.my_account',             'Mi Cuenta'],
    ARRAY['nav.dashboard',              'Dashboard'],
    ARRAY['nav.logout',                 'Cerrar Sesión'],
    -- Auth
    ARRAY['auth.login.title',           'Bienvenido de nuevo'],
    ARRAY['auth.login.subtitle',        'Inicia sesión para acceder a tu cuenta'],
    ARRAY['auth.login.email',           'Email'],
    ARRAY['auth.login.password',        'Contraseña'],
    ARRAY['auth.login.submit',          'Iniciar Sesión'],
    ARRAY['auth.login.no_account',      '¿No tienes cuenta?'],
    ARRAY['auth.login.register_link',   'Regístrate'],
    ARRAY['auth.register.title',        'Crear Cuenta'],
    ARRAY['auth.register.subtitle',     'Únete a la comunidad SQX Traders'],
    ARRAY['auth.register.name',         'Nombre completo'],
    ARRAY['auth.register.email',        'Email'],
    ARRAY['auth.register.password',     'Contraseña'],
    ARRAY['auth.register.gdpr',         'Acepto la política de privacidad y el tratamiento de mis datos'],
    ARRAY['auth.register.submit',       'Crear cuenta'],
    ARRAY['auth.register.has_account',  '¿Ya tienes cuenta?'],
    ARRAY['auth.register.login_link',   'Inicia sesión'],
    -- Events page
    ARRAY['events.title',               'Todos los Eventos'],
    ARRAY['events.subtitle',            'Conferencias, workshops y networking para traders algorítmicos'],
    ARRAY['events.tab.upcoming',        'Próximos'],
    ARRAY['events.tab.past',            'Anteriores'],
    ARRAY['events.search',              'Buscar eventos...'],
    ARRAY['events.empty',               'No hay eventos disponibles'],
    ARRAY['events.register',            'Inscribirse'],
    -- Event detail
    ARRAY['event.agenda',               'Programa'],
    ARRAY['event.speakers',             'Ponentes'],
    ARRAY['event.sponsors',             'Sponsors'],
    ARRAY['event.tickets',              'Entradas'],
    ARRAY['event.register',             'Registrarse'],
    ARRAY['event.login_to_register',    'Inicia sesión para registrarte'],
    ARRAY['event.already_registered',   '¡Ya estás registrado!'],
    ARRAY['event.venue',                'Lugar'],
    ARRAY['event.date',                 'Fecha'],
    ARRAY['event.capacity',             'Aforo'],
    ARRAY['event.get_ticket',           'Obtener Entrada'],
    -- Countdown
    ARRAY['countdown.days',             'días'],
    ARRAY['countdown.hours',            'horas'],
    ARRAY['countdown.minutes',          'min'],
    ARRAY['countdown.seconds',          'seg'],
    ARRAY['countdown.live',             '¡EN DIRECTO!'],
    -- Admin
    ARRAY['admin.dashboard.title',      'Dashboard'],
    ARRAY['admin.dashboard.subtitle',   'Resumen del sistema'],
    ARRAY['admin.stats.upcoming',       'Próximos Eventos'],
    ARRAY['admin.stats.attendees',      'Total Asistentes'],
    ARRAY['admin.stats.revenue',        'Ingresos Totales'],
    ARRAY['admin.stats.speakers',       'Ponentes'],
    ARRAY['admin.nav.events',           'Eventos'],
    ARRAY['admin.nav.speakers',         'Ponentes'],
    ARRAY['admin.nav.sponsors',         'Sponsors'],
    ARRAY['admin.nav.attendees',        'Asistentes'],
    ARRAY['admin.nav.analytics',        'Analítica'],
    ARRAY['admin.nav.settings',         'Configuración'],
    -- Footer
    ARRAY['footer.rights',             'Todos los derechos reservados'],
    ARRAY['footer.privacy',            'Privacidad'],
    ARRAY['footer.terms',              'Términos'],
    ARRAY['footer.cookies',            'Cookies']
  ];
  pair TEXT[];
  obj_id UUID;
BEGIN
  FOREACH pair SLICE 1 IN ARRAY translations_es LOOP
    -- Upsert text_object
    INSERT INTO text_objects (key, default_language)
    VALUES (pair[1], 'es')
    ON CONFLICT (key) DO NOTHING;

    SELECT id INTO obj_id FROM text_objects WHERE key = pair[1];

    -- Upsert Spanish translation
    INSERT INTO text_translations (text_object_id, language_code, content)
    VALUES (obj_id, 'es', pair[2])
    ON CONFLICT (text_object_id, language_code) DO UPDATE SET content = EXCLUDED.content;
  END LOOP;
END $$;

-- ─── UI TRANSLATIONS (EN) ────────────────────────────────────
DO $$
DECLARE
  translations_en TEXT[][] := ARRAY[
    ARRAY['home.hero.title_1',          'Trading Without'],
    ARRAY['home.hero.title_2',          'Borders'],
    ARRAY['home.hero.subtitle',         'Europe''s largest algorithmic trading event. Connect with top experts, learn winning strategies, and take your trading to the next level.'],
    ARRAY['home.hero.cta_primary',      'Get Your Ticket'],
    ARRAY['home.hero.cta_secondary',    'View Programme'],
    ARRAY['home.stats.events',          'Events Held'],
    ARRAY['home.stats.speakers',        'Speakers'],
    ARRAY['home.stats.attendees',       'Attendees'],
    ARRAY['home.stats.countries',       'Countries'],
    ARRAY['home.upcoming.title',        'Upcoming Events'],
    ARRAY['home.sponsors.title',        'Supported by'],
    ARRAY['home.testimonials.title',    'What our attendees say'],
    ARRAY['home.cta.title',             'Ready for the Next Level?'],
    ARRAY['home.cta.subtitle',          'Join thousands of traders who have already transformed how they trade.'],
    ARRAY['home.cta.button',            'Get a Ticket'],
    ARRAY['nav.events',                 'Events'],
    ARRAY['nav.speakers',               'Speakers'],
    ARRAY['nav.sponsors',               'Sponsors'],
    ARRAY['nav.past_events',            'Archive'],
    ARRAY['nav.login',                  'Log In'],
    ARRAY['nav.register',               'Register'],
    ARRAY['nav.my_account',             'My Account'],
    ARRAY['nav.dashboard',              'Dashboard'],
    ARRAY['nav.logout',                 'Log Out'],
    ARRAY['auth.login.title',           'Welcome back'],
    ARRAY['auth.login.subtitle',        'Sign in to access your account'],
    ARRAY['auth.login.email',           'Email'],
    ARRAY['auth.login.password',        'Password'],
    ARRAY['auth.login.submit',          'Sign In'],
    ARRAY['auth.login.no_account',      'Don''t have an account?'],
    ARRAY['auth.login.register_link',   'Register'],
    ARRAY['auth.register.title',        'Create Account'],
    ARRAY['auth.register.subtitle',     'Join the SQX Traders community'],
    ARRAY['auth.register.name',         'Full name'],
    ARRAY['auth.register.email',        'Email'],
    ARRAY['auth.register.password',     'Password'],
    ARRAY['auth.register.gdpr',         'I accept the privacy policy and data processing terms'],
    ARRAY['auth.register.submit',       'Create Account'],
    ARRAY['auth.register.has_account',  'Already have an account?'],
    ARRAY['auth.register.login_link',   'Sign in'],
    ARRAY['events.title',               'All Events'],
    ARRAY['events.subtitle',            'Conferences, workshops, and networking for algorithmic traders'],
    ARRAY['events.tab.upcoming',        'Upcoming'],
    ARRAY['events.tab.past',            'Past'],
    ARRAY['events.search',              'Search events...'],
    ARRAY['events.empty',               'No events available'],
    ARRAY['events.register',            'Register'],
    ARRAY['event.agenda',               'Agenda'],
    ARRAY['event.speakers',             'Speakers'],
    ARRAY['event.sponsors',             'Sponsors'],
    ARRAY['event.tickets',              'Tickets'],
    ARRAY['event.register',             'Register'],
    ARRAY['event.login_to_register',    'Sign in to register'],
    ARRAY['event.already_registered',   'You are registered!'],
    ARRAY['event.venue',                'Venue'],
    ARRAY['event.date',                 'Date'],
    ARRAY['event.capacity',             'Capacity'],
    ARRAY['event.get_ticket',           'Get Ticket'],
    ARRAY['countdown.days',             'days'],
    ARRAY['countdown.hours',            'hours'],
    ARRAY['countdown.minutes',          'min'],
    ARRAY['countdown.seconds',          'sec'],
    ARRAY['countdown.live',             'LIVE NOW!'],
    ARRAY['admin.dashboard.title',      'Dashboard'],
    ARRAY['admin.dashboard.subtitle',   'System overview'],
    ARRAY['admin.stats.upcoming',       'Upcoming Events'],
    ARRAY['admin.stats.attendees',      'Total Attendees'],
    ARRAY['admin.stats.revenue',        'Total Revenue'],
    ARRAY['admin.stats.speakers',       'Speakers'],
    ARRAY['admin.nav.events',           'Events'],
    ARRAY['admin.nav.speakers',         'Speakers'],
    ARRAY['admin.nav.sponsors',         'Sponsors'],
    ARRAY['admin.nav.attendees',        'Attendees'],
    ARRAY['admin.nav.analytics',        'Analytics'],
    ARRAY['admin.nav.settings',         'Settings'],
    ARRAY['footer.rights',              'All rights reserved'],
    ARRAY['footer.privacy',             'Privacy'],
    ARRAY['footer.terms',               'Terms'],
    ARRAY['footer.cookies',             'Cookies']
  ];
  pair TEXT[];
  obj_id UUID;
BEGIN
  FOREACH pair SLICE 1 IN ARRAY translations_en LOOP
    INSERT INTO text_objects (key, default_language)
    VALUES (pair[1], 'es')
    ON CONFLICT (key) DO NOTHING;

    SELECT id INTO obj_id FROM text_objects WHERE key = pair[1];

    INSERT INTO text_translations (text_object_id, language_code, content)
    VALUES (obj_id, 'en', pair[2])
    ON CONFLICT (text_object_id, language_code) DO UPDATE SET content = EXCLUDED.content;
  END LOOP;
END $$;
