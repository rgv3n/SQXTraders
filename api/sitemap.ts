import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const BASE = process.env.VITE_APP_URL ?? 'https://sqxtraders.vercel.app';

function url(path: string, lastmod?: string, changefreq = 'weekly', priority = '0.7') {
    return `  <url>
    <loc>${BASE}${path}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
    // Fetch published events
    const { data: events = [] } = await supabase
        .from('events')
        .select('slug, id, updated_at, start_date')
        .eq('status', 'published')
        .order('start_date', { ascending: false });

    const today = new Date().toISOString().split('T')[0];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${url('/', today, 'daily', '1.0')}
${url('/events', today, 'daily', '0.9')}
${(events as Array<{ slug: string; id: string; updated_at: string }>).map(e =>
    url(
        `/events/${e.slug || e.id}`,
        e.updated_at?.split('T')[0],
        'weekly',
        '0.8',
    )
).join('\n')}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).send(xml);
}
