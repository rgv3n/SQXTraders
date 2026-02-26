import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Mail } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/i18n/TranslationProvider';
import toast from 'react-hot-toast';
import './AuthPages.css';

const schema = z.object({
    email: z.string().email({ message: 'Enter a valid email' }),
});

type ForgotPasswordForm = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
    const { resetPassword } = useAuth();
    const { t } = useTranslation();
    const [isSent, setIsSent] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<ForgotPasswordForm>({ resolver: zodResolver(schema) });

    const onSubmit = async (data: ForgotPasswordForm) => {
        const { error } = await resetPassword(data.email);
        if (error) {
            toast.error(t('auth.forgot.error', error.message ?? 'Error sending reset link'));
        } else {
            toast.success(t('auth.forgot.success', 'Reset link sent to your email'));
            setIsSent(true);
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

                <h1 className="auth-card__title">{t('auth.forgot.title', 'Forgot password')}</h1>
                <p className="auth-card__subtitle text-muted">
                    {isSent
                        ? t('auth.forgot.sent_desc', 'Check your email for a link to reset your password.')
                        : t('auth.forgot.description', 'Enter your email and we will send you a link to reset your password.')
                    }
                </p>

                {isSent ? (
                    <div style={{ textAlign: 'center' }}>
                        <Link to="/auth/login" className="btn btn--secondary w-full">
                            <ArrowLeft size={16} />
                            {t('auth.forgot.back_to_login', 'Back to login')}
                        </Link>
                    </div>
                ) : (
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

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="btn btn--primary w-full"
                            style={{ marginTop: 'var(--space-2)' }}
                        >
                            {isSubmitting ? (
                                <span className="loading-dots">{t('auth.forgot.sending', 'Sending')}</span>
                            ) : (
                                <>
                                    {t('auth.forgot.submit', 'Send Reset Link')}
                                    <Mail size={16} />
                                </>
                            )}
                        </button>

                        <div style={{ textAlign: 'center', marginTop: 'var(--space-4)' }}>
                            <Link to="/auth/login" className="text-gold text-sm flex items-center justify-center gap-2">
                                <ArrowLeft size={14} />
                                {t('auth.forgot.back_link', 'Back to sign in')}
                            </Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
