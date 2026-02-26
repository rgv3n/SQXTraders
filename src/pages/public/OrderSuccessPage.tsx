import { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, Clock, Ticket, ArrowRight, Download } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import QRCode from 'qrcode';

// ─── QR Canvas component ──────────────────────────────────────
function QRCanvas({ value }: { value: string }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        if (canvasRef.current) {
            QRCode.toCanvas(canvasRef.current, value, {
                width: 200,
                margin: 2,
                color: { dark: '#000000', light: '#ffffff' },
            });
        }
    }, [value]);

    function handleDownload() {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const link = document.createElement('a');
        link.download = `ticket-${value.slice(0, 8)}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
            <canvas ref={canvasRef} style={{ borderRadius: '0.5rem', border: '1px solid var(--color-border)' }} />
            <button onClick={handleDownload} className="btn btn--ghost btn--sm" style={{ gap: '0.4rem', display: 'flex', alignItems: 'center' }}>
                <Download size={14} /> Download QR
            </button>
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────
export default function OrderSuccessPage() {
    const [params] = useSearchParams();
    const attendeeId = params.get('attendee_id');   // free ticket flow
    const isFree     = params.get('free') === '1';  // free ticket flag
    const sessionId  = params.get('session_id');    // Stripe redirect

    // ── Fetch attendee (free path: attendee_id passed directly) ──
    const { data: attendee, isLoading: loadingAttendee } = useQuery({
        queryKey: ['success-attendee', attendeeId],
        enabled: !!attendeeId,
        queryFn: async () => {
            const { data } = await supabase
                .from('attendees')
                .select('*, orders(amount, ticket_type_id), ticket_types(name), events(title, start_date, venue_name)')
                .eq('id', attendeeId!)
                .single();
            return data;
        },
    });

    // ── Fetch order by stripe session (paid path) ─────────────
    const [pollCount, setPollCount] = useState(0);
    const { data: paidOrder, isLoading: loadingOrder } = useQuery({
        queryKey: ['success-order', sessionId, pollCount],
        enabled: !!sessionId && !isFree,
        refetchInterval: (query) => {
            // Poll until status is paid or we've tried 10 times (~30 s)
            const status = query.state.data?.status;
            if (status === 'paid' || pollCount >= 10) return false;
            return 3000;
        },
        queryFn: async () => {
            const { data } = await supabase
                .from('orders')
                .select('*, attendees(id, name, qr_code_value, ticket_types(name)), events(title, start_date, venue_name)')
                .eq('stripe_session_id', sessionId!)
                .single();
            return data;
        },
        retry: false,
    });

    // Auto-increment poll counter when paid order not yet confirmed
    useEffect(() => {
        if (!sessionId || paidOrder?.status === 'paid') return;
        const t = setTimeout(() => setPollCount((c) => c + 1), 3000);
        return () => clearTimeout(t);
    }, [sessionId, paidOrder, pollCount]);

    // ── Derive display data ───────────────────────────────────
    const isPaidFlow = !!sessionId && !isFree;
    const isPaid     = paidOrder?.status === 'paid';
    const isLoading  = loadingAttendee || loadingOrder;

    const displayAttendee = attendeeId
        ? attendee
        : paidOrder?.attendees?.[0] ?? paidOrder?.attendees;

    const displayEvent = attendeeId
        ? (attendee as any)?.events
        : (paidOrder as any)?.events;

    // ── Render ────────────────────────────────────────────────
    return (
        <div style={{
            minHeight: '80vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem 1rem',
        }}>
            <div style={{ width: '100%', maxWidth: '520px' }}>
                {isLoading ? (
                    <LoadingCard />
                ) : isPaidFlow && !isPaid ? (
                    <ProcessingCard />
                ) : (
                    <SuccessCard
                        attendee={displayAttendee}
                        event={displayEvent}
                        isFree={isFree || !isPaidFlow}
                    />
                )}
            </div>
        </div>
    );
}

// ─── Sub-components ───────────────────────────────────────────
function LoadingCard() {
    return (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <div style={{
                width: '48px', height: '48px', borderRadius: '50%',
                border: '3px solid var(--color-gold)', borderTopColor: 'transparent',
                animation: 'spin 0.8s linear infinite', margin: '0 auto 1.5rem',
            }} />
            <p style={{ color: 'var(--color-text-muted)' }}>Loading your order…</p>
        </div>
    );
}

function ProcessingCard() {
    return (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: 'rgba(234,179,8,0.1)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem',
            }}>
                <Clock size={32} color="var(--color-gold)" />
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: '0.75rem' }}>
                Payment processing…
            </h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem', lineHeight: 1.6 }}>
                Your payment was received. We're confirming your booking —
                this usually takes a few seconds.
            </p>
            <div style={{
                width: '200px', height: '4px', background: 'var(--color-border)',
                borderRadius: '2px', margin: '0 auto 2rem', overflow: 'hidden',
            }}>
                <div style={{
                    height: '100%', background: 'var(--color-gold)',
                    borderRadius: '2px', animation: 'progress-pulse 1.5s ease-in-out infinite',
                    width: '60%',
                }} />
            </div>
            <Link to="/my-tickets" className="btn btn--ghost">
                <Ticket size={15} /> View My Tickets
            </Link>
        </div>
    );
}

function SuccessCard({ attendee, event, isFree }: { attendee: any; event: any; isFree: boolean }) {
    const qrValue = attendee?.qr_code_value;
    const ticketName = attendee?.ticket_types?.name ?? attendee?.orders?.ticket_type_id ?? 'Ticket';

    return (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 2rem' }}>
            {/* Icon */}
            <div style={{
                width: '72px', height: '72px', borderRadius: '50%',
                background: 'rgba(34,197,94,0.1)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem',
            }}>
                <CheckCircle size={40} color="#22c55e" />
            </div>

            <h1 style={{
                fontFamily: 'var(--font-display)', fontSize: '1.75rem',
                marginBottom: '0.5rem', letterSpacing: '-0.01em',
            }}>
                You're registered!
            </h1>

            {event && (
                <p style={{ color: 'var(--color-gold)', fontWeight: 600, marginBottom: '0.25rem' }}>
                    {event.title}
                </p>
            )}
            {event?.start_date && (
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                    {new Date(event.start_date).toLocaleDateString('en-US', {
                        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                    })}
                </p>
            )}
            {event?.venue_name && (
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '2rem' }}>
                    {event.venue_name}
                </p>
            )}

            {/* Ticket badge */}
            <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.25)',
                borderRadius: '2rem', padding: '0.4rem 1rem',
                color: 'var(--color-gold)', fontSize: '0.8rem', fontWeight: 600,
                marginBottom: '2rem',
            }}>
                <Ticket size={14} /> {ticketName}
                {isFree && <span style={{ opacity: 0.7 }}>· Free</span>}
            </div>

            {/* QR Code */}
            {qrValue ? (
                <div style={{
                    background: 'var(--color-bg)', borderRadius: '0.75rem',
                    padding: '1.5rem', marginBottom: '2rem',
                    border: '1px solid var(--color-border)',
                }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Your entry QR code
                    </p>
                    <QRCanvas value={qrValue} />
                    <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.75rem', fontFamily: 'monospace' }}>
                        {qrValue}
                    </p>
                </div>
            ) : (
                <div style={{
                    background: 'rgba(234,179,8,0.05)', borderRadius: '0.75rem',
                    padding: '1.25rem', marginBottom: '2rem',
                    border: '1px solid rgba(234,179,8,0.15)',
                }}>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                        Your QR ticket will appear in <strong>My Tickets</strong> shortly.
                    </p>
                </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link to="/my-tickets" className="btn btn--primary" style={{ gap: '0.5rem', display: 'flex', alignItems: 'center' }}>
                    <Ticket size={15} /> My Tickets
                </Link>
                <Link to="/events" className="btn btn--ghost" style={{ gap: '0.5rem', display: 'flex', alignItems: 'center' }}>
                    More Events <ArrowRight size={15} />
                </Link>
            </div>
        </div>
    );
}
