import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Plus, Edit2, Trash2, Save, X, Copy, Check,
    Tag, Percent, DollarSign, Clock, Infinity,
    RefreshCw, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { useTranslation } from '@/i18n/TranslationProvider';
import { supabase } from '@/lib/supabase';
import { format, isPast, isFuture } from 'date-fns';

// ─── Types ────────────────────────────────────────────────────
type DiscountType = 'percentage' | 'fixed';

interface Voucher {
    id: string;
    event_id: string | null;
    code: string;
    description: string | null;
    discount_type: DiscountType;
    discount_value: number;
    currency: string;
    max_uses: number | null;
    uses_count: number;
    max_uses_per_user: number;
    valid_from: string | null;
    valid_until: string | null;
    applies_to_all: boolean;
    is_active: boolean;
    created_at: string;
}

interface VoucherForm {
    code: string;
    description: string;
    discount_type: DiscountType;
    discount_value: string;
    currency: string;
    max_uses: string;
    max_uses_per_user: string;
    valid_from: string;
    valid_until: string;
    is_active: boolean;
    event_id: string;
}

interface Event {
    id: string;
    title: string;
}

// ─── Helpers ──────────────────────────────────────────────────
const CURRENCIES = ['EUR', 'USD', 'GBP', 'MXN', 'ARS', 'COP'];

function randomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function emptyForm(): VoucherForm {
    return {
        code: randomCode(),
        description: '',
        discount_type: 'percentage',
        discount_value: '10',
        currency: 'EUR',
        max_uses: '',
        max_uses_per_user: '1',
        valid_from: '',
        valid_until: '',
        is_active: true,
        event_id: '',
    };
}

function voucherToForm(v: Voucher): VoucherForm {
    return {
        code: v.code,
        description: v.description ?? '',
        discount_type: v.discount_type,
        discount_value: String(v.discount_value),
        currency: v.currency,
        max_uses: v.max_uses ? String(v.max_uses) : '',
        max_uses_per_user: String(v.max_uses_per_user),
        valid_from: v.valid_from ? v.valid_from.slice(0, 16) : '',
        valid_until: v.valid_until ? v.valid_until.slice(0, 16) : '',
        is_active: v.is_active,
        event_id: v.event_id ?? '',
    };
}

function discountLabel(v: Voucher) {
    if (v.discount_type === 'percentage') {
        return <span style={{ fontWeight: 700, color: 'var(--color-gold)' }}>{v.discount_value}% off</span>;
    }
    return <span style={{ fontWeight: 700, color: 'var(--color-gold)' }}>{v.currency} {Number(v.discount_value).toFixed(2)} off</span>;
}

function validityStatus(v: Voucher): { label: string; color: string } {
    const now = new Date();
    if (!v.is_active) return { label: 'Inactive', color: 'var(--color-text-muted)' };
    if (v.valid_until && isPast(new Date(v.valid_until))) return { label: 'Expired', color: 'var(--color-error)' };
    if (v.valid_from && isFuture(new Date(v.valid_from))) return { label: 'Not started', color: 'var(--color-warning)' };
    if (v.max_uses !== null && v.uses_count >= v.max_uses) return { label: 'Exhausted', color: 'var(--color-error)' };
    return { label: 'Active', color: 'var(--color-success)' };
}

// ─── Copy code button ─────────────────────────────────────────
function CopyButton({ code }: { code: string }) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button
            className="btn btn--ghost btn--xs"
            onClick={copy}
            title="Copy code"
            style={{ padding: '2px 6px', gap: 4 }}
        >
            {copied ? <Check size={12} style={{ color: 'var(--color-success)' }} /> : <Copy size={12} />}
        </button>
    );
}

// ─── Form component ───────────────────────────────────────────
function VoucherFormPanel({
    initial,
    events,
    onSave,
    onCancel,
    saving,
}: {
    initial: VoucherForm;
    events: Event[];
    onSave: (f: VoucherForm) => void;
    onCancel: () => void;
    saving: boolean;
}) {
    const [f, setF] = useState<VoucherForm>(initial);
    const set = (k: keyof VoucherForm, v: string | boolean) => setF(p => ({ ...p, [k]: v }));

    return (
        <div style={{
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-gold)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-6)',
            marginBottom: 'var(--space-4)',
        }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>

                {/* Code */}
                <div>
                    <label className="form-label">Code *</label>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <input
                            className="form-input"
                            style={{ flex: 1, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 2 }}
                            placeholder="EARLYBIRD20"
                            value={f.code}
                            onChange={e => set('code', e.target.value.toUpperCase().replace(/\s/g, ''))}
                        />
                        <button
                            type="button"
                            className="btn btn--ghost btn--sm"
                            onClick={() => set('code', randomCode())}
                            title="Generate random code"
                        >
                            <RefreshCw size={14} />
                        </button>
                    </div>
                </div>

                {/* Event scope */}
                <div>
                    <label className="form-label">Event scope <span style={{ color: 'var(--color-text-faint)' }}>(blank = all events)</span></label>
                    <select
                        className="form-input"
                        style={{ width: '100%' }}
                        value={f.event_id}
                        onChange={e => set('event_id', e.target.value)}
                    >
                        <option value="">— All events —</option>
                        {events.map(ev => (
                            <option key={ev.id} value={ev.id}>{ev.title}</option>
                        ))}
                    </select>
                </div>

                {/* Description */}
                <div style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Description <span style={{ color: 'var(--color-text-faint)' }}>(internal note)</span></label>
                    <input
                        className="form-input"
                        style={{ width: '100%' }}
                        placeholder="e.g. Early Bird 20% off — Summer campaign"
                        value={f.description}
                        onChange={e => set('description', e.target.value)}
                    />
                </div>

                {/* Discount type */}
                <div>
                    <label className="form-label">Discount type *</label>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        {(['percentage', 'fixed'] as DiscountType[]).map(type => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => set('discount_type', type)}
                                style={{
                                    flex: 1,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                    padding: 'var(--space-3)',
                                    borderRadius: 'var(--radius-sm)',
                                    border: `1px solid ${f.discount_type === type ? 'var(--color-gold)' : 'var(--color-border)'}`,
                                    background: f.discount_type === type ? 'var(--color-gold-dim)' : 'var(--color-surface)',
                                    color: f.discount_type === type ? 'var(--color-gold)' : 'var(--color-text-muted)',
                                    fontWeight: 600,
                                    fontSize: 'var(--text-sm)',
                                    cursor: 'pointer',
                                    transition: 'all var(--transition-fast)',
                                }}
                            >
                                {type === 'percentage' ? <Percent size={14} /> : <DollarSign size={14} />}
                                {type === 'percentage' ? '% Percentage' : 'Fixed amount'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Discount value + currency */}
                <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                    <div style={{ flex: 1 }}>
                        <label className="form-label">
                            Value * {f.discount_type === 'percentage' ? '(%)' : '(amount)'}
                        </label>
                        <input
                            className="form-input"
                            type="number"
                            min="0.01"
                            max={f.discount_type === 'percentage' ? '100' : undefined}
                            step={f.discount_type === 'percentage' ? '1' : '0.01'}
                            style={{ width: '100%' }}
                            value={f.discount_value}
                            onChange={e => set('discount_value', e.target.value)}
                        />
                    </div>
                    {f.discount_type === 'fixed' && (
                        <div style={{ width: 110 }}>
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
                    )}
                </div>

                {/* Max uses */}
                <div>
                    <label className="form-label">Max uses <span style={{ color: 'var(--color-text-faint)' }}>(blank = unlimited)</span></label>
                    <input
                        className="form-input"
                        type="number"
                        min="1"
                        style={{ width: '100%' }}
                        placeholder="∞"
                        value={f.max_uses}
                        onChange={e => set('max_uses', e.target.value)}
                    />
                </div>

                {/* Max uses per user */}
                <div>
                    <label className="form-label">Max uses per user</label>
                    <input
                        className="form-input"
                        type="number"
                        min="1"
                        style={{ width: '100%' }}
                        value={f.max_uses_per_user}
                        onChange={e => set('max_uses_per_user', e.target.value)}
                    />
                </div>

                {/* Valid from */}
                <div>
                    <label className="form-label">Valid from <span style={{ color: 'var(--color-text-faint)' }}>(optional)</span></label>
                    <input
                        className="form-input"
                        type="datetime-local"
                        style={{ width: '100%' }}
                        value={f.valid_from}
                        onChange={e => set('valid_from', e.target.value)}
                    />
                </div>

                {/* Valid until */}
                <div>
                    <label className="form-label">Valid until <span style={{ color: 'var(--color-text-faint)' }}>(optional)</span></label>
                    <input
                        className="form-input"
                        type="datetime-local"
                        style={{ width: '100%' }}
                        value={f.valid_until}
                        onChange={e => set('valid_until', e.target.value)}
                    />
                </div>

                {/* Active */}
                <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                        id="voucher_active"
                        type="checkbox"
                        checked={f.is_active}
                        onChange={e => set('is_active', e.target.checked)}
                        style={{ width: 16, height: 16, accentColor: 'var(--color-gold)', cursor: 'pointer' }}
                    />
                    <label htmlFor="voucher_active" style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text)', cursor: 'pointer' }}>
                        Active (users can apply this voucher)
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
                    disabled={saving || !f.code.trim() || !f.discount_value}
                >
                    <Save size={14} />
                    {saving ? 'Saving…' : 'Save voucher'}
                </button>
            </div>
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────
export default function AdminVouchersPage() {
    const { t } = useTranslation();
    const qc = useQueryClient();
    const [addingNew, setAddingNew] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    // ── Events (for scope selector) ──
    const { data: events = [] } = useQuery({
        queryKey: ['events-simple'],
        queryFn: async () => {
            const { data } = await supabase.from('events').select('id, title').order('start_date', { ascending: false });
            return (data ?? []) as Event[];
        },
    });

    // ── Vouchers ──
    const { data: vouchers = [], isLoading } = useQuery({
        queryKey: ['admin-vouchers'],
        queryFn: async () => {
            const { data } = await supabase
                .from('vouchers')
                .select('*')
                .order('created_at', { ascending: false });
            return (data ?? []) as Voucher[];
        },
    });

    // ── Mutations ──
    const formToPayload = useCallback((f: VoucherForm) => ({
        code: f.code.trim().toUpperCase(),
        description: f.description.trim() || null,
        discount_type: f.discount_type,
        discount_value: Number(f.discount_value),
        currency: f.currency,
        max_uses: f.max_uses ? Number(f.max_uses) : null,
        max_uses_per_user: Number(f.max_uses_per_user) || 1,
        valid_from: f.valid_from ? new Date(f.valid_from).toISOString() : null,
        valid_until: f.valid_until ? new Date(f.valid_until).toISOString() : null,
        applies_to_all: true,
        is_active: f.is_active,
        event_id: f.event_id || null,
    }), []);

    const createMutation = useMutation({
        mutationFn: async (f: VoucherForm) => {
            const { error } = await supabase.from('vouchers').insert(formToPayload(f));
            if (error) throw error;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin-vouchers'] });
            setAddingNew(false);
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, f }: { id: string; f: VoucherForm }) => {
            const { error } = await supabase.from('vouchers').update(formToPayload(f)).eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin-vouchers'] });
            setEditingId(null);
        },
    });

    const toggleMutation = useMutation({
        mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
            const { error } = await supabase.from('vouchers').update({ is_active }).eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-vouchers'] }),
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('vouchers').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin-vouchers'] });
            setDeleteConfirm(null);
        },
    });

    const activeCount = vouchers.filter(v => v.is_active).length;
    const totalRedemptions = vouchers.reduce((s, v) => s + v.uses_count, 0);

    return (
        <div>
            {/* ── Header ── */}
            <div className="admin-page-header">
                <div>
                    <h1 className="admin-page-title">{t('admin.nav.vouchers', 'Vouchers')}</h1>
                    <p className="admin-page-subtitle">
                        {activeCount} active · {totalRedemptions} total redemptions
                    </p>
                </div>
                {!addingNew && (
                    <button
                        className="btn btn--primary"
                        onClick={() => { setAddingNew(true); setEditingId(null); }}
                    >
                        <Plus size={15} /> New voucher
                    </button>
                )}
            </div>

            {/* ── New voucher form ── */}
            {addingNew && (
                <VoucherFormPanel
                    initial={emptyForm()}
                    events={events}
                    onSave={f => createMutation.mutate(f)}
                    onCancel={() => setAddingNew(false)}
                    saving={createMutation.isPending}
                />
            )}

            {/* ── Loading ── */}
            {isLoading && <p className="text-muted">{t('common.loading', 'Loading…')}</p>}

            {/* ── Empty state ── */}
            {!isLoading && vouchers.length === 0 && !addingNew && (
                <div className="card" style={{ textAlign: 'center', padding: 'var(--space-16)' }}>
                    <Tag size={48} style={{ color: 'var(--color-text-faint)', marginBottom: 'var(--space-4)' }} />
                    <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
                        No vouchers yet. Create your first discount code.
                    </p>
                    <button className="btn btn--primary" onClick={() => setAddingNew(true)}>
                        <Plus size={15} /> New voucher
                    </button>
                </div>
            )}

            {/* ── Voucher list ── */}
            {vouchers.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    {vouchers.map(v => {
                        const status = validityStatus(v);
                        const usagePercent = v.max_uses ? Math.min(100, Math.round((v.uses_count / v.max_uses) * 100)) : null;
                        const eventName = events.find(e => e.id === v.event_id)?.title;

                        if (editingId === v.id) {
                            return (
                                <VoucherFormPanel
                                    key={v.id}
                                    initial={voucherToForm(v)}
                                    events={events}
                                    onSave={f => updateMutation.mutate({ id: v.id, f })}
                                    onCancel={() => setEditingId(null)}
                                    saving={updateMutation.isPending}
                                />
                            );
                        }

                        if (deleteConfirm === v.id) {
                            return (
                                <div key={v.id} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
                                    borderRadius: 'var(--radius-md)', padding: 'var(--space-4) var(--space-5)',
                                }}>
                                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-error)' }}>
                                        Delete voucher <strong>{v.code}</strong>? This cannot be undone.
                                    </span>
                                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                        <button className="btn btn--ghost btn--sm" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                                        <button
                                            className="btn btn--sm"
                                            style={{ background: 'var(--color-error)', color: '#fff' }}
                                            onClick={() => deleteMutation.mutate(v.id)}
                                            disabled={deleteMutation.isPending}
                                        >
                                            <Trash2 size={13} /> Delete
                                        </button>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div key={v.id} style={{
                                background: 'var(--color-surface)',
                                border: `1px solid ${v.is_active ? 'var(--color-border)' : 'var(--color-border)'}`,
                                borderRadius: 'var(--radius-md)',
                                padding: 'var(--space-4) var(--space-5)',
                                opacity: v.is_active ? 1 : 0.55,
                                transition: 'opacity var(--transition-fast)',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                                    {/* Left: code + discount */}
                                    <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center', flexWrap: 'wrap' }}>
                                        {/* Code pill */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <code style={{
                                                fontFamily: 'monospace',
                                                fontWeight: 800,
                                                fontSize: 'var(--text-lg)',
                                                letterSpacing: 3,
                                                color: 'var(--color-text)',
                                                background: 'var(--color-surface-2)',
                                                padding: '4px 10px',
                                                borderRadius: 'var(--radius-sm)',
                                                border: '1px solid var(--color-border)',
                                            }}>
                                                {v.code}
                                            </code>
                                            <CopyButton code={v.code} />
                                        </div>

                                        {/* Discount */}
                                        {discountLabel(v)}

                                        {/* Status */}
                                        <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: status.color }}>
                                            ● {status.label}
                                        </span>

                                        {/* Event scope */}
                                        {eventName && (
                                            <span className="badge badge--default" style={{ fontSize: 'var(--text-xs)' }}>
                                                {eventName}
                                            </span>
                                        )}
                                    </div>

                                    {/* Right: actions */}
                                    <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                                        <button
                                            className="btn btn--ghost btn--sm"
                                            title={v.is_active ? 'Deactivate' : 'Activate'}
                                            onClick={() => toggleMutation.mutate({ id: v.id, is_active: !v.is_active })}
                                            style={{ color: v.is_active ? 'var(--color-success)' : 'var(--color-text-muted)' }}
                                        >
                                            {v.is_active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                                        </button>
                                        <button
                                            className="btn btn--ghost btn--sm"
                                            onClick={() => { setEditingId(v.id); setAddingNew(false); }}
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <button
                                            className="btn btn--ghost btn--sm"
                                            style={{ color: 'var(--color-error)' }}
                                            onClick={() => setDeleteConfirm(v.id)}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>

                                {/* Second row: description + usage + dates */}
                                <div style={{ marginTop: 'var(--space-3)', display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap', alignItems: 'center' }}>
                                    {v.description && (
                                        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                                            {v.description}
                                        </span>
                                    )}

                                    {/* Usage */}
                                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        {v.max_uses ? (
                                            <>
                                                <span>{v.uses_count} / {v.max_uses} uses</span>
                                                <div style={{ width: 60, height: 4, background: 'var(--color-surface-2)', borderRadius: 999, overflow: 'hidden' }}>
                                                    <div style={{ height: '100%', width: `${usagePercent}%`, background: usagePercent! >= 90 ? 'var(--color-error)' : 'var(--color-gold)', borderRadius: 999 }} />
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <Infinity size={13} />
                                                {v.uses_count} uses
                                            </>
                                        )}
                                    </span>

                                    {/* Validity dates */}
                                    {(v.valid_from || v.valid_until) && (
                                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <Clock size={11} />
                                            {v.valid_from && `From ${format(new Date(v.valid_from), 'MMM d')}`}
                                            {v.valid_from && v.valid_until && ' → '}
                                            {v.valid_until && `Until ${format(new Date(v.valid_until), 'MMM d, yyyy')}`}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
