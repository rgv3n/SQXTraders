import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// ─── Supabase admin client (bypasses RLS) ────────────────────
const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ─── Stripe client ────────────────────────────────────────────
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-02-24.acacia' as any,
});

// ─── Helpers ─────────────────────────────────────────────────
function corsHeaders() {
    return {
        'Access-Control-Allow-Origin': process.env.VITE_APP_URL ?? '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
}

function isVoucherValid(v: any): boolean {
    if (!v.is_active) return false;
    const now = new Date();
    if (v.valid_from && new Date(v.valid_from) > now) return false;
    if (v.valid_until && new Date(v.valid_until) < now) return false;
    if (v.max_uses !== null && v.uses_count >= v.max_uses) return false;
    return true;
}

function applyDiscount(price: number, voucher: any): number {
    if (voucher.discount_type === 'percentage') {
        return price * (voucher.discount_value / 100);
    }
    return Math.min(price, voucher.discount_value);
}

// ─── Handler ──────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).setHeader('Access-Control-Allow-Origin', process.env.VITE_APP_URL ?? '*')
            .setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
            .setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            .end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // ── Auth: verify Supabase JWT ──
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing authorization token' });
    }

    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const { event_id, ticket_type_id, attendee_details, voucher_code, event_slug } = req.body ?? {};

    if (!event_id || !ticket_type_id || !attendee_details?.name || !attendee_details?.email) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // ── Fetch ticket type ──
    const { data: ticket, error: ticketError } = await supabase
        .from('ticket_types')
        .select('*')
        .eq('id', ticket_type_id)
        .eq('event_id', event_id)
        .single();

    if (ticketError || !ticket) {
        return res.status(404).json({ error: 'Ticket type not found' });
    }

    if (!ticket.is_active) {
        return res.status(400).json({ error: 'This ticket type is no longer available' });
    }

    // ── Validate voucher if provided ──
    let voucher: any = null;
    let discountAmount = 0;

    if (voucher_code) {
        const { data: v } = await supabase
            .from('vouchers')
            .select('*')
            .eq('code', voucher_code.toUpperCase().trim())
            .maybeSingle();

        if (v && isVoucherValid(v) && (!v.event_id || v.event_id === event_id)) {
            voucher = v;
            discountAmount = applyDiscount(Number(ticket.price), v);
        }
    }

    const finalAmount = Math.max(0, Number(ticket.price) - discountAmount);

    // ── Create pending order ──
    const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
            user_id: user.id,
            event_id,
            ticket_type_id,
            status: 'pending',
            amount: finalAmount,
            currency: ticket.currency ?? 'EUR',
            voucher_id: voucher?.id ?? null,
            discount_applied: discountAmount,
            metadata: { attendee_details, original_price: ticket.price },
        })
        .select()
        .single();

    if (orderError || !order) {
        console.error('Order creation error:', orderError);
        return res.status(500).json({ error: 'Failed to create order' });
    }

    // ── Create Stripe Checkout Session ──
    const appUrl = process.env.VITE_APP_URL ?? 'http://localhost:5173';
    const cancelSlug = event_slug ?? event_id;

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        customer_email: user.email,
        success_url: `${appUrl}/order/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/events/${cancelSlug}/register?cancelled=1`,
        line_items: [
            {
                price_data: {
                    currency: (ticket.currency ?? 'EUR').toLowerCase(),
                    product_data: {
                        name: ticket.name,
                        description: ticket.description ?? undefined,
                        metadata: { ticket_type_id, event_id },
                    },
                    unit_amount: Math.round(finalAmount * 100), // cents
                },
                quantity: 1,
            },
        ],
        discounts: voucher ? [
            {
                coupon: await getOrCreateStripeCoupon(stripe, voucher, ticket.currency),
            },
        ] : undefined,
        metadata: {
            order_id: order.id,
            user_id: user.id,
            event_id,
            ticket_type_id,
            voucher_id: voucher?.id ?? '',
            discount_applied: String(discountAmount),
            attendee_name: attendee_details.name,
            attendee_email: attendee_details.email,
            attendee_phone: attendee_details.phone ?? '',
            attendee_company: attendee_details.company ?? '',
            attendee_job_title: attendee_details.job_title ?? '',
        },
    });

    // ── Store Stripe session_id in order ──
    await supabase
        .from('orders')
        .update({ stripe_session_id: session.id })
        .eq('id', order.id);

    return res.status(200).json({ url: session.url });
}

// Creates or retrieves a Stripe coupon for the given voucher
async function getOrCreateStripeCoupon(stripe: Stripe, voucher: any, currency: string): Promise<string> {
    const couponId = `voucher_${voucher.id}`;
    try {
        await stripe.coupons.retrieve(couponId);
        return couponId;
    } catch {
        // Create coupon
        const params: Stripe.CouponCreateParams =
            voucher.discount_type === 'percentage'
                ? { id: couponId, percent_off: Number(voucher.discount_value), duration: 'once' }
                : { id: couponId, amount_off: Math.round(Number(voucher.discount_value) * 100), currency: currency.toLowerCase(), duration: 'once' };

        const coupon = await stripe.coupons.create(params);
        return coupon.id;
    }
}
