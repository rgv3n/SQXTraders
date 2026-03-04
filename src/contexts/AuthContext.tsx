import React, { createContext, useContext, useEffect, useReducer, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile, UserRole, ModeratorPermissions } from '@/types/database';

// ============================================================
// Types
// ============================================================
interface AuthState {
    user: User | null;
    session: Session | null;
    profile: Profile | null;
    loading: boolean;
    initialized: boolean;
}

type AuthAction =
    | { type: 'SET_SESSION'; payload: { user: User | null; session: Session | null } }
    | { type: 'SET_PROFILE'; payload: Profile | null }
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_INITIALIZED' };

interface AuthContextValue extends AuthState {
    role: UserRole | null;
    isAuthenticated: boolean;
    isSuperAdmin: boolean;
    isAdmin: boolean;
    isModerator: boolean;
    isSpeaker: boolean;
    isSponsor: boolean;
    isVipVisitor: boolean;
    hasRole: (roles: UserRole[]) => boolean;
    canAccess: (module: string) => boolean;
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
    signUp: (email: string, password: string, displayName: string, consent: boolean) => Promise<{ error: Error | null }>;
    signInWithMagicLink: (email: string) => Promise<{ error: Error | null }>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    resetPassword: (email: string) => Promise<{ error: Error | null }>;
    updatePassword: (password: string) => Promise<{ error: Error | null }>;
}

// ============================================================
// Context
// ============================================================
const AuthContext = createContext<AuthContextValue | null>(null);

// ============================================================
// Reducer
// ============================================================
function reducer(state: AuthState, action: AuthAction): AuthState {
    switch (action.type) {
        case 'SET_SESSION':
            return { ...state, user: action.payload.user, session: action.payload.session };
        case 'SET_PROFILE':
            return { ...state, profile: action.payload };
        case 'SET_LOADING':
            return { ...state, loading: action.payload };
        case 'SET_INITIALIZED':
            return { ...state, initialized: true, loading: false };
        default:
            return state;
    }
}

// ============================================================
// Provider
// ============================================================
export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(reducer, {
        user: null,
        session: null,
        profile: null,
        loading: true,
        initialized: false,
    });

    const loadProfile = useCallback(async (userId: string) => {
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', userId)
            .single();
        dispatch({ type: 'SET_PROFILE', payload: data as Profile | null });
    }, []);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            dispatch({ type: 'SET_SESSION', payload: { user: session?.user ?? null, session } });
            if (session?.user) {
                loadProfile(session.user.id).then(() => dispatch({ type: 'SET_INITIALIZED' }));
            } else {
                dispatch({ type: 'SET_INITIALIZED' });
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            dispatch({ type: 'SET_SESSION', payload: { user: session?.user ?? null, session } });
            if (session?.user) {
                loadProfile(session.user.id);
            } else {
                dispatch({ type: 'SET_PROFILE', payload: null });
            }
        });

        return () => subscription.unsubscribe();
    }, [loadProfile]);

    const role = state.profile?.role ?? null;

    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error as Error | null };
    };

    const signUp = async (email: string, password: string, displayName: string, consent: boolean) => {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) return { error: error as Error };

        if (data.user) {
            await supabase.from('profiles').insert({
                user_id: data.user.id,
                role: 'visitor' as UserRole,
                display_name: displayName,
                language_pref: 'es',
                gdpr_consent: consent,
                gdpr_consent_date: new Date().toISOString(),
                permissions: {},
                unsubscribe_email: false,
            });
        }
        return { error: null };
    };

    const signInWithMagicLink = async (email: string) => {
        const { error } = await supabase.auth.signInWithOtp({ email });
        return { error: error as Error | null };
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    const refreshProfile = useCallback(async () => {
        if (state.user) await loadProfile(state.user.id);
    }, [state.user, loadProfile]);

    const resetPassword = async (email: string) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/reset-password`,
        });
        return { error: error as Error | null };
    };

    const updatePassword = async (password: string) => {
        const { error } = await supabase.auth.updateUser({ password });
        return { error: error as Error | null };
    };

    const hasRole = useCallback((roles: UserRole[]) => roles.includes(role as UserRole), [role]);

    // canAccess: superadmin/admin always yes; moderator checks permissions JSONB
    const canAccess = useCallback((module: string): boolean => {
        if (role === 'superadmin' || role === 'admin') return true;
        if (role === 'moderator') {
            const perms = state.profile?.permissions as ModeratorPermissions | null;
            return !!(perms?.[module as keyof ModeratorPermissions]);
        }
        return false;
    }, [role, state.profile]);

    return (
        <AuthContext.Provider
            value={{
                ...state,
                role,
                isAuthenticated: !!state.user,
                isSuperAdmin: role === 'superadmin',
                isAdmin: role === 'admin' || role === 'superadmin',
                isModerator: role === 'moderator',
                isSpeaker: role === 'speaker',
                isSponsor: role === 'sponsor',
                isVipVisitor: role === 'vip_visitor',
                hasRole,
                canAccess,
                signIn,
                signUp,
                signInWithMagicLink,
                signOut,
                refreshProfile,
                resetPassword,
                updatePassword,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

// ============================================================
// Hook
// ============================================================
export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
