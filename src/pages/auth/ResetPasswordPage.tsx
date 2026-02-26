import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/i18n/TranslationProvider';
import toast from 'react-hot-toast';
import './AuthPages.css';

const schema = z.object({
    password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

type ResetPasswordForm = z.infer<typeof schema>;

export default function ResetPasswordPage() {
    const { updatePassword } = useAuth();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<ResetPasswordForm>({ resolver: zodResolver(schema) });

    const onSubmit = async (data: ResetPasswordForm) => {
        const { error } = await updatePassword(data.password);
        if (error) {
            toast.error(t('auth.reset.error', error.message ?? 'Password update failed'));
        } else {
            toast.success(t('auth.reset.success', 'Password updated successfully!'));
            navigate('/auth/login', { replace: true });
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

                <h1 className="auth-card__title">{t('auth.reset.title', 'Reset password')}</h1>
                <p className="auth-card__subtitle text-muted">
                    {t('auth.reset.subtitle', 'Enter your new password below.')}
                </p>

                <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
                    <div className="form-group">
                        <label className="form-label" htmlFor="password">
                            {t('auth.field.new_password', 'New Password')}
                        </label>
                        <div className="form-input-wrapper">
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="new-password"
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

                    <div className="form-group">
                        <label className="form-label" htmlFor="confirmPassword">
                            {t('auth.field.confirm_password', 'Confirm Password')}
                        </label>
                        <input
                            id="confirmPassword"
                            type="password"
                            autoComplete="new-password"
                            className={`form-input ${errors.confirmPassword ? 'form-input--error' : ''}`}
                            placeholder="••••••••"
                            {...register('confirmPassword')}
                        />
                        {errors.confirmPassword && <p className="form-error">{errors.confirmPassword.message}</p>}
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="btn btn--primary w-full"
                        style={{ marginTop: 'var(--space-2)' }}
                    >
                        {isSubmitting ? (
                            <span className="loading-dots">{t('auth.reset.updating', 'Updating')}</span>
                        ) : (
                            <>
                                {t('auth.reset.submit', 'Update Password')}
                                <CheckCircle size={16} />
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
