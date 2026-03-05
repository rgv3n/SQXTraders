import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse) {
    const base = process.env.VITE_APP_URL ?? 'https://sqxtraders.vercel.app';

    const content = `User-agent: *
Allow: /

# Block admin and private areas
Disallow: /admin/
Disallow: /admin
Disallow: /auth/
Disallow: /api/
Disallow: /my-tickets

# Avoid duplicate content from query parameters
Disallow: /*?*cancelled=*
Disallow: /*?*session_id=*

Sitemap: ${base}/sitemap.xml
`;

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.status(200).send(content);
}
