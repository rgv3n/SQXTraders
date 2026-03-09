/**
 * SEO component — React 19 native document metadata.
 * Tags rendered here are automatically hoisted to <head> by React 19.
 * No external library needed.
 */

const APP_NAME = 'SQX Traders';
const BASE_URL = import.meta.env.VITE_APP_URL ?? 'https://sqxtraders.vercel.app';
const DEFAULT_IMAGE = `${BASE_URL}/og-default.png`;
const TWITTER_HANDLE = '@SQXTraders';

interface SEOProps {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
    type?: 'website' | 'article';
    noIndex?: boolean;
    /** JSON-LD structured data objects (Schema.org) */
    jsonLd?: object | object[];
}

export default function SEO({
    title,
    description,
    image = DEFAULT_IMAGE,
    url,
    type = 'website',
    noIndex = false,
    jsonLd,
}: SEOProps) {
    const fullTitle = title ? `${title} — ${APP_NAME}` : `${APP_NAME} — The Premier Trading Events Platform`;
    const desc = description ?? 'Discover and register for exclusive trading events, conferences and networking meetups. SQX Traders connects the global trading community.';
    const canonical = url ? (url.startsWith('http') ? url : `${BASE_URL}${url}`) : undefined;

    const schemas = jsonLd
        ? Array.isArray(jsonLd) ? jsonLd : [jsonLd]
        : [];

    return (
        <>
            {/* Primary */}
            <title>{fullTitle}</title>
            <meta name="description" content={desc} />
            {noIndex
                ? <meta name="robots" content="noindex, nofollow" />
                : <meta name="robots" content="index, follow" />
            }
            {canonical && <link rel="canonical" href={canonical} />}

            {/* Open Graph */}
            <meta property="og:site_name" content={APP_NAME} />
            <meta property="og:type" content={type} />
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={desc} />
            <meta property="og:image" content={image} />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
            {canonical && <meta property="og:url" content={canonical} />}

            {/* Twitter Card */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:site" content={TWITTER_HANDLE} />
            <meta name="twitter:title" content={fullTitle} />
            <meta name="twitter:description" content={desc} />
            <meta name="twitter:image" content={image} />

            {/* JSON-LD structured data */}
            {schemas.map((schema, i) => (
                <script
                    key={i}
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
                />
            ))}
        </>
    );
}
