import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft, Plus, Ticket, Trash2, Edit2, Save, X,
    EyeOff, Lock, Globe, Users,
    GripVertical, Calendar, Pencil, Mic, Building2, List,
} from 'lucide-react';
import { useTranslation } from '@/i18n/TranslationProvider';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────
type Visibility = 'PUBLIC' | 'LOGGED_IN_ONLY' | 'INVITE_ONLY' | 'HIDDEN';

interface TicketType {
    id: string;
    event_id: string;
    name: string;
    description: string | null;
    price: number;
    currency: string;
    is_free: boolean;
    is_hidden: boolean;
    visibility_mode: Visibility;
    max_quantity: number | null;
    sort_order: number;
    is_active: boolean;
    sales_open: boolean;
    created_at: string;
}

interface TicketForm {
    name: string;
    description: string;
    is_free: boolean;
    price: string;
    currency: string;
    max_quantity: string;
    visibility_mode: Visibility;
    sort_order: string;
    is_active: boolean;
    sales_open: boolean;
}

const emptyTicketForm = (sortOrder = 0): TicketForm => ({
    name: '',
    description: '',
    is_free: true,
    price: '0',
    currency: 'EUR',
    sort_order: String(sortOrder),
    max_quantity: '',
    visibility_mode: 'PUBLIC',
    is_active: true,
    sales_open: true,
});

// ─── Event edit form ──────────────────────────────────────────
interface EventEditForm {
    title: string;
    slug: string;
    description: string;
    start_date: string;
    end_date: string;
    timezone: string;
    venue_name: string;
    city: string;
    country: string;
    address: string;
    is_hybrid: boolean;
    stream_url: string;
    max_capacity: string;
    og_image: string;
}

function slugify(s: string) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const TIMEZONES = ['Europe/Madrid', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'America/Mexico_City', 'Asia/Tokyo'];

const CURRENCIES = ['EUR', 'USD', 'GBP', 'MXN', 'ARS', 'COP'];

// ─── Speaker / Sponsor / Agenda types ─────────────────────────
interface SpeakerRow {
    id: string;
    name: string;
    role: string | null;
    company: string | null;
    bio: string | null;
    photo: string | null;
    twitter: string | null;
    linkedin: string | null;
    order_index: number;
}

interface SpeakerForm {
    name: string;
    role: string;
    company: string;
    bio: string;
    photo: string;
    twitter: string;
    linkedin: string;
    order_index: string;
}

const emptySpeaker = (): SpeakerForm => ({
    name: '', role: '', company: '', bio: '', photo: '', twitter: '', linkedin: '', order_index: '0',
});

interface SponsorRow {
    id: string;
    name: string;
    tier: string;
    website: string | null;
    logo: string | null;
    description: string | null;
    contact_email: string | null;
}

interface SponsorForm {
    name: string;
    tier: string;
    website: string;
    logo: string;
    description: string;
    contact_email: string;
}

const emptySponsor = (): SponsorForm => ({
    name: '', tier: 'gold', website: '', logo: '', description: '', contact_email: '',
});

const SPONSOR_TIERS = ['platinum', 'gold', 'silver', 'bronze', 'media', 'community'];

interface AgendaItem {
    time: string;
    title: string;
    speaker: string;
    description: string;
}

const VISIBILITIES: { value: Visibility; icon: React.ReactNode; label: string }[] = [
    { value: 'PUBLIC',          icon: <Globe size={13} />,    label: 'Public' },
    { value: 'LOGGED_IN_ONLY',  icon: <Lock size={13} />,     label: 'Logged-in only' },
    { value: 'INVITE_ONLY',     icon: <Users size={13} />,    label: 'Invite only' },
    { value: 'HIDDEN',          icon: <EyeOff size={13} />,   label: 'Hidden' },
];

// ─── Helpers ──────────────────────────────────────────────────
function visibilityBadge(v: Visibility) {
    const map: Record<Visibility, { label: string; cls: string }> = {
        PUBLIC:         { label: 'Public',   cls: 'badge--green' },
        LOGGED_IN_ONLY: { label: 'Members',  cls: 'badge--default' },
        INVITE_ONLY:    { label: 'Invite',   cls: 'badge--gold' },
        HIDDEN:         { label: 'Hidden',   cls: 'badge--default' },
    };
    const { label, cls } = map[v] ?? map.PUBLIC;
    return <span className={`badge ${cls}`}>{label}</span>;
}

function formatPrice(tt: TicketType) {
    if (tt.is_free) return <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>FREE</span>;
    return <span style={{ fontWeight: 700 }}>{tt.currency} {Number(tt.price).toFixed(2)}</span>;
}

// ─── Ticket form (inline, create or edit) ─────────────────────
function TicketForm({
    initial,
    onSave,
    onCancel,
    saving,
}: {
    initial: TicketForm;
    onSave: (f: TicketForm) => void;
    onCancel: () => void;
    saving: boolean;
}) {
    const [f, setF] = useState<TicketForm>(initial);
    const set = (k: keyof TicketForm, v: string | boolean) => setF(p => ({ ...p, [k]: v }));

    return (
        <div style={{
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-gold)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-6)',
        }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                {/* Name */}
                <div style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Name *</label>
                    <input
                        className="form-input"
                        style={{ width: '100%' }}
                        placeholder="e.g. Early Bird, Normal, Late Stage…"
                        value={f.name}
                        onChange={e => set('name', e.target.value)}
                        autoFocus
                    />
                </div>

                {/* Description */}
                <div style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Description</label>
                    <input
                        className="form-input"
                        style={{ width: '100%' }}
                        placeholder="Short description shown to attendees"
                        value={f.description}
                        onChange={e => set('description', e.target.value)}
                    />
                </div>

                {/* Free toggle */}
                <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                        id="is_free"
                        type="checkbox"
                        checked={f.is_free}
                        onChange={e => set('is_free', e.target.checked)}
                        style={{ width: 16, height: 16, accentColor: 'var(--color-gold)', cursor: 'pointer' }}
                    />
                    <label htmlFor="is_free" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text)', cursor: 'pointer', fontWeight: 500 }}>
                        Free ticket (no payment required)
                    </label>
                </div>

                {/* Price + currency */}
                {!f.is_free && (
                    <>
                        <div>
                            <label className="form-label">Price</label>
                            <input
                                className="form-input"
                                type="number"
                                min="0"
                                step="0.01"
                                style={{ width: '100%' }}
                                value={f.price}
                                onChange={e => set('price', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="form-label">Currency</label>
                            <select
                                className="form-input"
                                style={{ width: '100%' }}
                                value={f.currency}
                                onChange={e => set('currency', e.target.value)}
                            >
                                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </>
                )}

                {/* Max quantity */}
                <div>
                    <label className="form-label">Max tickets <span style={{ color: 'var(--color-text-faint)' }}>(blank = unlimited)</span></label>
                    <input
                        className="form-input"
                        type="number"
                        min="1"
                        style={{ width: '100%' }}
                        placeholder="∞"
                        value={f.max_quantity}
                        onChange={e => set('max_quantity', e.target.value)}
                    />
                </div>

                {/* Visibility */}
                <div>
                    <label className="form-label">Visibility</label>
                    <select
                        className="form-input"
                        style={{ width: '100%' }}
                        value={f.visibility_mode}
                        onChange={e => set('visibility_mode', e.target.value as Visibility)}
                    >
                        {VISIBILITIES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                    </select>
                </div>

                {/* Sort order */}
                <div>
                    <label className="form-label">Sort order</label>
                    <input
                        className="form-input"
                        type="number"
                        style={{ width: '100%' }}
                        value={f.sort_order}
                        onChange={e => set('sort_order', e.target.value)}
                    />
                </div>

                {/* Active */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                        id="is_active"
                        type="checkbox"
                        checked={f.is_active}
                        onChange={e => set('is_active', e.target.checked)}
                        style={{ width: 16, height: 16, accentColor: 'var(--color-gold)', cursor: 'pointer' }}
                    />
                    <label htmlFor="is_active" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text)', cursor: 'pointer', fontWeight: 500 }}>
                        Active (visible on the page)
                    </label>
                </div>

                {/* Sales open */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                        id="sales_open"
                        type="checkbox"
                        checked={f.sales_open}
                        onChange={e => set('sales_open', e.target.checked)}
                        style={{ width: 16, height: 16, accentColor: 'var(--color-gold)', cursor: 'pointer' }}
                    />
                    <label htmlFor="sales_open" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text)', cursor: 'pointer', fontWeight: 500 }}>
                        Sales open (purchasable) — uncheck to show "Coming soon"
                    </label>
                </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-5)', justifyContent: 'flex-end' }}>
                <button className="btn btn--ghost" onClick={onCancel} disabled={saving}>
                    <X size={14} /> Cancel
                </button>
                <button
                    className="btn btn--primary"
                    onClick={() => onSave(f)}
                    disabled={saving || !f.name.trim()}
                >
                    <Save size={14} />
                    {saving ? 'Saving…' : 'Save ticket type'}
                </button>
            </div>
        </div>
    );
}

// ─── Ticket card (display) ─────────────────────────────────────
function TicketCard({
    tt,
    onEdit,
    onDelete,
}: {
    tt: TicketType;
    onEdit: () => void;
    onDelete: () => void;
}) {
    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: '24px 1fr auto',
            gap: 'var(--space-4)',
            alignItems: 'center',
            background: 'var(--color-surface)',
            border: `1px solid ${tt.is_active ? 'var(--color-border)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-4) var(--space-5)',
            opacity: tt.is_active ? 1 : 0.5,
            transition: 'opacity var(--transition-fast)',
        }}>
            {/* Drag handle (visual only) */}
            <GripVertical size={16} style={{ color: 'var(--color-text-faint)', cursor: 'grab' }} />

            {/* Info */}
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: 'var(--text-base)' }}>
                        {tt.name}
                    </span>
                    {formatPrice(tt)}
                    {visibilityBadge(tt.visibility_mode)}
                    {!tt.is_active && <span className="badge badge--default">Inactive</span>}
                    {tt.is_active && !tt.sales_open && <span className="badge badge--gold">Coming soon</span>}
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                    {tt.description && (
                        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                            {tt.description}
                        </span>
                    )}
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>
                        {tt.max_quantity ? `${tt.max_quantity} spots` : '∞ unlimited'}
                    </span>
                </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button className="btn btn--ghost btn--sm" onClick={onEdit} title="Edit">
                    <Edit2 size={14} />
                </button>
                <button
                    className="btn btn--ghost btn--sm"
                    style={{ color: 'var(--color-error)' }}
                    onClick={onDelete}
                    title="Delete"
                >
                    <Trash2 size={14} />
                </button>
            </div>
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────
export default function AdminEventDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const qc = useQueryClient();

    const [editingId, setEditingId] = useState<string | null>(null);
    const [addingNew, setAddingNew] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [editingEvent, setEditingEvent] = useState(false);
    const [eventForm, setEventForm] = useState<EventEditForm>({
        title: '', slug: '', description: '', start_date: '', end_date: '',
        timezone: 'Europe/Madrid', venue_name: '', city: '', country: 'ES',
        address: '', is_hybrid: false, stream_url: '', max_capacity: '', og_image: '',
    });
    const setEF = (k: keyof EventEditForm, v: string | boolean) =>
        setEventForm(f => ({ ...f, [k]: v }));

    // ── Toggle event status ──
    const statusMutation = useMutation({
        mutationFn: async (newStatus: 'draft' | 'published' | 'cancelled' | 'past') => {
            const { error } = await supabase
                .from('events')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', id!);
            if (error) throw error;
        },
        onSuccess: (_, newStatus) => {
            qc.invalidateQueries({ queryKey: ['admin-event', id] });
            qc.invalidateQueries({ queryKey: ['admin-events'] });
            toast.success(`Event ${newStatus === 'published' ? 'published ✓' : `set to ${newStatus}`}`);
        },
        onError: (err: any) => toast.error(`Failed to update status: ${err.message}`),
    });

    // ── Fetch event ──
    const { data: event, isLoading: eventLoading } = useQuery({
        queryKey: ['admin-event', id],
        enabled: !!id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .eq('id', id!)
                .single();
            if (error) throw error;
            return data;
        },
    });

    // ── Sync edit form when event loads ──
    useEffect(() => {
        if (!event) return;
        setEventForm({
            title:        event.title ?? '',
            slug:         event.slug ?? '',
            description:  event.description ?? '',
            start_date:   event.start_date ? (event.start_date as string).slice(0, 16) : '',
            end_date:     event.end_date   ? (event.end_date   as string).slice(0, 16) : '',
            timezone:     event.timezone   ?? 'Europe/Madrid',
            venue_name:   event.venue_name ?? '',
            city:         event.city       ?? '',
            country:      event.country    ?? 'ES',
            address:      event.address    ?? '',
            is_hybrid:    event.is_hybrid  ?? false,
            stream_url:   event.stream_url ?? '',
            max_capacity: event.max_capacity ? String(event.max_capacity) : '',
            og_image:     event.og_image   ?? '',
        });
    }, [event]);

    // ── Update event ──
    const updateEventMutation = useMutation({
        mutationFn: async (f: EventEditForm) => {
            const { error } = await supabase
                .from('events')
                .update({
                    title:        f.title,
                    slug:         f.slug || slugify(f.title),
                    description:  f.description,
                    start_date:   f.start_date,
                    end_date:     f.end_date || f.start_date,
                    timezone:     f.timezone,
                    venue_name:   f.venue_name,
                    city:         f.city,
                    country:      f.country,
                    address:      f.address || null,
                    is_hybrid:    f.is_hybrid,
                    stream_url:   f.stream_url || null,
                    max_capacity: f.max_capacity ? Number(f.max_capacity) : null,
                    og_image:     f.og_image || null,
                    updated_at:   new Date().toISOString(),
                })
                .eq('id', id!);
            if (error) throw error;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin-event', id] });
            qc.invalidateQueries({ queryKey: ['admin-events'] });
            setEditingEvent(false);
            toast.success('Event updated ✓');
        },
        onError: (err: any) => toast.error(`Failed to update: ${err.message}`),
    });

    // ── Fetch ticket types ──
    const { data: ticketTypes = [], isLoading: ttLoading } = useQuery({
        queryKey: ['ticket-types', id],
        enabled: !!id,
        queryFn: async () => {
            const { data } = await supabase
                .from('ticket_types')
                .select('*')
                .eq('event_id', id!)
                .order('sort_order')
                .order('created_at');
            return (data ?? []) as TicketType[];
        },
    });

    // ── Create ticket type ──
    const createMutation = useMutation({
        mutationFn: async (f: TicketForm) => {
            const { error } = await supabase.from('ticket_types').insert({
                event_id: id!,
                name: f.name.trim(),
                description: f.description.trim() || null,
                is_free: f.is_free,
                price: f.is_free ? 0 : Number(f.price),
                currency: f.currency,
                max_quantity: f.max_quantity ? Number(f.max_quantity) : null,
                visibility_mode: f.visibility_mode,
                sort_order: Number(f.sort_order) || 0,
                is_active: f.is_active,
                sales_open: f.sales_open,
                is_hidden: f.visibility_mode === 'HIDDEN',
                perks: [],
            });
            if (error) throw error;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['ticket-types', id] });
            setAddingNew(false);
        },
    });

    // ── Update ticket type ──
    const updateMutation = useMutation({
        mutationFn: async ({ ttId, f }: { ttId: string; f: TicketForm }) => {
            const { error } = await supabase.from('ticket_types').update({
                name: f.name.trim(),
                description: f.description.trim() || null,
                is_free: f.is_free,
                price: f.is_free ? 0 : Number(f.price),
                currency: f.currency,
                max_quantity: f.max_quantity ? Number(f.max_quantity) : null,
                visibility_mode: f.visibility_mode,
                sort_order: Number(f.sort_order) || 0,
                is_active: f.is_active,
                sales_open: f.sales_open,
                is_hidden: f.visibility_mode === 'HIDDEN',
            }).eq('id', ttId);
            if (error) throw error;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['ticket-types', id] });
            setEditingId(null);
        },
    });

    // ── Delete ticket type ──
    const deleteMutation = useMutation({
        mutationFn: async (ttId: string) => {
            const { error } = await supabase.from('ticket_types').delete().eq('id', ttId);
            if (error) throw error;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['ticket-types', id] });
            setDeleteConfirm(null);
        },
    });

    const toForm = (tt: TicketType): TicketForm => ({
        name: tt.name,
        description: tt.description ?? '',
        is_free: tt.is_free,
        price: String(tt.price),
        currency: tt.currency,
        max_quantity: tt.max_quantity ? String(tt.max_quantity) : '',
        visibility_mode: tt.visibility_mode,
        sort_order: String(tt.sort_order),
        is_active: tt.is_active,
        sales_open: tt.sales_open,
    });

    // ── Speakers ─────────────────────────────────────────────────
    const [speakerPanel, setSpeakerPanel] = useState<null | 'new' | string>(null);
    const [speakerForm, setSpeakerForm] = useState<SpeakerForm>(emptySpeaker());
    const setS = (k: keyof SpeakerForm, v: string) => setSpeakerForm(f => ({ ...f, [k]: v }));

    const { data: speakers = [] } = useQuery({
        queryKey: ['event-speakers', id],
        enabled: !!id,
        queryFn: async () => {
            const { data } = await supabase.from('speakers').select('*').eq('event_id', id!).order('order_index');
            return (data ?? []) as SpeakerRow[];
        },
    });

    const saveSpeakerMutation = useMutation({
        mutationFn: async () => {
            const payload = {
                event_id: id!,
                name: speakerForm.name.trim(),
                role: speakerForm.role.trim() || null,
                company: speakerForm.company.trim() || null,
                bio: speakerForm.bio.trim() || null,
                photo: speakerForm.photo.trim() || null,
                twitter: speakerForm.twitter.trim() || null,
                linkedin: speakerForm.linkedin.trim() || null,
                order_index: Number(speakerForm.order_index) || 0,
            };
            if (speakerPanel === 'new') {
                const { error } = await supabase.from('speakers').insert(payload);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('speakers').update(payload).eq('id', speakerPanel!);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['event-speakers', id] });
            qc.invalidateQueries({ queryKey: ['speakers', id] });
            setSpeakerPanel(null);
            toast.success(speakerPanel === 'new' ? 'Speaker added ✓' : 'Speaker updated ✓');
        },
        onError: (err: any) => toast.error(err.message),
    });

    const deleteSpeakerMutation = useMutation({
        mutationFn: async (sid: string) => {
            const { error } = await supabase.from('speakers').delete().eq('id', sid);
            if (error) throw error;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['event-speakers', id] });
            qc.invalidateQueries({ queryKey: ['speakers', id] });
        },
        onError: (err: any) => toast.error(err.message),
    });

    const openEditSpeaker = (s: SpeakerRow) => {
        setSpeakerForm({
            name: s.name, role: s.role ?? '', company: s.company ?? '',
            bio: s.bio ?? '', photo: s.photo ?? '',
            twitter: s.twitter ?? '', linkedin: s.linkedin ?? '',
            order_index: String(s.order_index),
        });
        setSpeakerPanel(s.id);
    };

    // ── Sponsors ──────────────────────────────────────────────────
    const [sponsorPanel, setSponsorPanel] = useState<null | 'new' | string>(null);
    const [sponsorForm, setSponsorForm] = useState<SponsorForm>(emptySponsor());
    const setSP = (k: keyof SponsorForm, v: string) => setSponsorForm(f => ({ ...f, [k]: v }));

    const { data: sponsors = [] } = useQuery({
        queryKey: ['event-sponsors', id],
        enabled: !!id,
        queryFn: async () => {
            const { data } = await supabase.from('sponsors').select('*').eq('event_id', id!).order('tier').order('name');
            return (data ?? []) as SponsorRow[];
        },
    });

    const saveSponsorMutation = useMutation({
        mutationFn: async () => {
            const payload = {
                event_id: id!,
                name: sponsorForm.name.trim(),
                tier: sponsorForm.tier,
                website: sponsorForm.website.trim() || null,
                logo: sponsorForm.logo.trim() || null,
                description: sponsorForm.description.trim() || null,
                contact_email: sponsorForm.contact_email.trim() || null,
            };
            if (sponsorPanel === 'new') {
                const { error } = await supabase.from('sponsors').insert(payload);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('sponsors').update(payload).eq('id', sponsorPanel!);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['event-sponsors', id] });
            qc.invalidateQueries({ queryKey: ['sponsors', id] });
            setSponsorPanel(null);
            toast.success(sponsorPanel === 'new' ? 'Sponsor added ✓' : 'Sponsor updated ✓');
        },
        onError: (err: any) => toast.error(err.message),
    });

    const deleteSponsorMutation = useMutation({
        mutationFn: async (sid: string) => {
            const { error } = await supabase.from('sponsors').delete().eq('id', sid);
            if (error) throw error;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['event-sponsors', id] });
            qc.invalidateQueries({ queryKey: ['sponsors', id] });
        },
        onError: (err: any) => toast.error(err.message),
    });

    const openEditSponsor = (s: SponsorRow) => {
        setSponsorForm({
            name: s.name, tier: s.tier, website: s.website ?? '',
            logo: s.logo ?? '', description: s.description ?? '',
            contact_email: s.contact_email ?? '',
        });
        setSponsorPanel(s.id);
    };

    // ── Agenda ────────────────────────────────────────────────────
    const [agendaEditing, setAgendaEditing] = useState(false);
    const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);

    // Sync agenda from event when loaded / when edit opens
    const openAgenda = () => {
        const items: AgendaItem[] = Array.isArray(event?.agenda)
            ? (event.agenda as any[]).map((a: any) => ({
                time: a.time ?? '', title: a.title ?? '',
                speaker: a.speaker ?? '', description: a.description ?? '',
            }))
            : [];
        setAgendaItems(items);
        setAgendaEditing(true);
    };

    const saveAgendaMutation = useMutation({
        mutationFn: async () => {
            const cleaned = agendaItems
                .filter(a => a.title.trim())
                .map(a => ({
                    time: a.time.trim(),
                    title: a.title.trim(),
                    speaker: a.speaker.trim() || undefined,
                    description: a.description.trim() || undefined,
                }));
            const { error } = await supabase
                .from('events')
                .update({ agenda: cleaned, updated_at: new Date().toISOString() })
                .eq('id', id!);
            if (error) throw error;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin-event', id] });
            setAgendaEditing(false);
            toast.success('Agenda saved ✓');
        },
        onError: (err: any) => toast.error(err.message),
    });

    if (eventLoading) {
        return <p className="text-muted" style={{ padding: 'var(--space-8)' }}>{t('common.loading', 'Loading…')}</p>;
    }

    if (!event) {
        return (
            <div style={{ padding: 'var(--space-8)' }}>
                <p className="text-muted">Event not found.</p>
                <Link to="/admin/events" className="btn btn--ghost btn--sm" style={{ marginTop: 'var(--space-4)' }}>
                    <ArrowLeft size={14} /> Back to Events
                </Link>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 800 }}>
            {/* ── Header ── */}
            <div className="admin-page-header">
                <div>
                    <button
                        className="btn btn--ghost btn--sm"
                        style={{ marginBottom: 'var(--space-2)' }}
                        onClick={() => navigate('/admin/events')}
                    >
                        <ArrowLeft size={14} /> {t('common.back', 'Back')}
                    </button>
                    <h1 className="admin-page-title" style={{ margin: 0 }}>{event.title}</h1>
                </div>
                <select
                    className="form-input"
                    value={event.status}
                    disabled={statusMutation.isPending}
                    onChange={e => statusMutation.mutate(e.target.value as 'draft' | 'published' | 'cancelled' | 'past')}
                    style={{ width: 140, fontWeight: 600, color: event.status === 'published' ? 'var(--color-success)' : 'var(--color-text-muted)' }}
                >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="past">Past</option>
                </select>
            </div>

            {/* ── Event summary strip ── */}
            <div className="card" style={{
                padding: 'var(--space-4) var(--space-6)',
                marginBottom: editingEvent ? 0 : 'var(--space-6)',
                display: 'flex',
                gap: 'var(--space-8)',
                flexWrap: 'wrap',
                alignItems: 'center',
                borderBottomLeftRadius: editingEvent ? 0 : undefined,
                borderBottomRightRadius: editingEvent ? 0 : undefined,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                    <Calendar size={14} style={{ color: 'var(--color-gold)' }} />
                    {event.start_date ? format(new Date(event.start_date), 'MMM d, yyyy') : '—'}
                    {event.end_date ? ` → ${format(new Date(event.end_date), 'MMM d, yyyy')}` : ''}
                </div>
                {(event.venue_name || event.city) && (
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                        📍 {[event.venue_name, event.city, event.country].filter(Boolean).join(', ')}
                    </span>
                )}
                {event.max_capacity && (
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                        <Users size={13} style={{ display: 'inline', marginRight: 4 }} />
                        {event.max_capacity} capacity
                    </span>
                )}
                <button
                    className="btn btn--ghost btn--sm"
                    style={{ marginLeft: 'auto' }}
                    onClick={() => setEditingEvent(v => !v)}
                >
                    <Pencil size={13} /> {editingEvent ? 'Cancel edit' : 'Edit event'}
                </button>
            </div>

            {/* ── Inline event edit form ── */}
            {editingEvent && (
                <div className="card" style={{
                    padding: 'var(--space-6)',
                    marginBottom: 'var(--space-6)',
                    borderTop: '1px solid var(--color-gold)',
                    borderTopLeftRadius: 0,
                    borderTopRightRadius: 0,
                }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                        {/* Title */}
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label className="form-label">Title *</label>
                            <input className="form-input" style={{ width: '100%' }} value={eventForm.title} onChange={e => setEF('title', e.target.value)} />
                        </div>
                        {/* Slug */}
                        <div>
                            <label className="form-label">
                                URL Slug
                                {!eventForm.slug && (
                                    <span style={{ color: 'var(--color-warning)', marginLeft: 6, fontWeight: 400 }}>
                                        (auto-generated from title on save)
                                    </span>
                                )}
                            </label>
                            <input className="form-input" style={{ width: '100%' }} placeholder={slugify(eventForm.title) || 'e.g. sqx-summit-2025'} value={eventForm.slug} onChange={e => setEF('slug', e.target.value)} />
                        </div>
                        {/* Hero image */}
                        <div>
                            <label className="form-label">Hero Image URL</label>
                            <input className="form-input" style={{ width: '100%' }} placeholder="https://..." value={eventForm.og_image} onChange={e => setEF('og_image', e.target.value)} />
                        </div>
                        {/* Description */}
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label className="form-label">Description</label>
                            <textarea className="form-input" rows={4} style={{ width: '100%', resize: 'vertical' }} value={eventForm.description} onChange={e => setEF('description', e.target.value)} />
                        </div>
                        {/* Start date */}
                        <div>
                            <label className="form-label">Start Date & Time *</label>
                            <input className="form-input" type="datetime-local" style={{ width: '100%' }} value={eventForm.start_date} onChange={e => setEF('start_date', e.target.value)} />
                        </div>
                        {/* End date */}
                        <div>
                            <label className="form-label">End Date & Time</label>
                            <input className="form-input" type="datetime-local" style={{ width: '100%' }} value={eventForm.end_date} onChange={e => setEF('end_date', e.target.value)} />
                        </div>
                        {/* Timezone */}
                        <div>
                            <label className="form-label">Timezone</label>
                            <select className="form-input" style={{ width: '100%' }} value={eventForm.timezone} onChange={e => setEF('timezone', e.target.value)}>
                                {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                            </select>
                        </div>
                        {/* Capacity */}
                        <div>
                            <label className="form-label">Capacity</label>
                            <input className="form-input" type="number" style={{ width: '100%' }} placeholder="∞" value={eventForm.max_capacity} onChange={e => setEF('max_capacity', e.target.value)} />
                        </div>
                        {/* Venue */}
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label className="form-label">Venue Name</label>
                            <input className="form-input" style={{ width: '100%' }} value={eventForm.venue_name} onChange={e => setEF('venue_name', e.target.value)} />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label className="form-label">Address</label>
                            <input className="form-input" style={{ width: '100%' }} value={eventForm.address} onChange={e => setEF('address', e.target.value)} />
                        </div>
                        <div>
                            <label className="form-label">City</label>
                            <input className="form-input" style={{ width: '100%' }} value={eventForm.city} onChange={e => setEF('city', e.target.value)} />
                        </div>
                        <div>
                            <label className="form-label">Country Code</label>
                            <input className="form-input" style={{ width: '100%' }} placeholder="ES" value={eventForm.country} onChange={e => setEF('country', e.target.value)} />
                        </div>
                        {/* Hybrid */}
                        <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <input id="ev_hybrid" type="checkbox" checked={eventForm.is_hybrid} onChange={e => setEF('is_hybrid', e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--color-gold)' }} />
                            <label htmlFor="ev_hybrid" style={{ fontSize: 'var(--text-sm)', fontWeight: 500, cursor: 'pointer' }}>Hybrid event (has online component)</label>
                        </div>
                        {eventForm.is_hybrid && (
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label className="form-label">Stream URL</label>
                                <input className="form-input" style={{ width: '100%' }} placeholder="https://youtube.com/live/..." value={eventForm.stream_url} onChange={e => setEF('stream_url', e.target.value)} />
                            </div>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-5)', justifyContent: 'flex-end' }}>
                        <button className="btn btn--ghost" onClick={() => setEditingEvent(false)} disabled={updateEventMutation.isPending}>
                            <X size={14} /> Cancel
                        </button>
                        <button
                            className="btn btn--primary"
                            onClick={() => updateEventMutation.mutate(eventForm)}
                            disabled={updateEventMutation.isPending || !eventForm.title}
                        >
                            <Save size={14} /> {updateEventMutation.isPending ? 'Saving…' : 'Save changes'}
                        </button>
                    </div>
                </div>
            )}

            {/* ── Ticket Types section ── */}
            <div>
                {/* Section header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text)' }}>
                        <Ticket size={18} style={{ color: 'var(--color-gold)' }} />
                        Ticket Types
                        {ticketTypes.length > 0 && (
                            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', fontWeight: 400 }}>
                                ({ticketTypes.length})
                            </span>
                        )}
                    </h2>
                    {!addingNew && (
                        <button
                            className="btn btn--primary btn--sm"
                            onClick={() => { setAddingNew(true); setEditingId(null); }}
                        >
                            <Plus size={14} /> Add ticket type
                        </button>
                    )}
                </div>

                {/* New ticket form */}
                {addingNew && (
                    <div style={{ marginBottom: 'var(--space-4)' }}>
                        <TicketForm
                            initial={emptyTicketForm(ticketTypes.length)}
                            onSave={f => createMutation.mutate(f)}
                            onCancel={() => setAddingNew(false)}
                            saving={createMutation.isPending}
                        />
                    </div>
                )}

                {/* Loading */}
                {ttLoading && (
                    <p className="text-muted" style={{ padding: 'var(--space-4)' }}>{t('common.loading', 'Loading…')}</p>
                )}

                {/* Empty state */}
                {!ttLoading && ticketTypes.length === 0 && !addingNew && (
                    <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
                        <Ticket size={40} style={{ color: 'var(--color-text-faint)', marginBottom: 'var(--space-3)' }} />
                        <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
                            No ticket types yet. Add your first one.
                        </p>
                        <button className="btn btn--primary" onClick={() => setAddingNew(true)}>
                            <Plus size={15} /> Add ticket type
                        </button>
                    </div>
                )}

                {/* Ticket type list */}
                {!ttLoading && ticketTypes.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                        {ticketTypes.map(tt => (
                            <div key={tt.id}>
                                {editingId === tt.id ? (
                                    <TicketForm
                                        initial={toForm(tt)}
                                        onSave={f => updateMutation.mutate({ ttId: tt.id, f })}
                                        onCancel={() => setEditingId(null)}
                                        saving={updateMutation.isPending}
                                    />
                                ) : deleteConfirm === tt.id ? (
                                    /* Delete confirmation */
                                    <div style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
                                        borderRadius: 'var(--radius-md)', padding: 'var(--space-4) var(--space-5)',
                                    }}>
                                        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-error)' }}>
                                            Delete <strong>{tt.name}</strong>? This cannot be undone.
                                        </span>
                                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                            <button className="btn btn--ghost btn--sm" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                                            <button
                                                className="btn btn--sm"
                                                style={{ background: 'var(--color-error)', color: '#fff' }}
                                                onClick={() => deleteMutation.mutate(tt.id)}
                                                disabled={deleteMutation.isPending}
                                            >
                                                <Trash2 size={13} /> Delete
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <TicketCard
                                        tt={tt}
                                        onEdit={() => { setEditingId(tt.id); setAddingNew(false); }}
                                        onDelete={() => setDeleteConfirm(tt.id)}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Stats footer */}
                {ticketTypes.length > 0 && (
                    <div style={{
                        marginTop: 'var(--space-5)',
                        display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap',
                        padding: 'var(--space-4) var(--space-5)',
                        background: 'var(--color-surface)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                        fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)',
                    }}>
                        <span>
                            <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>
                                {ticketTypes.filter(t => t.is_active).length}
                            </span> active
                        </span>
                        <span>
                            <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                                {ticketTypes.filter(t => t.is_free).length}
                            </span> free
                        </span>
                        <span>
                            <span style={{ color: 'var(--color-gold)', fontWeight: 600 }}>
                                {ticketTypes.filter(t => !t.is_free).length}
                            </span> paid
                        </span>
                        {ticketTypes.some(t => t.max_quantity) && (
                            <span>
                                <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>
                                    {ticketTypes.reduce((s, t) => s + (t.max_quantity ?? 0), 0)}
                                </span> total spots
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* ══════════════════════════════════════════════════════
                SPEAKERS SECTION
            ══════════════════════════════════════════════════════ */}
            <div style={{ marginTop: 'var(--space-10)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text)' }}>
                        <Mic size={18} style={{ color: 'var(--color-gold)' }} />
                        Speakers
                        {speakers.length > 0 && (
                            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', fontWeight: 400 }}>({speakers.length})</span>
                        )}
                    </h2>
                    {speakerPanel !== 'new' && (
                        <button className="btn btn--primary btn--sm" onClick={() => { setSpeakerForm(emptySpeaker()); setSpeakerPanel('new'); }}>
                            <Plus size={14} /> Add speaker
                        </button>
                    )}
                </div>

                {/* Inline form (new or edit) */}
                {speakerPanel !== null && (
                    <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-gold)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)', marginBottom: 'var(--space-4)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label className="form-label">Name *</label>
                                <input className="form-input" style={{ width: '100%' }} value={speakerForm.name} onChange={e => setS('name', e.target.value)} autoFocus />
                            </div>
                            <div>
                                <label className="form-label">Role / Job title</label>
                                <input className="form-input" style={{ width: '100%' }} placeholder="e.g. Algo Trader" value={speakerForm.role} onChange={e => setS('role', e.target.value)} />
                            </div>
                            <div>
                                <label className="form-label">Company</label>
                                <input className="form-input" style={{ width: '100%' }} value={speakerForm.company} onChange={e => setS('company', e.target.value)} />
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label className="form-label">Bio</label>
                                <textarea className="form-input" rows={3} style={{ width: '100%', resize: 'vertical' }} value={speakerForm.bio} onChange={e => setS('bio', e.target.value)} />
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label className="form-label">Photo URL</label>
                                <input className="form-input" style={{ width: '100%' }} placeholder="https://..." value={speakerForm.photo} onChange={e => setS('photo', e.target.value)} />
                            </div>
                            <div>
                                <label className="form-label">Twitter / X handle</label>
                                <input className="form-input" style={{ width: '100%' }} placeholder="@handle" value={speakerForm.twitter} onChange={e => setS('twitter', e.target.value)} />
                            </div>
                            <div>
                                <label className="form-label">LinkedIn URL</label>
                                <input className="form-input" style={{ width: '100%' }} placeholder="https://linkedin.com/in/..." value={speakerForm.linkedin} onChange={e => setS('linkedin', e.target.value)} />
                            </div>
                            <div>
                                <label className="form-label">Order</label>
                                <input className="form-input" type="number" style={{ width: '100%' }} value={speakerForm.order_index} onChange={e => setS('order_index', e.target.value)} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-5)', justifyContent: 'flex-end' }}>
                            <button className="btn btn--ghost" onClick={() => setSpeakerPanel(null)}>
                                <X size={14} /> Cancel
                            </button>
                            <button
                                className="btn btn--primary"
                                onClick={() => saveSpeakerMutation.mutate()}
                                disabled={saveSpeakerMutation.isPending || !speakerForm.name.trim()}
                            >
                                <Save size={14} /> {saveSpeakerMutation.isPending ? 'Saving…' : 'Save speaker'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Speakers list */}
                {speakers.length === 0 && speakerPanel === null && (
                    <div className="card" style={{ textAlign: 'center', padding: 'var(--space-10)', color: 'var(--color-text-muted)' }}>
                        <Mic size={32} style={{ color: 'var(--color-text-faint)', marginBottom: 'var(--space-3)' }} />
                        <p>No speakers yet. Add the first one.</p>
                    </div>
                )}
                {speakers.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                        {speakers.map(s => (
                            <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '40px 1fr auto', gap: 'var(--space-4)', alignItems: 'center', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-5)' }}>
                                {s.photo
                                    ? <img src={s.photo} alt={s.name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                                    : <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--color-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--color-gold)', fontSize: 'var(--text-lg)' }}>{s.name[0]}</div>
                                }
                                <div>
                                    <p style={{ fontWeight: 600, color: 'var(--color-text)', marginBottom: 2 }}>{s.name}</p>
                                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                                        {[s.role, s.company].filter(Boolean).join(' · ')}
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                    <button className="btn btn--ghost btn--sm" onClick={() => openEditSpeaker(s)}><Edit2 size={14} /></button>
                                    <button className="btn btn--ghost btn--sm" style={{ color: 'var(--color-error)' }} onClick={() => { if (confirm(`Delete ${s.name}?`)) deleteSpeakerMutation.mutate(s.id); }}><Trash2 size={14} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ══════════════════════════════════════════════════════
                SPONSORS SECTION
            ══════════════════════════════════════════════════════ */}
            <div style={{ marginTop: 'var(--space-10)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text)' }}>
                        <Building2 size={18} style={{ color: 'var(--color-gold)' }} />
                        Sponsors
                        {sponsors.length > 0 && (
                            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', fontWeight: 400 }}>({sponsors.length})</span>
                        )}
                    </h2>
                    {sponsorPanel !== 'new' && (
                        <button className="btn btn--primary btn--sm" onClick={() => { setSponsorForm(emptySponsor()); setSponsorPanel('new'); }}>
                            <Plus size={14} /> Add sponsor
                        </button>
                    )}
                </div>

                {/* Inline form */}
                {sponsorPanel !== null && (
                    <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-gold)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)', marginBottom: 'var(--space-4)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label className="form-label">Company name *</label>
                                <input className="form-input" style={{ width: '100%' }} value={sponsorForm.name} onChange={e => setSP('name', e.target.value)} autoFocus />
                            </div>
                            <div>
                                <label className="form-label">Tier</label>
                                <select className="form-input" style={{ width: '100%' }} value={sponsorForm.tier} onChange={e => setSP('tier', e.target.value)}>
                                    {SPONSOR_TIERS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="form-label">Website URL</label>
                                <input className="form-input" style={{ width: '100%' }} placeholder="https://..." value={sponsorForm.website} onChange={e => setSP('website', e.target.value)} />
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label className="form-label">Logo URL</label>
                                <input className="form-input" style={{ width: '100%' }} placeholder="https://..." value={sponsorForm.logo} onChange={e => setSP('logo', e.target.value)} />
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label className="form-label">Description</label>
                                <textarea className="form-input" rows={2} style={{ width: '100%', resize: 'vertical' }} value={sponsorForm.description} onChange={e => setSP('description', e.target.value)} />
                            </div>
                            <div>
                                <label className="form-label">Contact email</label>
                                <input className="form-input" style={{ width: '100%' }} type="email" value={sponsorForm.contact_email} onChange={e => setSP('contact_email', e.target.value)} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-5)', justifyContent: 'flex-end' }}>
                            <button className="btn btn--ghost" onClick={() => setSponsorPanel(null)}><X size={14} /> Cancel</button>
                            <button
                                className="btn btn--primary"
                                onClick={() => saveSponsorMutation.mutate()}
                                disabled={saveSponsorMutation.isPending || !sponsorForm.name.trim()}
                            >
                                <Save size={14} /> {saveSponsorMutation.isPending ? 'Saving…' : 'Save sponsor'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Sponsors list */}
                {sponsors.length === 0 && sponsorPanel === null && (
                    <div className="card" style={{ textAlign: 'center', padding: 'var(--space-10)', color: 'var(--color-text-muted)' }}>
                        <Building2 size={32} style={{ color: 'var(--color-text-faint)', marginBottom: 'var(--space-3)' }} />
                        <p>No sponsors yet. Add the first one.</p>
                    </div>
                )}
                {sponsors.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                        {sponsors.map(s => (
                            <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '50px 1fr auto', gap: 'var(--space-4)', alignItems: 'center', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-5)' }}>
                                {s.logo
                                    ? <img src={s.logo} alt={s.name} style={{ width: 50, height: 30, objectFit: 'contain' }} />
                                    : <div style={{ width: 50, height: 30, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--color-text-faint)' }}>logo</div>
                                }
                                <div>
                                    <p style={{ fontWeight: 600, color: 'var(--color-text)', marginBottom: 2 }}>{s.name}</p>
                                    <span className="badge badge--default" style={{ textTransform: 'capitalize', fontSize: 11 }}>{s.tier}</span>
                                </div>
                                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                    <button className="btn btn--ghost btn--sm" onClick={() => openEditSponsor(s)}><Edit2 size={14} /></button>
                                    <button className="btn btn--ghost btn--sm" style={{ color: 'var(--color-error)' }} onClick={() => { if (confirm(`Delete ${s.name}?`)) deleteSponsorMutation.mutate(s.id); }}><Trash2 size={14} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ══════════════════════════════════════════════════════
                AGENDA SECTION
            ══════════════════════════════════════════════════════ */}
            <div style={{ marginTop: 'var(--space-10)', marginBottom: 'var(--space-12)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text)' }}>
                        <List size={18} style={{ color: 'var(--color-gold)' }} />
                        Agenda
                        {Array.isArray(event?.agenda) && event.agenda.length > 0 && (
                            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', fontWeight: 400 }}>({(event.agenda as any[]).length} items)</span>
                        )}
                    </h2>
                    {!agendaEditing && (
                        <button className="btn btn--primary btn--sm" onClick={openAgenda}>
                            <Pencil size={14} /> {Array.isArray(event?.agenda) && (event.agenda as any[]).length > 0 ? 'Edit agenda' : 'Add agenda'}
                        </button>
                    )}
                </div>

                {/* Agenda editor */}
                {agendaEditing && (
                    <div className="card" style={{ padding: 'var(--space-6)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                            {agendaItems.map((item, i) => (
                                <div key={i} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 1fr auto', gap: 'var(--space-3)', alignItems: 'center' }}>
                                    <input
                                        className="form-input"
                                        placeholder="10:00"
                                        value={item.time}
                                        onChange={e => setAgendaItems(prev => prev.map((a, j) => j === i ? { ...a, time: e.target.value } : a))}
                                    />
                                    <input
                                        className="form-input"
                                        placeholder="Session title *"
                                        value={item.title}
                                        onChange={e => setAgendaItems(prev => prev.map((a, j) => j === i ? { ...a, title: e.target.value } : a))}
                                    />
                                    <input
                                        className="form-input"
                                        placeholder="Speaker (optional)"
                                        value={item.speaker}
                                        onChange={e => setAgendaItems(prev => prev.map((a, j) => j === i ? { ...a, speaker: e.target.value } : a))}
                                    />
                                    <input
                                        className="form-input"
                                        placeholder="Description (optional)"
                                        value={item.description}
                                        onChange={e => setAgendaItems(prev => prev.map((a, j) => j === i ? { ...a, description: e.target.value } : a))}
                                    />
                                    <button
                                        className="btn btn--ghost btn--sm"
                                        style={{ color: 'var(--color-error)' }}
                                        onClick={() => setAgendaItems(prev => prev.filter((_, j) => j !== i))}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
                            <button
                                className="btn btn--ghost btn--sm"
                                onClick={() => setAgendaItems(prev => [...prev, { time: '', title: '', speaker: '', description: '' }])}
                            >
                                <Plus size={14} /> Add row
                            </button>
                            <div style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--space-3)' }}>
                                <button className="btn btn--ghost" onClick={() => setAgendaEditing(false)}><X size={14} /> Cancel</button>
                                <button
                                    className="btn btn--primary"
                                    onClick={() => saveAgendaMutation.mutate()}
                                    disabled={saveAgendaMutation.isPending}
                                >
                                    <Save size={14} /> {saveAgendaMutation.isPending ? 'Saving…' : 'Save agenda'}
                                </button>
                            </div>
                        </div>
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', marginTop: 'var(--space-3)' }}>
                            Columns: Time · Title · Speaker · Description. Rows with empty title will be ignored.
                        </p>
                    </div>
                )}

                {/* Agenda preview (read mode) */}
                {!agendaEditing && Array.isArray(event?.agenda) && (event.agenda as any[]).length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                        {(event.agenda as any[]).map((item: any, i: number) => (
                            <div key={i} style={{ display: 'flex', gap: 'var(--space-5)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-5)' }}>
                                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gold)', fontWeight: 600, minWidth: 60 }}>{item.time}</span>
                                <div>
                                    <p style={{ fontWeight: 600, color: 'var(--color-text)' }}>{item.title}</p>
                                    {item.speaker && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>{item.speaker}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!agendaEditing && (!Array.isArray(event?.agenda) || (event.agenda as any[]).length === 0) && (
                    <div className="card" style={{ textAlign: 'center', padding: 'var(--space-10)', color: 'var(--color-text-muted)' }}>
                        <List size={32} style={{ color: 'var(--color-text-faint)', marginBottom: 'var(--space-3)' }} />
                        <p>No agenda yet. Add sessions to show attendees the schedule.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
