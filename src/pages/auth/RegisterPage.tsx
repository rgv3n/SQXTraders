import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, ArrowRight, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/i18n/TranslationProvider';
import toast from 'react-hot-toast';

const schema = z.object({
    display_name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
    email: z.string().email({ message: 'Enter a valid email' }),
    password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
    gdpr_consent: z.boolean().refine((v) => v === true, {
        message: 'You must accept the privacy policy',
    }),
});

type RegisterForm = z.infer<typeof schema>;

export default function RegisterPage() {
    const { signUp } = useAuth();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<RegisterForm>({ resolver: zodResolver(schema) });

    const onSubmit = async (data: RegisterForm) => {
        const { error } = await signUp(data.email, data.password, data.display_name, data.gdpr_consent);
        if (error) {
            toast.error(t('auth.register.error', error.message ?? 'Registration failed'));
        } else {
            toast.success(t('auth.register.success', 'Account created! Check your email.'));
            navigate('/auth/login');
        }
    };

    return (
        <div className="auth-page">
            <div className="hero-glow hero-glow--blue" style={{ top: '-80px', left: '40%' }} />
            <div className="auth-card card animate-fade-in-up">
                {/* Logo */}
                <div className="auth-card__logo">
                    <span className="text-gold font-display" style={{ fontSize: 'var(--text-2xl)', fontWeight: 800 }}>⬡ SQX</span>
                    <span className="text-muted" style={{ fontSize: 'var(--text-sm)', marginTop: '2px' }}>EventOS</span>
                </div>

                <h1 className="auth-card__title">{t('auth.register.title', 'Create account')}</h1>
                <p className="auth-card__subtitle text-muted">
                    {t('auth.register.subtitle', 'Already have an account?')}{' '}
                    <Link to="/auth/login" className="text-gold">{t('auth.register.login_link', 'Sign in')}</Link>
                </p>

                <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
                    <div className="form-group">
                        <label className="form-label" htmlFor="display_name">
                            {t('auth.field.name', 'Full name')}
                        </label>
                        <input
                            id="display_name"
                            type="text"
                            autoComplete="name"
                            className={`form-input ${errors.display_name ? 'form-input--error' : ''}`}
                            placeholder={t('auth.field.name_placeholder', 'Your name')}
                            {...register('display_name')}
                        />
                        {errors.display_name && <p className="form-error">{errors.display_name.message}</p>}
                    </div>

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
                        <label className="form-label" htmlFor="password">
                            {t('auth.field.password', 'Password')}
                        </label>
                        <div className="form-input-wrapper">
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="new-password"
                                className={`form-input ${errors.password ? 'form-input--error' : ''}`}
                                placeholder={t('auth.field.password_hint', 'Min. 8 characters')}
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

                    {/* GDPR Consent */}
                    <div className="form-group">
                        <label className="form-checkbox-label">
                            <input
                                id="gdpr_consent"
                                type="checkbox"
                                className="form-checkbox"
                                {...register('gdpr_consent')}
                            />
                            <span className="text-sm text-muted">
                                {t('auth.register.gdpr_text', 'I agree to the')}{' '}
                                <Link to="/privacy" className="text-gold" tabIndex={-1}>
                                    {t('auth.register.gdpr_link', 'Privacy Policy')}
                                </Link>{' '}
                                {t('auth.register.gdpr_and', 'and')}{' '}
                                <Link to="/terms" className="text-gold" tabIndex={-1}>
                                    {t('auth.register.terms_link', 'Terms of Service')}
                                </Link>
                            </span>
                        </label>
                        {errors.gdpr_consent && <p className="form-error">{errors.gdpr_consent.message}</p>}
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="btn btn--primary w-full"
                        style={{ marginTop: 'var(--space-2)' }}
                    >
                        {isSubmitting ? (
                            <span className="loading-dots">{t('auth.register.creating', 'Creating account')}</span>
                        ) : (
                            <>
                                <Shield size={14} />
                                {t('auth.register.submit', 'Create account')}
                                <ArrowRight size={16} />
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
