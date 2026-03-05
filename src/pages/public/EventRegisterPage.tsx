import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
    ArrowLeft, Tag, CheckCircle, XCircle, Loader2,
    User, Mail, Phone, Building2, Briefcase, Lock,
    CreditCard, Ticket, AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/i18n/TranslationProvider';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

// ─── Types ────────────────────────────────────────────────────
interface TicketType {
    id: string;
    event_id: string;
    name: string;
    description: string | null;
    price: number;
    currency: string;
    is_free: boolean;
    max_quantity: number | null;
    sort_order: number;
    is_active: boolean;
}

interface Voucher {
    id: string;
    code: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    currency: string;
    is_active: boolean;
    valid_from: string | null;
    valid_until: string | null;
    max_uses: number | null;
    uses_count: number;
    event_id: string | null;
}

interface AttendeeForm {
    name: string;
    email: string;
    phone: string;
    company: string;
    job_title: string;
    consent: boolean;
}

type VoucherState = 'idle' | 'loading' | 'valid' | 'invalid';

// ─── Helpers ─────────────────────────────────────────────────
function isVoucherValid(v: Voucher, eventId: string): boolean {
    if (!v.is_active) return false;
    const now = new Date();
    if (v.valid_from && new Date(v.valid_from) > now) return false;
    if (v.valid_until && new Date(v.valid_until) < now) return false;
    if (v.max_uses !== null && v.uses_count >= v.max_uses) return false;
    if (v.event_id && v.event_id !== eventId) return false;
    return true;
}

function calcDiscount(price: number, voucher: Voucher): number {
    if (voucher.discount_type === 'percentage') {
        return price * (voucher.discount_value / 100);
    }
    return Math.min(price, voucher.discount_value);
}

function formatCurrency(amount: number, currency: string) {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(amount);
}


// ─── Component ───────────────────────────────────────────────
export default function EventRegisterPage() {
    const { slug } = useParams<{ slug: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user, profile, isAuthenticated } = useAuth();
    const { t } = useTranslation();

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!isAuthenticated) {
            navigate(`/auth/login`, { state: { from: `/events/${slug}/register` }, replace: true });
        }
    }, [isAuthenticated, navigate, slug]);

    const [selectedTicketId, setSelectedTicketId] = useState<string>(searchParams.get('ticket') ?? '');
    const [voucherCode, setVoucherCode] = useState('');
    const [voucherState, setVoucherState] = useState<VoucherState>('idle');
    const [voucher, setVoucher] = useState<Voucher | null>(null);
    const [voucherError, setVoucherError] = useState('');
    const [generalError, setGeneralError] = useState('');
    const [form, setForm] = useState<AttendeeForm>({
        name: profile?.display_name ?? '',
        email: user?.email ?? '',
        phone: '',
        company: '',
        job_title: '',
        consent: false,
    });

    // Pre-fill from profile when it loads
    useEffect(() => {
        setForm(f => ({
            ...f,
            name: f.name || profile?.display_name || '',
            email: f.email || user?.email || '',
        }));
    }, [profile, user]);

    // ── Fetch event ──
    const { data: event } = useQuery({
        queryKey: ['event', slug],
        enabled: !!slug,
        queryFn: async () => {
            const { data } = await supabase
                .from('events')
                .select('id, title, start_date, venue_name, city, country, slug')
                .eq('slug', slug!)
                .single();
            return data;
        },
    });

    // ── Fetch ticket types ──
    const { data: ticketTypes = [], isLoading: ttLoading } = useQuery({
        queryKey: ['ticket-types', event?.id],
        enabled: !!event?.id,
        queryFn: async () => {
            const { data } = await supabase
                .from('ticket_types')
                .select('*')
                .eq('event_id', event!.id)
                .eq('is_active', true)
                .eq('is_hidden', false)
                .order('sort_order');
            return (data ?? []) as TicketType[];
        },
    });

    // Auto-select first ticket if none pre-selected
    useEffect(() => {
        if (!selectedTicketId && ticketTypes.length > 0) {
            setSelectedTicketId(ticketTypes[0].id);
        }
    }, [ticketTypes, selectedTicketId]);

    const selectedTicket = ticketTypes.find(t => t.id === selectedTicketId) ?? null;
    const discountAmount = voucher && selectedTicket ? calcDiscount(Number(selectedTicket.price), voucher) : 0;
    const finalPrice = selectedTicket ? Math.max(0, Number(selectedTicket.price) - discountAmount) : 0;
    const isFree = !selectedTicket || selectedTicket.is_free || finalPrice === 0;

    // ── Apply voucher ──
    const handleApplyVoucher = async () => {
        if (!voucherCode.trim() || !event?.id) return;
        setVoucherState('loading');
        setVoucherError('');

        const { data: v } = await supabase
            .from('vouchers')
            .select('*')
            .eq('code', voucherCode.trim().toUpperCase())
            .maybeSingle();

        if (!v || !isVoucherValid(v, event.id)) {
            setVoucherState('invalid');
            setVoucher(null);
            setVoucherError(t('register.voucher.invalid', 'Invalid or expired voucher code.'));
        } else {
            setVoucherState('valid');
            setVoucher(v);
        }
    };

    const removeVoucher = () => {
        setVoucher(null);
        setVoucherCode('');
        setVoucherState('idle');
        setVoucherError('');
    };

    // ── Free ticket registration (client-side) ──
    const freeMutation = useMutation({
        mutationFn: async () => {
            if (!event || !selectedTicket || !user) throw new Error('Missing data');
            if (!form.consent) throw new Error(t('register.error.consent', 'You must accept the terms.'));

            // Create order
            const { data: order, error: orderErr } = await supabase
                .from('orders')
                .insert({
                    user_id: user.id,
                    event_id: event.id,
                    ticket_type_id: selectedTicket.id,
                    status: 'paid',
                    amount: 0,
                    currency: selectedTicket.currency ?? 'EUR',
                    voucher_id: voucher?.id ?? null,
                    discount_applied: 0,
                    metadata: { attendee_details: form },
                })
                .select()
                .single();

            if (orderErr || !order) throw new Error(orderErr?.message ?? 'Failed to create order');

            // Create attendee
            const { data: attendee, error: attendeeErr } = await supabase
                .from('attendees')
                .insert({
                    user_id: user.id,
                    event_id: event.id,
                    order_id: order.id,
                    ticket_type_id: selectedTicket.id,
                    name: form.name,
                    email: form.email,
                    phone: form.phone || null,
                    company: form.company || null,
                    job_title: form.job_title || null,
                    checkin_status: 'pending',
                    consent: form.consent,
                })
                .select()
                .single();

            if (attendeeErr || !attendee) throw new Error(attendeeErr?.message ?? 'Failed to create attendee');

            // Voucher redemption
            if (voucher?.id) {
                await supabase.rpc('increment_voucher_uses', { voucher_uuid: voucher.id });
                await supabase.from('voucher_redemptions').insert({
                    voucher_id: voucher.id,
                    user_id: user.id,
                    order_id: order.id,
                    attendee_id: attendee.id,
                    discount_applied: 0,
                });
            }

            return attendee;
        },
        onSuccess: (attendee) => {
            navigate(`/order/success?attendee_id=${attendee.id}&free=1`);
        },
        onError: (err: any) => {
            setGeneralError(err.message ?? 'Registration failed. Please try again.');
        },
    });

    // ── Paid ticket: call API → Stripe ──
    const paidMutation = useMutation({
        mutationFn: async () => {
            if (!event || !selectedTicket || !user) throw new Error('Missing data');
            if (!form.consent) throw new Error(t('register.error.consent', 'You must accept the terms.'));

            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;
            if (!token) throw new Error('Not authenticated');

            const resp = await fetch('/api/create-checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    event_id: event.id,
                    event_slug: event.slug,
                    ticket_type_id: selectedTicket.id,
                    voucher_code: voucher?.code ?? null,
                    attendee_details: {
                        name: form.name,
                        email: form.email,
                        phone: form.phone || null,
                        company: form.company || null,
                        job_title: form.job_title || null,
                    },
                }),
            });

            const contentType = resp.headers.get('content-type') ?? '';
            if (!contentType.includes('application/json')) {
                const text = await resp.text();
                throw new Error(`Server error (${resp.status}): ${text.slice(0, 200)}`);
            }
            const data = await resp.json();
            if (!resp.ok) throw new Error(data.error ?? 'Checkout failed');
            return data.url as string;
        },
        onSuccess: (checkoutUrl) => {
            window.location.href = checkoutUrl;
        },
        onError: (err: any) => {
            setGeneralError(err.message ?? 'Payment failed. Please try again.');
        },
    });

    const isLoading = freeMutation.isPending || paidMutation.isPending;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setGeneralError('');
        if (!form.name || !form.email) {
            setGeneralError(t('register.error.required', 'Name and email are required.'));
            return;
        }
        if (isFree) {
            freeMutation.mutate();
        } else {
            paidMutation.mutate();
        }
    };

    if (!isAuthenticated) return null;

    return (
        <div className="container section" style={{ maxWidth: 960, margin: '0 auto' }}>
            {/* ── Header ── */}
            <div style={{ marginBottom: 'var(--space-6)' }}>
                <Link
                    to={`/events/${slug}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-3)', textDecoration: 'none' }}
                >
                    <ArrowLeft size={14} /> {t('common.back', 'Back to event')}
                </Link>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
                    {event?.title ?? '…'}
                </h1>
                {event?.start_date && (
                    <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginTop: 4 }}>
                        {format(new Date(event.start_date), 'MMMM d, yyyy')}
                        {event.venue_name ? ` · ${event.venue_name}` : ''}
                        {event.city ? `, ${event.city}` : ''}
                    </p>
                )}
            </div>

            <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 'var(--space-6)', alignItems: 'start' }}>
                    {/* ── Left column ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

                        {/* Ticket selection */}
                        <div className="card" style={{ padding: 'var(--space-6)' }}>
                            <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Ticket size={16} style={{ color: 'var(--color-gold)' }} />
                                {t('register.select_ticket', 'Select Ticket')}
                            </h2>

                            {ttLoading ? (
                                <p className="text-muted text-sm">{t('common.loading', 'Loading…')}</p>
                            ) : ticketTypes.length === 0 ? (
                                <p className="text-muted text-sm">{t('register.no_tickets', 'No tickets available.')}</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                                    {ticketTypes.map(tt => (
                                        <label
                                            key={tt.id}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 'var(--space-4)',
                                                padding: 'var(--space-4)',
                                                borderRadius: 'var(--radius-md)',
                                                border: `1px solid ${selectedTicketId === tt.id ? 'var(--color-gold)' : 'var(--color-border)'}`,
                                                background: selectedTicketId === tt.id ? 'var(--color-gold-dim)' : 'var(--color-surface)',
                                                cursor: 'pointer',
                                                transition: 'all var(--transition-fast)',
                                            }}
                                        >
                                            <input
                                                type="radio"
                                                name="ticket"
                                                value={tt.id}
                                                checked={selectedTicketId === tt.id}
                                                onChange={() => { setSelectedTicketId(tt.id); removeVoucher(); }}
                                                style={{ accentColor: 'var(--color-gold)' }}
                                            />
                                            <div style={{ flex: 1 }}>
                                                <p style={{ fontWeight: 700, color: 'var(--color-text)', marginBottom: 2 }}>{tt.name}</p>
                                                {tt.description && (
                                                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{tt.description}</p>
                                                )}
                                                {tt.max_quantity && (
                                                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', marginTop: 2 }}>
                                                        {tt.max_quantity} spots
                                                    </p>
                                                )}
                                            </div>
                                            <span style={{ fontWeight: 800, fontSize: 'var(--text-lg)', color: tt.is_free ? 'var(--color-success)' : 'var(--color-text)', whiteSpace: 'nowrap' }}>
                                                {tt.is_free ? t('ticket.free', 'FREE') : formatCurrency(Number(tt.price), tt.currency)}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Attendee details */}
                        <div className="card" style={{ padding: 'var(--space-6)' }}>
                            <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <User size={16} style={{ color: 'var(--color-gold)' }} />
                                {t('register.your_details', 'Your Details')}
                            </h2>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label className="form-label">
                                        <User size={12} style={{ display: 'inline', marginRight: 4 }} />
                                        {t('register.field.name', 'Full Name')} *
                                    </label>
                                    <input
                                        className="form-input"
                                        style={{ width: '100%' }}
                                        value={form.name}
                                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                        placeholder="Jane Doe"
                                        required
                                    />
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label className="form-label">
                                        <Mail size={12} style={{ display: 'inline', marginRight: 4 }} />
                                        Email *
                                    </label>
                                    <input
                                        className="form-input"
                                        style={{ width: '100%' }}
                                        type="email"
                                        value={form.email}
                                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                        placeholder="you@example.com"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="form-label">
                                        <Phone size={12} style={{ display: 'inline', marginRight: 4 }} />
                                        {t('register.field.phone', 'Phone')}
                                    </label>
                                    <input
                                        className="form-input"
                                        style={{ width: '100%' }}
                                        type="tel"
                                        value={form.phone}
                                        onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                                        placeholder="+34 600 000 000"
                                    />
                                </div>
                                <div>
                                    <label className="form-label">
                                        <Building2 size={12} style={{ display: 'inline', marginRight: 4 }} />
                                        {t('register.field.company', 'Company')}
                                    </label>
                                    <input
                                        className="form-input"
                                        style={{ width: '100%' }}
                                        value={form.company}
                                        onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                                        placeholder="Acme Corp"
                                    />
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label className="form-label">
                                        <Briefcase size={12} style={{ display: 'inline', marginRight: 4 }} />
                                        {t('register.field.job_title', 'Job Title')}
                                    </label>
                                    <input
                                        className="form-input"
                                        style={{ width: '100%' }}
                                        value={form.job_title}
                                        onChange={e => setForm(f => ({ ...f, job_title: e.target.value }))}
                                        placeholder="Software Engineer"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Voucher code */}
                        {selectedTicket && !selectedTicket.is_free && (
                            <div className="card" style={{ padding: 'var(--space-6)' }}>
                                <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Tag size={16} style={{ color: 'var(--color-gold)' }} />
                                    {t('register.voucher.title', 'Voucher / Discount Code')}
                                </h2>

                                {voucher ? (
                                    <div style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: 'var(--space-4)', borderRadius: 'var(--radius-md)',
                                        background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)',
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <CheckCircle size={18} style={{ color: 'var(--color-success)' }} />
                                            <div>
                                                <p style={{ fontWeight: 700, color: 'var(--color-text)', fontFamily: 'monospace', letterSpacing: 2 }}>
                                                    {voucher.code}
                                                </p>
                                                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-success)' }}>
                                                    {voucher.discount_type === 'percentage'
                                                        ? `${voucher.discount_value}% off`
                                                        : `${formatCurrency(voucher.discount_value, voucher.currency)} off`}
                                                    {' — '}
                                                    {t('register.voucher.saving', 'Saving')} {formatCurrency(discountAmount, selectedTicket.currency)}
                                                </p>
                                            </div>
                                        </div>
                                        <button type="button" className="btn btn--ghost btn--sm" onClick={removeVoucher}>
                                            <XCircle size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                                        <input
                                            className={`form-input ${voucherState === 'invalid' ? 'form-input--error' : ''}`}
                                            style={{ flex: 1, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 2 }}
                                            placeholder={t('register.voucher.placeholder', 'ENTER CODE')}
                                            value={voucherCode}
                                            onChange={e => { setVoucherCode(e.target.value.toUpperCase()); setVoucherState('idle'); setVoucherError(''); }}
                                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleApplyVoucher())}
                                        />
                                        <button
                                            type="button"
                                            className="btn btn--primary"
                                            onClick={handleApplyVoucher}
                                            disabled={!voucherCode.trim() || voucherState === 'loading'}
                                        >
                                            {voucherState === 'loading'
                                                ? <Loader2 size={14} style={{ animation: 'spin 0.6s linear infinite' }} />
                                                : t('register.voucher.apply', 'Apply')}
                                        </button>
                                    </div>
                                )}

                                {voucherState === 'invalid' && (
                                    <p style={{ color: 'var(--color-error)', fontSize: 'var(--text-xs)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <XCircle size={12} /> {voucherError}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── Right column: Order summary ── */}
                    <div style={{ position: 'sticky', top: 'var(--space-6)' }}>
                        <div className="card" style={{ padding: 'var(--space-6)' }}>
                            <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: 'var(--space-5)' }}>
                                {t('register.summary.title', 'Order Summary')}
                            </h2>

                            {selectedTicket ? (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                                        <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>{selectedTicket.name}</span>
                                        <span style={{ fontWeight: 600 }}>
                                            {selectedTicket.is_free ? t('ticket.free', 'FREE') : formatCurrency(Number(selectedTicket.price), selectedTicket.currency)}
                                        </span>
                                    </div>

                                    {discountAmount > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                                            <span style={{ color: 'var(--color-success)', fontSize: 'var(--text-sm)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Tag size={12} />
                                                {voucher?.discount_type === 'percentage' ? `${voucher.discount_value}% off` : 'Discount'}
                                            </span>
                                            <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                                                −{formatCurrency(discountAmount, selectedTicket.currency)}
                                            </span>
                                        </div>
                                    )}

                                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)', marginTop: 'var(--space-2)', marginBottom: 'var(--space-5)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontWeight: 700, fontSize: 'var(--text-base)' }}>Total</span>
                                            <span style={{ fontWeight: 800, fontSize: 'var(--text-xl)', color: isFree ? 'var(--color-success)' : 'var(--color-text)' }}>
                                                {isFree ? t('ticket.free', 'FREE') : formatCurrency(finalPrice, selectedTicket.currency)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Consent */}
                                    <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 'var(--space-5)', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={form.consent}
                                            onChange={e => setForm(f => ({ ...f, consent: e.target.checked }))}
                                            style={{ marginTop: 3, accentColor: 'var(--color-gold)', flexShrink: 0 }}
                                        />
                                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                                            {t('register.consent', 'I accept the terms and privacy policy and consent to the processing of my data for this event.')}
                                        </span>
                                    </label>

                                    {/* Error */}
                                    {generalError && (
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: 8,
                                            padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)',
                                            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
                                            color: 'var(--color-error)', fontSize: 'var(--text-sm)',
                                            marginBottom: 'var(--space-4)',
                                        }}>
                                            <AlertCircle size={15} /> {generalError}
                                        </div>
                                    )}

                                    {/* Submit */}
                                    <button
                                        type="submit"
                                        className="btn btn--primary w-full"
                                        disabled={isLoading || !form.consent || !selectedTicketId}
                                        style={{ justifyContent: 'center', gap: 10 }}
                                    >
                                        {isLoading ? (
                                            <Loader2 size={16} style={{ animation: 'spin 0.6s linear infinite' }} />
                                        ) : isFree ? (
                                            <><CheckCircle size={16} /> {t('register.cta.free', 'Register Free')}</>
                                        ) : (
                                            <><CreditCard size={16} /> {t('register.cta.pay', 'Pay')} {formatCurrency(finalPrice, selectedTicket.currency)}</>
                                        )}
                                    </button>

                                    {!isFree && (
                                        <p style={{ textAlign: 'center', fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', marginTop: 'var(--space-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                                            <Lock size={11} />
                                            {t('register.stripe_note', 'Secure payment via Stripe')}
                                        </p>
                                    )}
                                </>
                            ) : (
                                <p className="text-muted text-sm">{t('register.select_ticket_hint', 'Select a ticket type to continue.')}</p>
                            )}
                        </div>
                    </div>
                </div>
            </form>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
