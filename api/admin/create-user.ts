import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// ─── Supabase admin client (service role — bypasses RLS) ─────
const adminSupabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ─── CORS ─────────────────────────────────────────────────────
function cors(res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', process.env.VITE_APP_URL ?? '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// ─── Handler ──────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
    cors(res);

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        // ── Authenticate caller ──
        const token = (req.headers.authorization ?? '').replace('Bearer ', '').trim();
        if (!token) return res.status(401).json({ error: 'Missing auth token' });

        const { data: authData, error: authError } = await adminSupabase.auth.getUser(token);
        if (authError || !authData?.user) {
            console.error('[create-user] Token validation failed:', authError?.message);
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
        const caller = authData.user;

        // ── Only superadmin may create management users ──
        const { data: callerProfile, error: profileFetchError } = await adminSupabase
            .from('profiles')
            .select('role')
            .eq('user_id', caller.id)
            .single();

        if (profileFetchError) {
            console.error('[create-user] Profile fetch error:', profileFetchError.message);
        }

        if (!callerProfile || callerProfile.role !== 'superadmin') {
            return res.status(403).json({ error: 'Only superadmin can create management users' });
        }

        // ── Validate body ──
        const { email, password, display_name, role, permissions = {} } = req.body ?? {};
        if (!email || !password || !display_name || !role) {
            return res.status(400).json({ error: 'Missing required fields: email, password, display_name, role' });
        }
        if (!['admin', 'moderator'].includes(role)) {
            return res.status(400).json({ error: "role must be 'admin' or 'moderator'" });
        }
        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }

        // ── Create or locate auth user ──
        let targetUserId: string;
        let targetCreatedAt: string;
        let createdNew = false;

        const { data: newUserData, error: createError } = await adminSupabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
        });

        if (createError) {
            // "Database error creating new user" = GoTrue trigger crashed (handle_new_user failed).
            // "already/duplicate/registered/exists" = email already taken.
            // In both cases try to find the existing user and promote them instead.
            const isRetryable = /already|duplicate|registered|exists|database error/i.test(createError.message);
            if (!isRetryable) {
                console.error('[create-user] Auth user creation failed:', createError.message);
                return res.status(400).json({ error: createError.message });
            }

            console.error('[create-user] createUser failed, trying to locate existing user:', createError.message);

            // Find existing auth user by email
            const { data: listData, error: listError } = await adminSupabase.auth.admin.listUsers({
                page: 1,
                perPage: 1000,
            });
            if (listError) {
                console.error('[create-user] listUsers error:', listError.message);
                return res.status(500).json({ error: `User creation failed: ${createError.message}` });
            }
            const existing = listData.users.find(u => u.email?.toLowerCase() === email.trim().toLowerCase());
            if (!existing) {
                // No existing user — the trigger error was the real issue. Run migration 015 in Supabase.
                console.error('[create-user] Trigger error and no existing user found. Needs DB fix (migration 015).');
                return res.status(500).json({ error: `Database trigger error. Please run migration 015 in Supabase and retry.` });
            }

            targetUserId = existing.id;
            targetCreatedAt = existing.created_at;
            // Update password for the existing account
            await adminSupabase.auth.admin.updateUserById(targetUserId, { password });
        } else {
            if (!newUserData?.user) {
                return res.status(400).json({ error: 'Failed to create auth user' });
            }
            targetUserId = newUserData.user.id;
            targetCreatedAt = newUserData.user.created_at;
            createdNew = true;
        }

        // ── Upsert profile ──
        const { error: profileError } = await adminSupabase.from('profiles').upsert({
            user_id: targetUserId,
            email: email.trim().toLowerCase(),
            display_name,
            role,
            permissions: role === 'moderator' ? permissions : {},
            language_pref: 'es',
            gdpr_consent: false,
            unsubscribe_email: false,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

        if (profileError) {
            console.error('[create-user] Profile upsert failed:', profileError.message);
            // Only rollback new accounts
            if (createdNew) await adminSupabase.auth.admin.deleteUser(targetUserId);
            return res.status(500).json({ error: `Profile creation failed: ${profileError.message}` });
        }

        return res.status(201).json({
            user: {
                id: targetUserId,
                email,
                display_name,
                role,
                permissions: role === 'moderator' ? permissions : {},
                created_at: targetCreatedAt,
            },
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unexpected server error';
        console.error('[create-user] Unhandled error:', message);
        return res.status(500).json({ error: message });
    }
}
