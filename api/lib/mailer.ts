import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY!);
const FROM = process.env.EMAIL_FROM ?? 'SQX Traders <noreply@sqxtraders.com>';
const APP_URL = process.env.VITE_APP_URL ?? 'https://www.sqxtraders.com';

// ─── Shared styles ────────────────────────────────────────────
const base = `
  font-family: 'Inter', Arial, sans-serif;
  background: #000;
  color: #e8e8e8;
  margin: 0;
  padding: 0;
`;

function layout(content: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="${base}">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <!-- Header -->
    <div style="border-bottom:1px solid #1a1a2e;padding-bottom:24px;margin-bottom:32px;">
      <span style="font-size:20px;font-weight:800;letter-spacing:-0.02em;color:#fff;">SQX <span style="color:#e8e8e8;">Traders</span></span>
    </div>
    <!-- Content -->
    ${content}
    <!-- Footer -->
    <div style="border-top:1px solid #1a1a2e;margin-top:40px;padding-top:24px;font-size:12px;color:#40455a;text-align:center;">
      <p style="margin:0 0 4px;">SQX Traders · <a href="${APP_URL}" style="color:#72788f;text-decoration:none;">${APP_URL.replace('https://', '')}</a></p>
      <p style="margin:0;">If you have questions, reply to this email or contact support.</p>
    </div>
  </div>
</body>
</html>`;
}

// ─── Ticket Confirmation ──────────────────────────────────────
export interface TicketConfirmationData {
    to: string;
    attendeeName: string;
    eventTitle: string;
    eventDate?: string;
    eventVenue?: string;
    ticketType: string;
    isFree: boolean;
    qrCodeValue: string;
}

export async function sendTicketConfirmation(data: TicketConfirmationData) {
    const {
        to, attendeeName, eventTitle, eventDate,
        eventVenue, ticketType, isFree, qrCodeValue,
    } = data;

    const content = `
    <h1 style="font-size:24px;font-weight:800;color:#fff;margin:0 0 8px;">You're registered! 🎉</h1>
    <p style="color:#72788f;margin:0 0 32px;font-size:15px;">Hi ${attendeeName}, your spot is confirmed.</p>

    <!-- Event card -->
    <div style="background:#0d0d14;border:1px solid #1a1a2e;border-radius:12px;padding:24px;margin-bottom:24px;">
      <p style="font-size:11px;font-weight:700;letter-spacing:0.08em;color:#72788f;text-transform:uppercase;margin:0 0 8px;">Event</p>
      <h2 style="font-size:20px;font-weight:700;color:#fff;margin:0 0 12px;">${eventTitle}</h2>
      ${eventDate ? `<p style="color:#72788f;font-size:14px;margin:0 0 4px;">📅 ${eventDate}</p>` : ''}
      ${eventVenue ? `<p style="color:#72788f;font-size:14px;margin:0;">📍 ${eventVenue}</p>` : ''}
    </div>

    <!-- Ticket -->
    <div style="background:#0d0d14;border:1px solid #1a1a2e;border-radius:12px;padding:24px;margin-bottom:32px;">
      <p style="font-size:11px;font-weight:700;letter-spacing:0.08em;color:#72788f;text-transform:uppercase;margin:0 0 8px;">Your Ticket</p>
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <span style="font-size:16px;font-weight:700;color:#e8e8e8;">${ticketType}</span>
        <span style="background:#1a1a2e;color:${isFree ? '#22c55e' : '#e8e8e8'};font-size:12px;font-weight:700;padding:4px 12px;border-radius:999px;">${isFree ? 'FREE' : 'PAID'}</span>
      </div>
      <p style="font-size:11px;color:#40455a;margin:12px 0 0;font-family:monospace;">Ref: ${qrCodeValue.slice(0, 8).toUpperCase()}</p>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:32px;">
      <a href="${APP_URL}/my-tickets" style="display:inline-block;background:#e8e8e8;color:#0a0b0f;font-weight:700;font-size:14px;padding:14px 32px;border-radius:8px;text-decoration:none;">View My Tickets & QR Code</a>
    </div>

    <p style="font-size:13px;color:#72788f;text-align:center;">Your QR code is available in your ticket wallet. Present it at the entrance on event day.</p>
  `;

    return resend.emails.send({
        from: FROM,
        to,
        subject: `✅ You're registered for ${eventTitle}`,
        html: layout(content),
    });
}

// ─── Welcome Email (admin/moderator) ─────────────────────────
export interface WelcomeEmailData {
    to: string;
    displayName: string;
    role: 'admin' | 'moderator';
    temporaryPassword: string;
}

export async function sendWelcomeEmail(data: WelcomeEmailData) {
    const { to, displayName, role, temporaryPassword } = data;
    const roleLabel = role === 'admin' ? 'Administrator' : 'Moderator';

    const content = `
    <h1 style="font-size:24px;font-weight:800;color:#fff;margin:0 0 8px;">Welcome to SQX Traders</h1>
    <p style="color:#72788f;margin:0 0 32px;font-size:15px;">Hi ${displayName}, your management account has been created.</p>

    <div style="background:#0d0d14;border:1px solid #1a1a2e;border-radius:12px;padding:24px;margin-bottom:24px;">
      <p style="font-size:11px;font-weight:700;letter-spacing:0.08em;color:#72788f;text-transform:uppercase;margin:0 0 16px;">Your Credentials</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:8px 0;color:#72788f;font-size:14px;width:120px;">Email</td>
          <td style="padding:8px 0;color:#e8e8e8;font-size:14px;font-family:monospace;">${to}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#72788f;font-size:14px;">Password</td>
          <td style="padding:8px 0;color:#e8e8e8;font-size:14px;font-family:monospace;">${temporaryPassword}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#72788f;font-size:14px;">Role</td>
          <td style="padding:8px 0;color:#e8e8e8;font-size:14px;">${roleLabel}</td>
        </tr>
      </table>
    </div>

    <div style="background:#0d1a0d;border:1px solid #1a2e1a;border-radius:8px;padding:16px;margin-bottom:32px;">
      <p style="color:#22c55e;font-size:13px;margin:0;">⚠️ Please change your password after your first login.</p>
    </div>

    <div style="text-align:center;">
      <a href="${APP_URL}/auth/login" style="display:inline-block;background:#e8e8e8;color:#0a0b0f;font-weight:700;font-size:14px;padding:14px 32px;border-radius:8px;text-decoration:none;">Access Admin Panel</a>
    </div>
  `;

    return resend.emails.send({
        from: FROM,
        to,
        subject: `Welcome to SQX Traders — Your ${roleLabel} account`,
        html: layout(content),
    });
}
