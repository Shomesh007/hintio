# Design Document: SEO Optimization

## Overview

This document describes the technical design for improving the SEO posture of the Hintio landing page (hintio.tech). The site is a React 19 / Vite SPA deployed on Vercel. All SEO improvements are static — they target `index.html`, `public/sitemap.xml`, `public/robots.txt`, `public/site.webmanifest`, and `src/App.tsx`. No new routes, backend services, or build pipeline changes are required.

The goal is to rank competitively for terms like "AI interview copilot", "real-time interview assistant", "invisible overlay", and "undetectable AI" against competitors such as Cluely, Final Round AI, Interview Sidekick, and Verve Copilot.

---

## Architecture

All changes are confined to static files and the single React component file. There is no server-side rendering, no dynamic meta tag injection, and no new dependencies required.

```
index.html          ← Head_Block changes: JSON-LD, meta tags, preload hints
public/
  sitemap.xml       ← Add lastmod, /help URL, changefreq, priority
  robots.txt        ← Add Disallow /api/, Crawl-delay
  site.webmanifest  ← Populate icons array
src/
  App.tsx           ← Semantic HTML, ARIA, heading hierarchy, keyword copy
```

The SPA renders into `<div id="root">`. Because it is a client-rendered SPA, all structured data and meta tags must live in `index.html` — they cannot be injected by React at runtime for crawler visibility (Googlebot does execute JavaScript, but static placement is more reliable and faster to index).

---

## Components and Interfaces

### 1. JSON-LD Structured Data Blocks (index.html)

Three separate `<script type="application/ld+json">` blocks are added to the Head_Block. Keeping them separate makes each schema independently parseable and easier to maintain.

**Block A — SoftwareApplication**
```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "hintio",
  "description": "...",
  "url": "https://www.hintio.tech",
  "operatingSystem": "Windows, macOS",
  "applicationCategory": "BusinessApplication",
  "offers": [
    {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "name": "Free Trial"
    }
  ]
}
```

**Block B — Organization**
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "hintio",
  "url": "https://www.hintio.tech",
  "logo": "https://www.hintio.tech/icon-512.png"
}
```

**Block C — FAQPage**
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Can interviewers detect hintio?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. hintio runs as a custom transparent window..."
      }
    },
    ...
  ]
}
```

### 2. Meta Tag Additions (index.html)

New tags to add to the existing Head_Block:

| Tag | Value |
|-----|-------|
| `<meta name="keywords">` | Full Keyword_Set comma-separated |
| `<meta name="author">` | `hintio` |
| `<meta name="application-name">` | `hintio` |
| `<meta property="og:image:width">` | `1200` |
| `<meta property="og:image:height">` | `630` |
| `<meta property="og:locale">` | `en_US` |
| `<meta name="twitter:site">` | `@hintioapp` |
| `<meta name="twitter:creator">` | `@hintioapp` |
| `<meta name="apple-mobile-web-app-capable">` | `yes` |
| `<meta name="apple-mobile-web-app-status-bar-style">` | `black-translucent` |
| `<meta name="apple-mobile-web-app-title">` | `hintio` |

Existing tags to update:

| Tag | Current | Updated |
|-----|---------|---------|
| `<title>` | `hintio \| The invisible overlay that wins interviews` | `hintio — AI Interview Copilot & Real-Time Assistant` |
| `<meta name="description">` | Generic copy | Keyword-rich, ≤160 chars, ≥3 Keyword_Set terms |
| `<meta property="og:description">` | Generic copy | Keyword-rich, ≤200 chars, ≥2 Keyword_Set terms |

### 3. Preload Hint (index.html)

Add a `<link rel="preload" as="style">` for the primary Google Fonts URL. The existing `<link href="...fonts.googleapis.com/css2?...&display=swap">` already includes `display=swap`, satisfying the font-display requirement. The preload hint is added above the existing stylesheet link:

```html
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" />
```

### 4. Sitemap (public/sitemap.xml)

Add `<lastmod>` to the existing homepage entry and add a second entry for `/help`:

```xml
<url>
  <loc>https://www.hintio.tech/</loc>
  <lastmod>2025-01-01</lastmod>
  <changefreq>weekly</changefreq>
  <priority>1.0</priority>
</url>
<url>
  <loc>https://www.hintio.tech/help</loc>
  <lastmod>2025-01-01</lastmod>
  <changefreq>monthly</changefreq>
  <priority>0.7</priority>
</url>
```

### 5. Robots.txt (public/robots.txt)

```
User-agent: *
Allow: /
Disallow: /api/
Crawl-delay: 10

Sitemap: https://www.hintio.tech/sitemap.xml
```

### 6. Web Manifest Icons (public/site.webmanifest)

```json
"icons": [
  {
    "src": "/icon-192.png",
    "sizes": "192x192",
    "type": "image/png"
  },
  {
    "src": "/icon-512.png",
    "sizes": "512x512",
    "type": "image/png"
  }
]
```

The icon PNG files (`public/icon-192.png`, `public/icon-512.png`) must be created as part of this feature. They can be generated from the existing brand assets or created as placeholder files initially.

### 7. Semantic HTML Changes (src/App.tsx)

**Heading hierarchy** — current state has `<h1>` in Hero and `<h2>` in some sections, but several section headings and card headings use `<h2>` or `<h3>` inconsistently. Required changes:

- Hero: `<h1>` — already correct, verify it is the only `<h1>`
- UseCases, HowItWorks, Pricing, FAQ, ShortcutsHelp: section primary heading → `<h2>`
- Use-case cards (Interviews, Sales, etc.), FAQ items, pricing tier names, shortcut cards → `<h3>`

**ARIA and landmark additions:**
- Wrap all sections between `<Navbar>` and `<Footer>` in a `<main>` element
- Mobile menu toggle button: add `aria-expanded={isMobileMenuOpen}` and `aria-label="Toggle navigation menu"`
- FAQ search input: add `aria-label="Search frequently asked questions"`
- Decorative SVGs (the waveform SVG in Hero): add `aria-hidden="true"`

**Keyword copy updates** — minimal, targeted additions to existing copy:
- Hero subheading: weave in "AI interview copilot" and "real-time interview assistant"
- UseCases section body: add "invisible overlay", "AI for coding interviews", "AI sales call assistant"
- HowItWorks section: add "undetectable AI" or "live meeting assistant" naturally

---

## Data Models

No new data models are introduced. All changes are to static text content and HTML attributes.

The Keyword_Set is a fixed list used as a reference for validation:

```typescript
const KEYWORD_SET = [
  "AI interview copilot",
  "real-time interview assistant",
  "invisible overlay",
  "undetectable AI",
  "interview AI for Windows",
  "interview AI for Mac",
  "AI for coding interviews",
  "live meeting assistant",
  "AI sales call assistant",
];
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: JSON-LD Schema Completeness

*For any* JSON-LD block of a given `@type` in `index.html`, all required fields for that type must be present and non-empty. Specifically: `SoftwareApplication` must have `name`, `description`, `operatingSystem`, `applicationCategory`, `url`, and `offers`; `Organization` must have `name`, `url`, `logo`; `FAQPage` must have `mainEntity` with at least one `Question`/`Answer` pair.

**Validates: Requirements 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 3.1, 3.2**

---

### Property 2: Keyword Coverage Thresholds

*For any* meta field or content section with a defined minimum keyword count, the number of Keyword_Set terms present in that field's content must meet or exceed its threshold. Thresholds: title ≥ 2, description ≥ 3, og:description ≥ 2, Hero text ≥ 2, UseCases text ≥ 3, HowItWorks text ≥ 1.

**Validates: Requirements 4.1, 4.2, 5.3, 14.1, 14.2, 14.3**

---

### Property 3: Sitemap URL Entry Completeness

*For any* `<url>` entry in `sitemap.xml`, the entry must contain `<loc>`, `<lastmod>`, `<changefreq>`, and `<priority>` child elements, all non-empty.

**Validates: Requirements 7.1, 7.3**

---

### Property 4: Web Manifest Icon Entry Completeness

*For any* icon entry in the `icons` array of `site.webmanifest`, the entry must contain `src`, `sizes`, and `type` fields, and `type` must equal `"image/png"`.

**Validates: Requirements 9.1, 9.2, 9.3**

---

### Property 5: Heading Hierarchy Correctness

*For any* rendered page, there must be exactly one `<h1>` element, every section-level heading must be an `<h2>`, and every card/item-level heading within a section must be an `<h3>`. No heading level must be skipped (e.g., no `<h3>` without a preceding `<h2>` in the same section).

**Validates: Requirements 10.1, 10.2, 10.3**

---

### Property 6: Accessibility Attribute Completeness

*For any* rendered interactive element (button, input) or media element (img, decorative SVG), the required accessibility attribute must be present: buttons without visible text must have `aria-label`; all `<img>` elements must have a non-empty `alt`; decorative SVGs must have `aria-hidden="true"`; the mobile menu toggle must have `aria-expanded` reflecting current state.

**Validates: Requirements 11.1, 11.3, 12.1, 12.2**

---

## Error Handling

All changes in this feature are to static files and HTML attributes. There are no runtime error conditions introduced. The following failure modes are noted for awareness:

- **Missing icon files**: If `public/icon-192.png` or `public/icon-512.png` do not exist, the browser will silently fail to load the manifest icons. The site will still function. Icon files must be created as part of the implementation.
- **Invalid JSON-LD**: Malformed JSON in a `<script type="application/ld+json">` block will cause Google Search Console to report a structured data error but will not break the page. JSON must be validated before deployment.
- **Keyword copy changes**: Edits to `src/App.tsx` copy must not break existing Tailwind class bindings or JSX structure. Changes are additive (inserting words into existing strings) rather than structural.

---

## Testing Strategy

### Dual Testing Approach

Both unit tests and property-based tests are used. Unit tests verify specific values and structural presence. Property tests verify universal rules that must hold across all elements of a given type.

### Unit Tests (Vitest)

Unit tests parse the static files and rendered HTML to verify specific expected values:

- `index.html` contains `<meta name="author" content="hintio">`
- `index.html` contains `<meta name="application-name" content="hintio">`
- `index.html` contains `<meta property="og:locale" content="en_US">`
- `index.html` contains `<meta name="twitter:site">`
- `index.html` contains `<meta name="twitter:creator">`
- `index.html` contains `<meta name="apple-mobile-web-app-capable" content="yes">`
- `index.html` contains `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`
- `index.html` contains `<meta name="apple-mobile-web-app-title" content="hintio">`
- `index.html` contains `<link rel="preload" as="style">` pointing to fonts.googleapis.com
- `sitemap.xml` contains a `<url>` entry for `https://www.hintio.tech/help`
- `robots.txt` contains `Disallow: /api/`
- `robots.txt` contains `Crawl-delay: 10`
- `robots.txt` retains `Allow: /` and `Sitemap:` lines
- Rendered page contains a `<main>` element
- FAQ search input has `aria-label`

### Property-Based Tests (fast-check, Vitest)

Property tests use fast-check to generate inputs and verify universal rules. Each property test runs a minimum of 100 iterations.

**Property 1 — JSON-LD Schema Completeness**
- Tag: `Feature: seo-optimization, Property 1: JSON-LD schema completeness`
- Parse all JSON-LD blocks from `index.html`, for each block verify required fields by `@type`

**Property 2 — Keyword Coverage Thresholds**
- Tag: `Feature: seo-optimization, Property 2: keyword coverage thresholds`
- For each defined field/section with a minimum, verify the count of Keyword_Set terms meets the threshold

**Property 3 — Sitemap URL Entry Completeness**
- Tag: `Feature: seo-optimization, Property 3: sitemap URL entry completeness`
- Parse `sitemap.xml`, for each `<url>` entry verify all required child elements are present

**Property 4 — Web Manifest Icon Entry Completeness**
- Tag: `Feature: seo-optimization, Property 4: web manifest icon entry completeness`
- Parse `site.webmanifest`, for each icon entry verify `src`, `sizes`, `type` fields and `type === "image/png"`

**Property 5 — Heading Hierarchy Correctness**
- Tag: `Feature: seo-optimization, Property 5: heading hierarchy correctness`
- Render the App component with `@testing-library/react`, query all heading elements, verify exactly one h1, all section headings are h2, all card headings are h3

**Property 6 — Accessibility Attribute Completeness**
- Tag: `Feature: seo-optimization, Property 6: accessibility attribute completeness`
- Render the App component, query all buttons/inputs/imgs/SVGs, verify required accessibility attributes are present on each

### Testing Library Choices

- **Vitest** — test runner (already in the Vite ecosystem)
- **@testing-library/react** — render React components for DOM queries
- **fast-check** — property-based testing library for TypeScript
- **jsdom** — DOM environment for Vitest (configured via `vitest.config.ts`)
- **node:fs** + **DOMParser** / **xml2js** — parse static files in unit tests
