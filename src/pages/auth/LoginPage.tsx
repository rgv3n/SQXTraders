import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/i18n/TranslationProvider';
import toast from 'react-hot-toast';
import './AuthPages.css';

const schema = z.object({
    email: z.string().email({ message: 'Enter a valid email' }),
    password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
});

type LoginForm = z.infer<typeof schema>;

export default function LoginPage() {
    const { signIn } = useAuth();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const [showPassword, setShowPassword] = useState(false);

    const from = (location.state as any)?.from ?? '/';

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginForm>({ resolver: zodResolver(schema) });

    const onSubmit = async (data: LoginForm) => {
        const { error } = await signIn(data.email, data.password);
        if (error) {
            toast.error(t('auth.login.error', error.message ?? 'Login failed'));
        } else {
            toast.success(t('auth.login.success', 'Welcome back!'));
            navigate(from, { replace: true });
        }
    };

    return (
        <div className="auth-page">
            <div className="hero-glow hero-glow--gold" style={{ top: '-80px', left: '40%' }} />
            <div className="auth-card card animate-fade-in-up">
                {/* Logo */}
                <div className="auth-card__logo">
                    <span className="text-gold font-display" style={{ fontSize: 'var(--text-2xl)', fontWeight: 800 }}>⬡ SQX</span>
                    <span className="text-muted" style={{ fontSize: 'var(--text-sm)', marginTop: '2px' }}>EventOS</span>
                </div>

                <h1 className="auth-card__title">{t('auth.login.title', 'Sign in')}</h1>
                <p className="auth-card__subtitle text-muted">
                    {t('auth.login.subtitle', "Don't have an account?")}{' '}
                    <Link to="/auth/register" className="text-gold">{t('auth.login.register_link', 'Create one')}</Link>
                </p>

                <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
                    <div className="form-group">
                        <label className="form-label" htmlFor="email">
                            {t('auth.field.email', 'Email')}
                        </label>
                        <input
                            id="email"
                            type="email"
                            autoComplete="email"
                            className={`form-input ${errors.email ? 'form-input--error' : ''}`}
                            placeholder="you@example.com"
                            {...register('email')}
                        />
                        {errors.email && <p className="form-error">{errors.email.message}</p>}
                    </div>

                    <div className="form-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <label className="form-label" htmlFor="password">
                                {t('auth.field.password', 'Password')}
                            </label>
                            <Link to="/auth/forgot-password" className="text-muted text-xs" tabIndex={-1}>
                                {t('auth.login.forgot', 'Forgot password?')}
                            </Link>
                        </div>
                        <div className="form-input-wrapper">
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="current-password"
                                className={`form-input ${errors.password ? 'form-input--error' : ''}`}
                                placeholder="••••••••"
                                {...register('password')}
                            />
                            <button
                                type="button"
                                className="form-input-icon"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                        </div>
                        {errors.password && <p className="form-error">{errors.password.message}</p>}
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="btn btn--primary w-full"
                        style={{ marginTop: 'var(--space-2)' }}
                    >
                        {isSubmitting ? (
                            <span className="loading-dots">{t('auth.login.signing_in', 'Signing in')}</span>
                        ) : (
                            <>
                                {t('auth.login.submit', 'Sign in')}
                                <ArrowRight size={16} />
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
