import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types/database';

// ============================================================
// Loading Spinner (used during auth initialization)
// ============================================================
function AuthLoading() {
    return (
        <div className="auth-loading">
            <div className="auth-loading__spinner" />
        </div>
    );
}

// ============================================================
// RequireAuth — must be logged in
// ============================================================
export function RequireAuth({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, initialized } = useAuth();
    const location = useLocation();

    if (!initialized) return <AuthLoading />;
    if (!isAuthenticated) {
        return <Navigate to="/auth/login" state={{ from: location }} replace />;
    }
    return <>{children}</>;
}

// ============================================================
// RequireRole — must have specific role
// ============================================================
interface RequireRoleProps {
    children: React.ReactNode;
    roles: UserRole[];
    redirectTo?: string;
}

export function RequireRole({ children, roles, redirectTo = '/' }: RequireRoleProps) {
    const { isAuthenticated, initialized, hasRole } = useAuth();
    const location = useLocation();

    if (!initialized) return <AuthLoading />;

    if (!isAuthenticated) {
        return <Navigate to="/auth/login" state={{ from: location }} replace />;
    }

    if (!hasRole(roles)) {
        return <Navigate to={redirectTo} replace />;
    }

    return <>{children}</>;
}

// ============================================================
// RequireAdmin — admin, superadmin, or moderator can enter
// the admin layout. Individual pages control finer permissions.
// ============================================================
export function RequireAdmin({ children }: { children: React.ReactNode }) {
    return (
        <RequireRole roles={['admin', 'superadmin', 'moderator']} redirectTo="/">
            {children}
        </RequireRole>
    );
}

// ============================================================
// RequireSpeakerPortal — speaker or admin
// ============================================================
export function RequireSpeakerPortal({ children }: { children: React.ReactNode }) {
    return (
        <RequireRole roles={['speaker', 'admin', 'superadmin']} redirectTo="/">
            {children}
        </RequireRole>
    );
}

// ============================================================
// RequireSponsorPortal — sponsor or admin
// ============================================================
export function RequireSponsorPortal({ children }: { children: React.ReactNode }) {
    return (
        <RequireRole roles={['sponsor', 'admin', 'superadmin']} redirectTo="/">
            {children}
        </RequireRole>
    );
}

// ============================================================
// RedirectIfAuthenticated — for login/register pages
// ============================================================
export function RedirectIfAuthenticated({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, initialized, role } = useAuth();

    if (!initialized) return <AuthLoading />;

    if (isAuthenticated) {
        if (role === 'superadmin' || role === 'admin') {
            return <Navigate to="/admin" replace />;
        }
        if (role === 'speaker') {
            return <Navigate to="/portal/speaker" replace />;
        }
        if (role === 'sponsor') {
            return <Navigate to="/portal/sponsor" replace />;
        }
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
}
