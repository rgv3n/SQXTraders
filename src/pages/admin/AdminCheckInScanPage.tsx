import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Camera, CameraOff, CheckCircle, XCircle, RotateCcw, Keyboard } from 'lucide-react';
import { useTranslation } from '@/i18n/TranslationProvider';
import { supabase } from '@/lib/supabase';

type ScanResult =
    | { status: 'success'; name: string; ticket_type: string }
    | { status: 'already_in'; name: string; checkin_time: string }
    | { status: 'not_found' }
    | null;

// BarcodeDetector is a browser API — not in TS lib types yet
declare const BarcodeDetector: {
    new(options?: { formats: string[] }): {
        detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>>;
    };
    getSupportedFormats?(): Promise<string[]>;
};

export default function AdminCheckInScanPage() {
    const { t } = useTranslation();
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const scanningRef = useRef(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [cameraActive, setCameraActive] = useState(false);
    const [result, setResult] = useState<ScanResult>(null);
    const [processing, setProcessing] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [manualMode, setManualMode] = useState(false);
    const [manualValue, setManualValue] = useState('');
    const [barcodeSupported] = useState(() => typeof window !== 'undefined' && 'BarcodeDetector' in window);

    const stopCamera = useCallback(() => {
        scanningRef.current = false;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        setCameraActive(false);
    }, []);

    useEffect(() => {
        return () => stopCamera();
    }, [stopCamera]);

    const processQRValue = useCallback(async (value: string) => {
        if (processing) return;
        setProcessing(true);
        stopCamera();

        const { data: attendee, error } = await supabase
            .from('attendees')
            .select('id, name, checkin_status, checkin_time, ticket_types(name)')
            .eq('qr_code_value', value)
            .maybeSingle();

        if (error || !attendee) {
            setResult({ status: 'not_found' });
            setProcessing(false);
            return;
        }

        if ((attendee as any).checkin_status === 'checked_in') {
            setResult({
                status: 'already_in',
                name: (attendee as any).name,
                checkin_time: (attendee as any).checkin_time,
            });
            setProcessing(false);
            return;
        }

        await supabase.from('attendees').update({
            checkin_status: 'checked_in',
            checkin_time: new Date().toISOString(),
        }).eq('id', (attendee as any).id);

        setResult({
            status: 'success',
            name: (attendee as any).name,
            ticket_type: (attendee as any).ticket_types?.name ?? '—',
        });
        setProcessing(false);
    }, [processing, stopCamera]);

    const startCamera = useCallback(async () => {
        setCameraError(null);
        setResult(null);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
            });
            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }

            setCameraActive(true);
            scanningRef.current = true;

            const detector = new BarcodeDetector({ formats: ['qr_code'] });

            const scan = async () => {
                if (!scanningRef.current || !videoRef.current) return;
                try {
                    const barcodes = await detector.detect(videoRef.current);
                    if (barcodes.length > 0 && scanningRef.current) {
                        scanningRef.current = false;
                        await processQRValue(barcodes[0].rawValue);
                        return;
                    }
                } catch {
                    // detector may throw on unsupported format — continue
                }
                if (scanningRef.current) {
                    timeoutRef.current = setTimeout(scan, 250);
                }
            };

            timeoutRef.current = setTimeout(scan, 500);
        } catch {
            setCameraError(t('admin.checkin.scan.camera_denied', 'Camera access denied. Check browser permissions.'));
        }
    }, [processQRValue, t]);

    const reset = () => {
        setResult(null);
        setManualValue('');
        setProcessing(false);
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (manualValue.trim()) {
            processQRValue(manualValue.trim());
        }
    };

    return (
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
                <Link to="/admin/check-in" className="btn btn--ghost btn--sm">
                    <ArrowLeft size={16} />
                </Link>
                <div>
                    <h1 className="admin-page-title" style={{ margin: 0 }}>
                        {t('admin.checkin.scan.title', 'QR Scanner')}
                    </h1>
                    <p className="admin-page-subtitle" style={{ margin: 0 }}>
                        {t('admin.checkin.scan.subtitle', 'Point camera at attendee QR code')}
                    </p>
                </div>
            </div>

            {/* Result card */}
            {result && (
                <div style={{
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--space-8)',
                    marginBottom: 'var(--space-6)',
                    textAlign: 'center',
                    border: `1px solid ${result.status === 'success' ? 'var(--color-success)' : result.status === 'already_in' ? 'var(--color-gold)' : 'var(--color-error)'}`,
                    background: result.status === 'success'
                        ? 'rgba(34,197,94,0.08)'
                        : result.status === 'already_in'
                        ? 'var(--color-gold-dim)'
                        : 'rgba(239,68,68,0.08)',
                }}>
                    {result.status === 'success' && (
                        <>
                            <CheckCircle size={48} style={{ color: 'var(--color-success)', marginBottom: 'var(--space-4)' }} />
                            <p style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--color-text)', marginBottom: 'var(--space-2)' }}>
                                {t('admin.checkin.scan.welcome', 'Welcome!')}
                            </p>
                            <p style={{ fontSize: 'var(--text-xl)', color: 'var(--color-text)', marginBottom: 'var(--space-1)' }}>
                                {result.name}
                            </p>
                            <span className="badge badge--default">{result.ticket_type}</span>
                        </>
                    )}
                    {result.status === 'already_in' && (
                        <>
                            <CheckCircle size={48} style={{ color: 'var(--color-gold)', marginBottom: 'var(--space-4)' }} />
                            <p style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-text)', marginBottom: 'var(--space-2)' }}>
                                {t('admin.checkin.scan.already_in', 'Already checked in')}
                            </p>
                            <p style={{ color: 'var(--color-text-muted)' }}>{result.name}</p>
                            {result.checkin_time && (
                                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
                                    {new Date(result.checkin_time).toLocaleTimeString()}
                                </p>
                            )}
                        </>
                    )}
                    {result.status === 'not_found' && (
                        <>
                            <XCircle size={48} style={{ color: 'var(--color-error)', marginBottom: 'var(--space-4)' }} />
                            <p style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-text)', marginBottom: 'var(--space-2)' }}>
                                {t('admin.checkin.scan.not_found', 'QR not found')}
                            </p>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                                {t('admin.checkin.scan.not_found_hint', 'This QR code is not registered in the system.')}
                            </p>
                        </>
                    )}
                    <button className="btn btn--primary" style={{ marginTop: 'var(--space-6)' }} onClick={reset}>
                        <RotateCcw size={16} />
                        {t('admin.checkin.scan.scan_again', 'Scan another')}
                    </button>
                </div>
            )}

            {/* Camera viewport */}
            {!result && (
                <div style={{
                    position: 'relative',
                    borderRadius: 'var(--radius-lg)',
                    overflow: 'hidden',
                    background: 'var(--color-surface)',
                    border: `1px solid ${cameraActive ? 'var(--color-gold)' : 'var(--color-border)'}`,
                    aspectRatio: '1 / 1',
                    marginBottom: 'var(--space-4)',
                    transition: 'border-color var(--transition-base)',
                }}>
                    <video
                        ref={videoRef}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: cameraActive ? 'block' : 'none' }}
                        playsInline
                        muted
                    />

                    {/* Placeholder when camera is off */}
                    {!cameraActive && !processing && (
                        <div style={{
                            position: 'absolute', inset: 0,
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            gap: 'var(--space-4)',
                            color: 'var(--color-text-muted)',
                        }}>
                            <CameraOff size={48} style={{ opacity: 0.4 }} />
                            <p style={{ fontSize: 'var(--text-sm)' }}>
                                {cameraError ?? t('admin.checkin.scan.camera_off', 'Camera is off')}
                            </p>
                        </div>
                    )}

                    {/* Processing overlay */}
                    {processing && (
                        <div style={{
                            position: 'absolute', inset: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'rgba(8,9,13,0.75)',
                            color: 'var(--color-text)',
                            fontSize: 'var(--text-sm)',
                            gap: 'var(--space-3)',
                        }}>
                            <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--color-gold)', borderTopColor: 'transparent', animation: 'spin 0.6s linear infinite' }} />
                            {t('admin.checkin.scan.checking', 'Checking...')}
                        </div>
                    )}

                    {/* Scan viewfinder overlay */}
                    {cameraActive && (
                        <div style={{
                            position: 'absolute', inset: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            pointerEvents: 'none',
                        }}>
                            <div style={{
                                width: '60%', aspectRatio: '1 / 1',
                                border: '2px solid var(--color-gold)',
                                borderRadius: 'var(--radius-md)',
                                boxShadow: '0 0 0 9999px rgba(8,9,13,0.5)',
                            }} />
                        </div>
                    )}
                </div>
            )}

            {/* Controls */}
            {!result && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    {barcodeSupported ? (
                        cameraActive ? (
                            <button className="btn btn--ghost" onClick={stopCamera}>
                                <Camera size={16} />
                                {t('admin.checkin.scan.stop', 'Stop camera')}
                            </button>
                        ) : (
                            <button className="btn btn--primary" onClick={startCamera} disabled={processing}>
                                <Camera size={16} />
                                {t('admin.checkin.scan.start', 'Start camera')}
                            </button>
                        )
                    ) : (
                        <div style={{
                            padding: 'var(--space-4)', borderRadius: 'var(--radius-md)',
                            background: 'var(--color-surface-2)', color: 'var(--color-text-muted)',
                            fontSize: 'var(--text-sm)', textAlign: 'center',
                        }}>
                            {t('admin.checkin.scan.not_supported', 'QR scanning is not supported in this browser. Use Chrome on Android or desktop.')}
                        </div>
                    )}

                    {/* Manual input toggle */}
                    <button
                        className="btn btn--ghost btn--sm"
                        style={{ alignSelf: 'center', gap: 6 }}
                        onClick={() => setManualMode(!manualMode)}
                    >
                        <Keyboard size={14} />
                        {manualMode
                            ? t('admin.checkin.scan.hide_manual', 'Hide manual entry')
                            : t('admin.checkin.scan.manual_entry', 'Enter code manually')}
                    </button>

                    {manualMode && (
                        <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: 'var(--space-3)' }}>
                            <input
                                className="form-input"
                                style={{ flex: 1 }}
                                placeholder={t('admin.checkin.scan.manual_placeholder', 'Paste or type QR value...')}
                                value={manualValue}
                                onChange={e => setManualValue(e.target.value)}
                                autoFocus
                            />
                            <button type="submit" className="btn btn--primary" disabled={!manualValue.trim()}>
                                {t('admin.checkin.scan.confirm', 'Check In')}
                            </button>
                        </form>
                    )}
                </div>
            )}

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
