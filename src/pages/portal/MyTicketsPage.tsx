import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import QRCode from 'qrcode';
import { Ticket, CheckCircle, Clock, Download } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/i18n/TranslationProvider';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

interface AttendeeTicket {
    id: string;
    name: string;
    email: string;
    qr_code_value: string;
    checkin_status: 'pending' | 'checked_in' | 'no_show';
    checkin_time: string | null;
    ticket_type: string;
    event_title: string;
    event_start: string;
    event_venue: string;
}

function QRCanvas({ value, size = 200 }: { value: string; size?: number }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (canvasRef.current) {
            QRCode.toCanvas(canvasRef.current, value, {
                width: size,
                margin: 2,
                color: { dark: '#000000', light: '#ffffff' },
                errorCorrectionLevel: 'M',
            });
        }
    }, [value, size]);

    return (
        <canvas
            ref={canvasRef}
            style={{ borderRadius: 8, display: 'block' }}
        />
    );
}

function downloadQR(canvasId: string, name: string) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `ticket-${name.replace(/\s+/g, '-').toLowerCase()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

export default function MyTicketsPage() {
    const { user } = useAuth();
    const { t } = useTranslation();

    const { data: tickets = [], isLoading } = useQuery({
        queryKey: ['my-tickets', user?.id],
        enabled: !!user,
        queryFn: async () => {
            const { data } = await supabase
                .from('attendees')
                .select(`
                    id, name, email, qr_code_value,
                    checkin_status, checkin_time,
                    ticket_types(name),
                    events(title, start_date, venue_name)
                `)
                .eq('user_id', user!.id)
                .order('created_at', { ascending: false });

            return ((data ?? []) as any[]).map(a => ({
                ...a,
                ticket_type: a.ticket_types?.name ?? '—',
                event_title: a.events?.title ?? '—',
                event_start: a.events?.start_date ?? null,
                event_venue: a.events?.venue_name ?? '',
            })) as AttendeeTicket[];
        },
    });

    return (
        <div className="container section">
            <style>{`
                .ticket-card { display: grid; grid-template-columns: auto 1fr; gap: var(--space-8); align-items: start; padding: var(--space-8); }
                @media (max-width: 600px) {
                    .ticket-card { grid-template-columns: 1fr; }
                    .ticket-card > div:first-child { display: flex; flex-direction: column; align-items: center; }
                }
            `}</style>
            <div style={{ marginBottom: 'var(--space-8)' }}>
                <h1 className="section-title" style={{ marginBottom: 'var(--space-2)' }}>
                    <Ticket size={28} style={{ display: 'inline', marginRight: 'var(--space-3)', color: 'var(--color-gold)' }} />
                    {t('my_tickets.title', 'My Tickets')}
                </h1>
                <p className="text-muted">
                    {t('my_tickets.subtitle', 'Show your QR code at the event entrance to check in.')}
                </p>
            </div>

            {isLoading && (
                <p className="text-muted">{t('common.loading', 'Loading...')}</p>
            )}

            {!isLoading && tickets.length === 0 && (
                <div className="card" style={{ textAlign: 'center', padding: 'var(--space-16)' }}>
                    <Ticket size={48} style={{ color: 'var(--color-text-faint)', marginBottom: 'var(--space-4)' }} />
                    <p style={{ color: 'var(--color-text-muted)' }}>
                        {t('my_tickets.empty', "You don't have any tickets yet.")}
                    </p>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                {tickets.map(ticket => (
                    <div key={ticket.id} className="card ticket-card">
                        {/* QR Code */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)' }}>
                            <div style={{
                                padding: 'var(--space-3)',
                                background: '#fff',
                                borderRadius: 'var(--radius-md)',
                                lineHeight: 0,
                            }}>
                                <QRCanvas value={ticket.qr_code_value} size={180} />
                            </div>
                            <button
                                className="btn btn--ghost btn--sm"
                                onClick={() => {
                                    const canvas = document.querySelector(`[data-ticket-id="${ticket.id}"] canvas`) as HTMLCanvasElement | null;
                                    if (!canvas) return;
                                    const link = document.createElement('a');
                                    link.download = `ticket-${ticket.name.replace(/\s+/g, '-').toLowerCase()}.png`;
                                    link.href = canvas.toDataURL('image/png');
                                    link.click();
                                }}
                                data-ticket-id={ticket.id}
                                style={{ fontSize: 'var(--text-xs)' }}
                            >
                                <Download size={12} />
                                {t('my_tickets.download_qr', 'Save QR')}
                            </button>
                        </div>

                        {/* Ticket info */}
                        <div data-ticket-id={ticket.id}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
                                <span className="badge badge--gold" style={{ fontSize: 'var(--text-xs)' }}>
                                    {ticket.ticket_type}
                                </span>
                                {ticket.checkin_status === 'checked_in' ? (
                                    <span className="badge badge--green" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 'var(--text-xs)' }}>
                                        <CheckCircle size={11} />
                                        {t('my_tickets.checked_in', 'Checked in')}
                                        {ticket.checkin_time && ` · ${format(new Date(ticket.checkin_time), 'HH:mm')}`}
                                    </span>
                                ) : (
                                    <span className="badge badge--default" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 'var(--text-xs)' }}>
                                        <Clock size={11} />
                                        {t('my_tickets.pending', 'Not checked in yet')}
                                    </span>
                                )}
                            </div>

                            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-text)', marginBottom: 'var(--space-2)', fontFamily: 'var(--font-display)' }}>
                                {ticket.event_title}
                            </h2>

                            {ticket.event_start && (
                                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-1)' }}>
                                    {format(new Date(ticket.event_start), 'EEEE, MMMM d, yyyy · HH:mm')}
                                </p>
                            )}
                            {ticket.event_venue && (
                                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)' }}>
                                    {ticket.event_venue}
                                </p>
                            )}

                            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
                                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                                    {t('my_tickets.registered_as', 'Registered as')}{' '}
                                    <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>{ticket.name}</span>
                                </p>
                                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', marginTop: 'var(--space-1)', fontFamily: 'monospace' }}>
                                    #{ticket.qr_code_value.slice(0, 8).toUpperCase()}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
