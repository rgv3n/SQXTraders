import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, UserMinus, Save, X, Eye, EyeOff, RefreshCw, Shield, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/i18n/TranslationProvider';
import { supabase } from '@/lib/supabase';
import type { Profile, ModeratorPermissions } from '@/types/database';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

// ─── Constants ────────────────────────────────────────────────
const MANAGEMENT_ROLES = ['superadmin', 'admin', 'moderator'] as const;

const MODULES: { key: keyof ModeratorPermissions; label: string }[] = [
    { key: 'check_in',     label: 'Check-in' },
    { key: 'attendees',    label: 'Attendees' },
    { key: 'events',       label: 'Events' },
    { key: 'speakers',     label: 'Speakers' },
    { key: 'sponsors',     label: 'Sponsors' },
    { key: 'vouchers',     label: 'Vouchers' },
    { key: 'analytics',    label: 'Analytics' },
    { key: 'translations', label: 'Translations' },
    { key: 'import_export',label: 'Import / Export' },
];

// ─── Helpers ──────────────────────────────────────────────────
function roleBadge(role: string) {
    const map: Record<string, { cls: string; icon: React.ReactNode }> = {
        superadmin: { cls: 'badge--gold',    icon: <ShieldCheck size={10} /> },
        admin:      { cls: 'badge--blue',    icon: <Shield size={10} /> },
        moderator:  { cls: 'badge--default', icon: <ShieldAlert size={10} /> },
    };
    const { cls, icon } = map[role] ?? map.admin;
    return <span className={`badge ${cls}`} style={{ display:'inline-flex', gap:4 }}>{icon} {role}</span>;
}

function initials(name: string) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

// ─── Permissions checklist ────────────────────────────────────
function PermissionsGrid({
    value,
    onChange,
    disabled = false,
}: {
    value: ModeratorPermissions;
    onChange: (p: ModeratorPermissions) => void;
    disabled?: boolean;
}) {
    const toggle = (key: keyof ModeratorPermissions) => {
        onChange({ ...value, [key]: !value[key] });
    };
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
            {MODULES.map(m => (
                <label
                    key={m.key}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '6px 10px',
                        borderRadius: 'var(--radius-sm)',
                        background: value[m.key] ? 'var(--color-gold-dim)' : 'var(--color-surface-2)',
                        border: `1px solid ${value[m.key] ? 'rgba(240,165,0,0.3)' : 'var(--color-border)'}`,
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        opacity: disabled ? 0.6 : 1,
                        transition: 'all var(--transition-fast)',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 500,
                        color: value[m.key] ? 'var(--color-gold)' : 'var(--color-text-muted)',
                    }}
                >
                    <input
                        type="checkbox"
                        checked={!!value[m.key]}
                        onChange={() => toggle(m.key)}
                        disabled={disabled}
                        style={{ width: 14, height: 14, accentColor: 'var(--color-gold)', cursor: disabled ? 'not-allowed' : 'pointer' }}
                    />
                    {m.label}
                </label>
            ))}
        </div>
    );
}

// ─── Create user form ─────────────────────────────────────────
interface CreateForm {
    email: string;
    display_name: string;
    password: string;
    role: 'admin' | 'moderator';
    permissions: ModeratorPermissions;
}

const emptyCreate = (): CreateForm => ({
    email: '', display_name: '', password: '', role: 'admin', permissions: {},
});

function generatePassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
    return Array.from({ length: 14 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ─── Edit user form ───────────────────────────────────────────
interface EditForm {
    display_name: string;
    role: 'admin' | 'moderator' | 'superadmin';
    permissions: ModeratorPermissions;
}

// ─── Main page ────────────────────────────────────────────────
export default function AdminUsersPage() {
    const { isSuperAdmin, isAdmin, profile: myProfile } = useAuth();
    const { t } = useTranslation();
    const qc = useQueryClient();

    // Access control: moderators cannot access this page
    if (!isAdmin) {
        return <Navigate to="/admin" replace />;
    }

    // ── State ──
    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState<CreateForm>(emptyCreate());
    const [showPassword, setShowPassword] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<EditForm>({ display_name: '', role: 'admin', permissions: {} });
    const [demoteConfirmId, setDemoteConfirmId] = useState<string | null>(null);

    // ── Query ──
    const { data: users = [], isLoading } = useQuery<Profile[]>({
        queryKey: ['management-users'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .in('role', MANAGEMENT_ROLES)
                .order('created_at', { ascending: true });
            if (error) throw error;
            return (data ?? []) as Profile[];
        },
    });

    // ── Create mutation (calls API) ──
    const createMutation = useMutation({
        mutationFn: async (form: CreateForm) => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) throw new Error('Not authenticated');

            const res = await fetch('/api/admin/create-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    email: form.email.trim(),
                    password: form.password,
                    display_name: form.display_name.trim(),
                    role: form.role,
                    permissions: form.role === 'moderator' ? form.permissions : {},
                }),
            });
            let json: { error?: string; user?: unknown };
            try {
                json = await res.json();
            } catch {
                throw new Error(`Server error ${res.status}: ${res.statusText || 'unexpected response'}`);
            }
            if (!res.ok) throw new Error(json.error ?? 'Failed to create user');
            return json;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['management-users'] });
            setShowCreate(false);
            setCreateForm(emptyCreate());
            toast.success('User created successfully ✓');
        },
        onError: (err: Error) => toast.error(err.message),
    });

    // ── Update mutation (role + permissions) ──
    const updateMutation = useMutation({
        mutationFn: async ({ userId, form }: { userId: string; form: EditForm }) => {
            const { error } = await supabase
                .from('profiles')
                .update({
                    display_name:  form.display_name,
                    role:          form.role,
                    permissions:   form.role === 'moderator' ? form.permissions : {},
                    updated_at:    new Date().toISOString(),
                })
                .eq('user_id', userId);
            if (error) throw error;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['management-users'] });
            setEditingId(null);
            toast.success('User updated ✓');
        },
        onError: (err: Error) => toast.error(`Update failed: ${err.message}`),
    });

    // ── Demote mutation ──
    const demoteMutation = useMutation({
        mutationFn: async (userId: string) => {
            const { error } = await supabase
                .from('profiles')
                .update({ role: 'visitor', permissions: {}, updated_at: new Date().toISOString() })
                .eq('user_id', userId);
            if (error) throw error;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['management-users'] });
            setDemoteConfirmId(null);
            toast.success('User demoted to visitor');
        },
        onError: (err: Error) => toast.error(`Demote failed: ${err.message}`),
    });

    // ── Open edit ──
    const openEdit = (user: Profile) => {
        setEditingId(user.user_id);
        setEditForm({
            display_name: user.display_name,
            role: user.role as EditForm['role'],
            permissions: (user.permissions as ModeratorPermissions) ?? {},
        });
        setDemoteConfirmId(null);
    };

    return (
        <div style={{ maxWidth: 800 }}>
            {/* ── Header ── */}
            <div className="admin-page-header">
                <div>
                    <h1 className="admin-page-title" style={{ margin: 0 }}>
                        {t('admin.users.title', 'Management Users')}
                    </h1>
                    <p className="text-muted" style={{ fontSize: 'var(--text-sm)', marginTop: 4 }}>
                        {t('admin.users.subtitle', 'Admins and moderators who can access this panel.')}
                    </p>
                </div>
                {isSuperAdmin && !showCreate && (
                    <button className="btn btn--primary btn--sm" onClick={() => { setShowCreate(true); setEditingId(null); }}>
                        <Plus size={14} /> {t('admin.users.add', 'Add User')}
                    </button>
                )}
            </div>

            {/* ── Create form ── */}
            {showCreate && (
                <div className="card" style={{ marginBottom: 'var(--space-6)', border: '1px solid var(--color-gold)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-5)' }}>
                        <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-text)' }}>
                            {t('admin.users.new_user', 'New Management User')}
                        </h2>
                        <button className="btn btn--ghost btn--sm" onClick={() => { setShowCreate(false); setCreateForm(emptyCreate()); }}>
                            <X size={14} />
                        </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                        {/* Email */}
                        <div>
                            <label className="form-label">Email *</label>
                            <input
                                className="form-input"
                                type="email"
                                style={{ width: '100%' }}
                                placeholder="user@example.com"
                                value={createForm.email}
                                onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
                            />
                        </div>
                        {/* Display name */}
                        <div>
                            <label className="form-label">Display Name *</label>
                            <input
                                className="form-input"
                                style={{ width: '100%' }}
                                placeholder="Full Name"
                                value={createForm.display_name}
                                onChange={e => setCreateForm(f => ({ ...f, display_name: e.target.value }))}
                            />
                        </div>
                        {/* Password */}
                        <div>
                            <label className="form-label">Password *</label>
                            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                <div style={{ position: 'relative', flex: 1 }}>
                                    <input
                                        className="form-input"
                                        type={showPassword ? 'text' : 'password'}
                                        style={{ width: '100%', paddingRight: '2.5rem' }}
                                        placeholder="Min. 8 characters"
                                        value={createForm.password}
                                        onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(v => !v)}
                                        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-text-faint)', cursor: 'pointer' }}
                                    >
                                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    className="btn btn--ghost btn--sm"
                                    title="Generate password"
                                    onClick={() => setCreateForm(f => ({ ...f, password: generatePassword() }))}
                                >
                                    <RefreshCw size={13} />
                                </button>
                            </div>
                        </div>
                        {/* Role */}
                        <div>
                            <label className="form-label">Role *</label>
                            <select
                                className="form-input"
                                style={{ width: '100%' }}
                                value={createForm.role}
                                onChange={e => setCreateForm(f => ({ ...f, role: e.target.value as 'admin' | 'moderator' }))}
                            >
                                <option value="admin">Admin — full access</option>
                                <option value="moderator">Moderator — configurable access</option>
                            </select>
                        </div>

                        {/* Permissions (moderator only) */}
                        {createForm.role === 'moderator' && (
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label className="form-label">Module Access</label>
                                <PermissionsGrid
                                    value={createForm.permissions}
                                    onChange={permissions => setCreateForm(f => ({ ...f, permissions }))}
                                />
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-5)', justifyContent: 'flex-end' }}>
                        <button className="btn btn--ghost" onClick={() => { setShowCreate(false); setCreateForm(emptyCreate()); }} disabled={createMutation.isPending}>
                            <X size={14} /> Cancel
                        </button>
                        <button
                            className="btn btn--primary"
                            onClick={() => createMutation.mutate(createForm)}
                            disabled={
                                createMutation.isPending ||
                                !createForm.email.trim() ||
                                !createForm.display_name.trim() ||
                                createForm.password.length < 8
                            }
                        >
                            <Save size={14} />
                            {createMutation.isPending ? 'Creating…' : 'Create User'}
                        </button>
                    </div>
                </div>
            )}

            {/* ── User table ── */}
            {isLoading ? (
                <p className="text-muted" style={{ padding: 'var(--space-8)' }}>Loading…</p>
            ) : users.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
                    <p className="text-muted">No management users found.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    {users.map(user => {
                        const isMe = user.user_id === myProfile?.user_id;
                        const isSuperAdminRow = user.role === 'superadmin';
                        const perms = (user.permissions ?? {}) as ModeratorPermissions;

                        return (
                            <div key={user.user_id}>
                                {/* ── Edit form (expanded) ── */}
                                {editingId === user.user_id ? (
                                    <div className="card" style={{ border: '1px solid var(--color-gold)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
                                            <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>Editing {user.display_name}</span>
                                            <button className="btn btn--ghost btn--sm" onClick={() => setEditingId(null)}><X size={13} /></button>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                                            <div>
                                                <label className="form-label">Display Name</label>
                                                <input
                                                    className="form-input"
                                                    style={{ width: '100%' }}
                                                    value={editForm.display_name}
                                                    onChange={e => setEditForm(f => ({ ...f, display_name: e.target.value }))}
                                                />
                                            </div>
                                            {isSuperAdmin && !isSuperAdminRow && (
                                                <div>
                                                    <label className="form-label">Role</label>
                                                    <select
                                                        className="form-input"
                                                        style={{ width: '100%' }}
                                                        value={editForm.role}
                                                        onChange={e => setEditForm(f => ({ ...f, role: e.target.value as EditForm['role'] }))}
                                                    >
                                                        <option value="admin">Admin</option>
                                                        <option value="moderator">Moderator</option>
                                                    </select>
                                                </div>
                                            )}
                                            {editForm.role === 'moderator' && (
                                                <div style={{ gridColumn: '1 / -1' }}>
                                                    <label className="form-label">Module Access</label>
                                                    <PermissionsGrid
                                                        value={editForm.permissions}
                                                        onChange={permissions => setEditForm(f => ({ ...f, permissions }))}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)', justifyContent: 'flex-end' }}>
                                            <button className="btn btn--ghost btn--sm" onClick={() => setEditingId(null)} disabled={updateMutation.isPending}>
                                                <X size={13} /> Cancel
                                            </button>
                                            <button
                                                className="btn btn--primary btn--sm"
                                                onClick={() => updateMutation.mutate({ userId: user.user_id, form: editForm })}
                                                disabled={updateMutation.isPending || !editForm.display_name.trim()}
                                            >
                                                <Save size={13} /> {updateMutation.isPending ? 'Saving…' : 'Save'}
                                            </button>
                                        </div>
                                    </div>
                                ) : demoteConfirmId === user.user_id ? (
                                    /* ── Demote confirm ── */
                                    <div style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
                                        borderRadius: 'var(--radius-md)', padding: 'var(--space-4) var(--space-5)',
                                    }}>
                                        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-error)' }}>
                                            Remove <strong>{user.display_name}</strong>'s management access?
                                            Their account remains but role will be set to <em>visitor</em>.
                                        </span>
                                        <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0, marginLeft: 'var(--space-4)' }}>
                                            <button className="btn btn--ghost btn--sm" onClick={() => setDemoteConfirmId(null)}>Cancel</button>
                                            <button
                                                className="btn btn--sm"
                                                style={{ background: 'var(--color-error)', color: '#fff' }}
                                                onClick={() => demoteMutation.mutate(user.user_id)}
                                                disabled={demoteMutation.isPending}
                                            >
                                                <UserMinus size={13} /> Remove access
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    /* ── Normal row ── */
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: '40px 1fr auto',
                                        gap: 'var(--space-4)',
                                        alignItems: 'center',
                                        background: 'var(--color-surface)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: 'var(--radius-md)',
                                        padding: 'var(--space-4) var(--space-5)',
                                    }}>
                                        {/* Avatar */}
                                        <div style={{
                                            width: 40, height: 40, borderRadius: '50%',
                                            background: isMe ? 'var(--color-gold-dim)' : 'var(--color-surface-3)',
                                            border: `2px solid ${isMe ? 'var(--color-gold)' : 'var(--color-border)'}`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontWeight: 700, fontSize: 'var(--text-sm)',
                                            color: isMe ? 'var(--color-gold)' : 'var(--color-text-muted)',
                                            flexShrink: 0,
                                        }}>
                                            {initials(user.display_name || user.email || '?')}
                                        </div>

                                        {/* Info */}
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap', marginBottom: 4 }}>
                                                <span style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: 'var(--text-sm)' }}>
                                                    {user.display_name || '—'}
                                                </span>
                                                {roleBadge(user.role)}
                                                {isMe && <span className="badge badge--gold" style={{ fontSize: 'var(--text-xs)' }}>You</span>}
                                            </div>
                                            <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                                                <span>{user.email ?? '—'}</span>
                                                <span>Joined {user.created_at ? format(new Date(user.created_at), 'MMM d, yyyy') : '—'}</span>
                                                {user.role === 'moderator' && (
                                                    <span style={{ color: 'var(--color-text-faint)' }}>
                                                        {MODULES.filter(m => perms[m.key]).map(m => m.label).join(', ') || 'No modules assigned'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}>
                                            {/* Edit: superadmin always; admin only for moderators */}
                                            {((isSuperAdmin && !isMe) || (isAdmin && !isSuperAdmin && user.role === 'moderator')) && (
                                                <button
                                                    className="btn btn--ghost btn--sm"
                                                    title="Edit"
                                                    onClick={() => openEdit(user)}
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                            )}
                                            {/* Demote: superadmin only, not own row, not other superadmins */}
                                            {isSuperAdmin && !isMe && !isSuperAdminRow && (
                                                <button
                                                    className="btn btn--ghost btn--sm"
                                                    style={{ color: 'var(--color-error)' }}
                                                    title="Remove management access"
                                                    onClick={() => { setDemoteConfirmId(user.user_id); setEditingId(null); }}
                                                >
                                                    <UserMinus size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Legend */}
            <div style={{ marginTop: 'var(--space-8)', display: 'flex', gap: 'var(--space-6)', fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>
                <span>{roleBadge('superadmin')} Full control</span>
                <span>{roleBadge('admin')} Full access, no user management</span>
                <span>{roleBadge('moderator')} Configurable module access</span>
            </div>
        </div>
    );
}
