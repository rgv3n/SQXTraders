import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft, Plus, Ticket, Trash2, Edit2, Save, X,
    EyeOff, Lock, Globe, Users,
    GripVertical, Calendar, Pencil,
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
        </div>
    );
}
