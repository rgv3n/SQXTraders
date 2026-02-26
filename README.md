# SQX Traders — Event Platform

Platform for managing trading events, conferences and meetups.

Built with Vite + React 19 + TypeScript + Supabase + Stripe.

## Stack

- **Frontend**: React 19, TypeScript, React Router v7, TanStack Query
- **Backend**: Supabase (Postgres + Auth + RLS + Storage)
- **Payments**: Stripe Checkout + Webhooks (Vercel serverless)
- **Deployment**: Vercel

## Features

- Public event pages with countdown, agenda, speakers and sponsors
- Ticket purchase flow with Stripe (paid) or direct registration (free)
- QR code generation and check-in scanner
- Voucher / promo code system
- Admin panel: events, tickets, attendees, check-in, analytics, translations
- Role-based access: superadmin, admin, sponsor, speaker, visitor
- Bilingual (ES / EN)

## Developers

- [@rgv3n](https://github.com/rgv3n)
- Claude Sonnet 4.6

## Setup

```bash
npm install
cp .env.example .env.local
# fill in your Supabase + Stripe keys
npm run dev
```

Run migrations in order (`supabase/migrations/001_*.sql` → `013_*.sql`) via the Supabase SQL Editor.
