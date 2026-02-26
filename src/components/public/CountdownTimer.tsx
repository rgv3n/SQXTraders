import { useEffect, useState } from 'react';
import { useTranslation } from '@/i18n/TranslationProvider';
import './CountdownTimer.css';

interface Props {
    targetDate: string;
}

interface TimeLeft {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
}

function getTimeLeft(target: string): TimeLeft {
    const diff = new Date(target).getTime() - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
    };
}

export default function CountdownTimer({ targetDate }: Props) {
    const { t } = useTranslation();
    const [timeLeft, setTimeLeft] = useState<TimeLeft>(getTimeLeft(targetDate));

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(getTimeLeft(targetDate));
        }, 1000);
        return () => clearInterval(timer);
    }, [targetDate]);

    const units = [
        { value: timeLeft.days, label: t('countdown.days', 'Days') },
        { value: timeLeft.hours, label: t('countdown.hours', 'Hours') },
        { value: timeLeft.minutes, label: t('countdown.minutes', 'Minutes') },
        { value: timeLeft.seconds, label: t('countdown.seconds', 'Seconds') },
    ];

    return (
        <div className="countdown">
            <p className="countdown__label">{t('countdown.label', 'Event starts in')}</p>
            <div className="countdown__grid">
                {units.map(({ value, label }) => (
                    <div key={label} className="countdown__unit">
                        <span className="countdown__value font-display">{String(value).padStart(2, '0')}</span>
                        <span className="countdown__unit-label">{label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
