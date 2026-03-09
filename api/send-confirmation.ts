import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { sendTicketConfirmation } from './lib/mailer';

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function cors(res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', process.env.VITE_APP_URL ?? '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    // Verify auth
    const token = (req.headers.authorization ?? '').replace('Bearer ', '').trim();
    if (!token) return res.status(401).json({ error: 'Missing auth token' });
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ error: 'Invalid token' });

    const { attendee_id } = req.body ?? {};
    if (!attendee_id) return res.status(400).json({ error: 'Missing attendee_id' });

    // Fetch attendee + event + ticket type
    const { data: attendee, error } = await supabase
        .from('attendees')
        .select('*, events(title, start_date, venue_name), ticket_types(name)')
        .eq('id', attendee_id)
        .eq('user_id', user.id)   // ensure it belongs to the caller
        .single();

    if (error || !attendee) return res.status(404).json({ error: 'Attendee not found' });

    try {
        await sendTicketConfirmation({
            to: attendee.email,
            attendeeName: attendee.name,
            eventTitle: (attendee as any).events?.title ?? 'Event',
            eventDate: (attendee as any).events?.start_date
                ? new Date((attendee as any).events.start_date).toLocaleDateString('en-GB', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                })
                : undefined,
            eventVenue: (attendee as any).events?.venue_name ?? undefined,
            ticketType: (attendee as any).ticket_types?.name ?? 'Ticket',
            isFree: true,
            qrCodeValue: attendee.qr_code_value,
        });
        return res.status(200).json({ sent: true });
    } catch (err: any) {
        console.error('send-confirmation error:', err);
        return res.status(500).json({ error: err.message });
    }
}
