// ============================================================
// ENUMS
// ============================================================
export type UserRole = 'superadmin' | 'admin' | 'sponsor' | 'speaker' | 'vip_visitor' | 'visitor';
export type TicketVisibility = 'HIDDEN' | 'INVITE_ONLY' | 'LOGGED_IN_ONLY' | 'PUBLIC';
export type EventStatus = 'draft' | 'published' | 'cancelled' | 'past';
export type OrderStatus = 'pending' | 'paid' | 'refunded' | 'cancelled';
export type CheckinStatus = 'pending' | 'checked_in' | 'no_show';
export type ImportType = 'speakers' | 'sponsors' | 'sessions' | 'attendees' | 'translations';
export type ImportStatus = 'pending' | 'processing' | 'done' | 'failed';
export type SponsorTier = 'platinum' | 'gold' | 'silver' | 'bronze' | 'media' | 'community';

// ============================================================
// CORE / SHARED
// ============================================================
export interface TextObject {
    id: string;
    key: string;
    default_language: string;
    created_by?: string;
    created_at: string;
}

export interface TextTranslation {
    id: string;
    text_object_id: string;
    language_code: string;
    content: string;
    updated_at: string;
}

// ============================================================
// USER / AUTH
// ============================================================
export interface Profile {
    user_id: string;
    role: UserRole;
    display_name: string;
    photo?: string;
    language_pref: string;
    permissions: Record<string, unknown>;
    gdpr_consent: boolean;
    gdpr_consent_date?: string;
    unsubscribe_email: boolean;
    created_at: string;
    updated_at: string;
}

// ============================================================
// EVENTS
// ============================================================
export interface EventFeatureFlags {
    networking: boolean;
    speaker_pages: boolean;
    sponsor_pages: boolean;
    attendee_directory: boolean;
    streaming: boolean;
    free_ticket_visibility: boolean;
    verification_layer: boolean;
}

export interface EventStream {
    type: 'youtube' | 'zoom' | 'other';
    url: string;
    embed_url?: string;
    label?: string;
}

export interface EventTheme {
    accent_color?: string;
    hero_image?: string;
    og_image?: string;
}

export interface Event {
    id: string;
    slug: string;
    title_text_id: string;
    desc_text_id: string;
    tagline_text_id?: string;
    status: EventStatus;
    start_date: string;
    end_date: string;
    venue?: string;
    venue_name?: string;    // human-readable venue name
    address?: string;
    city?: string;
    country?: string;
    timezone?: string;
    is_hybrid: boolean;
    streams: EventStream[];
    stream_url?: string;    // convenience: primary stream URL
    agenda?: any[];         // JSON agenda items from DB
    feature_flags: EventFeatureFlags;
    theme: EventTheme;
    max_capacity?: number;
    website_url?: string;
    og_image?: string;
    created_at: string;
    updated_at: string;
    // Resolved text (populated client-side)
    title?: string;
    description?: string;
    tagline?: string;
}

export interface EventSection {
    id: string;
    event_id: string;
    section_key: string;
    layout_key: string;
    order: number;
    is_enabled: boolean;
    config: Record<string, unknown>;
}

// ============================================================
// SESSIONS
// ============================================================
export interface Session {
    id: string;
    event_id: string;
    title_text_id: string;
    desc_text_id?: string;
    start_time: string;
    end_time: string;
    track?: string;
    location?: string;
    speaker_ids: string[];
    session_type: 'talk' | 'panel' | 'workshop' | 'break' | 'keynote';
    is_featured: boolean;
    created_at: string;
    // Resolved
    title?: string;
    description?: string;
    speakers?: Speaker[];
}

// ============================================================
// SPEAKERS
// ============================================================
export interface SpeakerSocialLinks {
    twitter?: string;
    linkedin?: string;
    website?: string;
    github?: string;
    youtube?: string;
}

export interface SpeakerVerification {
    credentials?: string;
    badge_type?: string;
    verified_by?: string;
    verified_at?: string;
}

export interface Speaker {
    id: string;
    event_id?: string;
    profile_user_id?: string;
    name: string;
    photo?: string;
    bio_text_id: string;
    title_text_id?: string;
    company?: string;
    // Convenience flat fields matching DB columns
    role?: string;          // job title / role label
    twitter?: string;
    linkedin?: string;
    bio?: string;           // resolved bio text
    order_index?: number;
    social_links: SpeakerSocialLinks;
    verification: SpeakerVerification;
    is_verified: boolean;
    is_featured: boolean;
    slug: string;
    created_at: string;
    // Resolved
    title_label?: string;
    sessions?: Session[];
}

// ============================================================
// SPONSORS
// ============================================================
export interface SponsorResource {
    type: 'pdf' | 'link' | 'video';
    label: string;
    url: string;
}

export interface SponsorLinks {
    website?: string;
    twitter?: string;
    linkedin?: string;
}

export interface Sponsor {
    id: string;
    profile_user_id?: string;
    event_id: string;
    name: string;
    logo?: string;
    tier: SponsorTier;
    desc_text_id: string;
    tagline_text_id?: string;
    website?: string;       // convenience top-level website
    links: SponsorLinks;
    calendly_url?: string;
    resources: SponsorResource[];
    lead_form_enabled: boolean;
    slug: string;
    created_at: string;
    // Resolved
    description?: string;
    tagline?: string;
}

// ============================================================
// TICKETS
// ============================================================
export interface TicketPerk {
    icon: string;
    text_id: string;
    text?: string;
}

export interface Ticket {
    id: string;
    event_id: string;
    name_text_id: string;
    desc_text_id?: string;
    price: number;
    currency: string;
    stripe_price_id?: string;
    is_free: boolean;
    visibility_mode: TicketVisibility;
    perks: TicketPerk[];
    max_quantity?: number;
    sort_order: number;
    is_active: boolean;
    invite_code?: string;
    secret_url_param?: string;
    created_at: string;
    // Resolved
    name?: string;
    description?: string;
}

// ============================================================
// ORDERS & ATTENDEES
// ============================================================
export interface Order {
    id: string;
    user_id?: string;
    event_id: string;
    ticket_id: string;
    stripe_session_id?: string;
    status: OrderStatus;
    amount: number;
    currency: string;
    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

export interface Attendee {
    id: string;
    user_id?: string;
    event_id: string;
    order_id?: string;
    ticket_id: string;
    name: string;
    email: string;
    phone?: string;
    company?: string;
    country?: string;
    job_title?: string;
    is_vip: boolean;
    consent: boolean;
    qr_code_value: string;
    checkin_status: CheckinStatus;
    checkin_time?: string;
    networking_opt_in: boolean;
    created_at: string;
    // Joined
    ticket?: Ticket;
}

// ============================================================
// SPONSOR LEADS
// ============================================================
export interface SponsorLead {
    id: string;
    sponsor_id: string;
    event_id: string;
    name: string;
    email: string;
    phone?: string;
    company?: string;
    message?: string;
    source_page?: string;
    created_at: string;
}

// ============================================================
// CONTENT
// ============================================================
export interface MediaAsset {
    id: string;
    event_id?: string;
    type: 'image' | 'video' | 'document';
    url: string;
    alt_text_text_id?: string;
    metadata: Record<string, unknown>;
    created_at: string;
}

export interface Testimonial {
    id: string;
    event_id: string;
    quote_text_id: string;
    author: string;
    role_text_id?: string;
    media_url?: string;
    created_at: string;
    // Resolved
    quote?: string;
    role?: string;
}

export interface ImportJob {
    id: string;
    event_id?: string;
    type: ImportType;
    file_url: string;
    status: ImportStatus;
    mapping: Record<string, string>;
    results: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

// ============================================================
// TICKET TYPES (public-facing, simpler than Ticket)
// ============================================================
/** Alias for Ticket used by EventDetailPage and ticket selection UI */
export interface TicketType {
    id: string;
    event_id: string;
    name: string;
    description?: string;
    price: number;
    currency: string;
    stripe_price_id?: string;
    is_free: boolean;
    is_hidden: boolean;
    visibility_mode?: TicketVisibility;
    max_quantity?: number;
    sort_order?: number;
    is_active?: boolean;
    sales_open?: boolean;
    invite_code?: string;
    secret_url_param?: string;
    created_at: string;
}

// ============================================================
// REGISTRATION (attendee sign-up row)
// ============================================================
export interface Registration {
    id: string;
    user_id: string;
    event_id: string;
    ticket_type_id: string;
    created_at: string;
}

// ============================================================
// SETTINGS
// ============================================================
export interface GlobalSettings {
    id: string;
    global_feature_flags: Partial<EventFeatureFlags>;
    brand: {
        name: string;
        logo?: string;
        accent_color?: string;
        discord_url?: string;
        telegram_url?: string;
    };
    integrations: {
        stripe_enabled: boolean;
        brevo_enabled: boolean;
        google_calendar_enabled: boolean;
        crm_webhook_url?: string;
        crm_webhook_template?: string;
    };
    updated_at: string;
}
