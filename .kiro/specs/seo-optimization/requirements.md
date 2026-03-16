# Requirements Document

## Introduction

Hintio (hintio.tech) is a React/Vite SPA landing page for an AI interview overlay desktop app available on Windows and Mac. The current site has basic meta tags, OG/Twitter cards, a minimal sitemap, and a robots.txt, but lacks structured data, keyword-rich meta content, proper semantic HTML, web manifest icons, and performance-oriented head optimizations. This feature covers all SEO improvements needed to improve organic search visibility and compete with tools like Cluely, Final Round AI, Interview Sidekick, and Verve Copilot.

## Glossary

- **System**: The Hintio web application (hintio.tech), a React/Vite SPA
- **Head_Block**: The `<head>` element in `index.html`
- **Structured_Data**: JSON-LD script blocks embedded in the Head_Block that communicate page semantics to search engines
- **Schema**: A vocabulary of types defined at schema.org used within Structured_Data
- **Sitemap**: The `public/sitemap.xml` file submitted to search engines listing all crawlable URLs
- **Robots_File**: The `public/robots.txt` file that instructs crawlers which paths to access or avoid
- **Web_Manifest**: The `public/site.webmanifest` JSON file that describes the PWA identity and icons
- **Semantic_HTML**: HTML that uses elements according to their intended meaning (e.g., `<h1>` for the primary heading, `<main>`, `<nav>`, `<article>`)
- **ARIA**: Accessible Rich Internet Applications attributes (`aria-label`, `role`, etc.) that improve accessibility and machine-readability
- **OG_Tags**: Open Graph `<meta property="og:*">` tags that control how the page appears when shared on social platforms
- **Twitter_Cards**: `<meta name="twitter:*">` tags that control how the page appears when shared on Twitter/X
- **Preload**: A `<link rel="preload">` hint that tells the browser to fetch a critical resource early
- **Keyword_Set**: The target search terms: "AI interview copilot", "real-time interview assistant", "invisible overlay", "undetectable AI", "interview AI for Windows", "interview AI for Mac", "AI for coding interviews", "live meeting assistant", "AI sales call assistant"

---

## Requirements

### Requirement 1: Structured Data — SoftwareApplication Schema

**User Story:** As a search engine crawler, I want machine-readable structured data about the Hintio application, so that I can display rich results (app name, OS, price, rating) in search listings.

#### Acceptance Criteria

1. THE System SHALL include a JSON-LD `<script type="application/ld+json">` block in the Head_Block containing a `SoftwareApplication` Schema with at minimum: `name`, `description`, `operatingSystem`, `applicationCategory`, `offers` (price and currency), and `url` fields.
2. WHEN the `SoftwareApplication` Schema is rendered, THE System SHALL set `operatingSystem` to include both `"Windows"` and `"macOS"`.
3. WHEN the `SoftwareApplication` Schema is rendered, THE System SHALL set `applicationCategory` to `"BusinessApplication"`.
4. WHEN the `offers` field is present in the `SoftwareApplication` Schema, THE System SHALL include a free-tier offer with `price` of `"0"` and `priceCurrency` of `"USD"`.

---

### Requirement 2: Structured Data — Organization Schema

**User Story:** As a search engine crawler, I want structured data about the Hintio organization, so that I can associate the brand with its website and display knowledge panel information.

#### Acceptance Criteria

1. THE System SHALL include a JSON-LD block in the Head_Block containing an `Organization` Schema with at minimum: `name`, `url`, and `logo` fields.
2. WHEN the `Organization` Schema is rendered, THE System SHALL set `url` to `"https://www.hintio.tech"`.

---

### Requirement 3: Structured Data — FAQPage Schema

**User Story:** As a search engine crawler, I want structured data for the FAQ section, so that I can display FAQ rich results directly in search listings and increase click-through rate.

#### Acceptance Criteria

1. THE System SHALL include a JSON-LD block in the Head_Block containing a `FAQPage` Schema.
2. WHEN the `FAQPage` Schema is rendered, THE System SHALL include a `mainEntity` array where each entry is an `Question` type with `name` (the question text) and `acceptedAnswer` containing an `Answer` type with `text` (the answer text).
3. WHEN the `FAQPage` Schema is rendered, THE System SHALL include all three FAQ entries currently present in the FAQ section of `src/App.tsx`: detection, data privacy, and platform compatibility.

---

### Requirement 4: Meta Tag Keyword Coverage

**User Story:** As a search engine, I want keyword-rich meta title and description tags, so that I can rank the Hintio page for high-value interview AI search terms.

#### Acceptance Criteria

1. THE System SHALL set the `<title>` tag in the Head_Block to a string that includes at least two terms from the Keyword_Set and does not exceed 60 characters.
2. THE System SHALL include a `<meta name="description">` tag whose content includes at least three terms from the Keyword_Set and does not exceed 160 characters.
3. THE System SHALL include a `<meta name="keywords">` tag whose content lists all terms in the Keyword_Set as a comma-separated string.
4. THE System SHALL include a `<meta name="author">` tag with value `"hintio"`.
5. THE System SHALL include a `<meta name="application-name">` tag with value `"hintio"`.

---

### Requirement 5: Open Graph and Twitter Card Enhancement

**User Story:** As a social media platform, I want complete OG and Twitter Card meta tags, so that shared links display correctly with image dimensions and locale.

#### Acceptance Criteria

1. THE System SHALL include `<meta property="og:image:width">` and `<meta property="og:image:height">` tags in the Head_Block.
2. THE System SHALL include a `<meta property="og:locale">` tag with value `"en_US"`.
3. THE System SHALL set the `og:description` content to a string that includes at least two terms from the Keyword_Set and does not exceed 200 characters.
4. THE System SHALL include a `<meta name="twitter:site">` tag referencing the official Hintio Twitter/X handle.
5. THE System SHALL include a `<meta name="twitter:creator">` tag referencing the official Hintio Twitter/X handle.

---

### Requirement 6: Apple Mobile Web App Meta Tags

**User St
ory:** As a mobile browser on iOS, I want Apple-specific meta tags, so that the site behaves correctly when added to the home screen.

#### Acceptance Criteria

1. THE System SHALL include `<meta name="apple-mobile-web-app-capable">` with value `"yes"` in the Head_Block.
2. THE System SHALL include `<meta name="apple-mobile-web-app-status-bar-style">` with value `"black-translucent"` in the Head_Block.
3. THE System SHALL include `<meta name="apple-mobile-web-app-title">` with value `"hintio"` in the Head_Block.

---

### Requirement 7: Sitemap Enhancement

**User Story:** As a search engine crawler, I want a complete and accurate sitemap, so that I can discover all pages and understand their freshness.

#### Acceptance Criteria

1. THE System SHALL include a `<lastmod>` element for every `<url>` entry in the Sitemap.
2. THE System SHALL include a `<url>` entry for the `/help` route in the Sitemap, given that a `/help` page is linked from the Hero section of `src/App.tsx`.
3. WHEN a `<url>` entry is present in the Sitemap, THE System SHALL include a `<changefreq>` element and a `<priority>` element for that entry.

---

### Requirement 8: Robots.txt Enhancement

**User Story:** As a search engine crawler, I want a robots.txt that explicitly disallows non-public paths, so that crawl budget is not wasted on internal API or function endpoints.

#### Acceptance Criteria

1. THE System SHALL include a `Disallow: /api/` directive in the Robots_File.
2. THE System SHALL include a `Crawl-delay: 10` directive in the Robots_File.
3. THE System SHALL retain the existing `Allow: /` directive and `Sitemap:` reference in the Robots_File.

---

### Requirement 9: Web Manifest Icons

**User Story:** As a browser or OS, I want icon entries in the web manifest, so that the app can be installed to a home screen or taskbar with a proper icon.

#### Acceptance Criteria

1. THE System SHALL populate the `icons` array in the Web_Manifest with at least two entries: one for 192×192 pixels and one for 512×512 pixels.
2. WHEN an icon entry is present in the Web_Manifest, THE System SHALL include `src`, `sizes`, and `type` fields for that entry.
3. THE System SHALL set the `type` field of each icon entry to `"image/png"`.

---

### Requirement 10: Semantic HTML — Heading Hierarchy

**User Story:** As a search engine crawler and screen reader, I want a correct heading hierarchy in the page HTML, so that the document outline is logical and keyword-bearing headings are properly weighted.

#### Acceptance Criteria

1. THE System SHALL render exactly one `<h1>` element on the page, located in the Hero section of `src/App.tsx`.
2. WHEN a section heading is rendered (Use Cases, How It Works, Pricing, FAQ, Shortcuts Help), THE System SHALL use an `<h2>` element for that section's primary heading.
3. WHEN a card or item heading is rendered within a section (e.g., use-case cards, FAQ items, pricing tiers), THE System SHALL use an `<h3>` element for that item's heading.

---

### Requirement 11: Semantic HTML — ARIA Labels and Landmark Roles

**User Story:** As a screen reader and search engine, I want ARIA labels on interactive elements and landmark roles on structural elements, so that the page is accessible and machine-readable.

#### Acceptance Criteria

1. WHEN a `<button>` element is rendered without visible descriptive text, THE System SHALL include an `aria-label` attribute on that element.
2. THE System SHALL include a `<main>` landmark element wrapping the primary page content in `src/App.tsx`.
3. WHEN the mobile menu toggle button is rendered, THE System SHALL include an `aria-expanded` attribute reflecting the current open/closed state.
4. WHEN the FAQ search `<input>` is rendered, THE System SHALL include an `aria-label` attribute describing its purpose.

---

### Requirement 12: Semantic HTML — Image Alt Text

**User Story:** As a search engine crawler and screen reader, I want all images to have descriptive alt text, so that image content is indexed and accessible.

#### Acceptance Criteria

1. WHEN an `<img>` element is rendered anywhere in `src/App.tsx`, THE System SHALL include a non-empty `alt` attribute on that element.
2. WHEN a decorative SVG is rendered (one that conveys no informational content), THE System SHALL include `aria-hidden="true"` on that SVG element.

---

### Requirement 13: Performance SEO — Preload Critical Assets

**User Story:** As a browser, I want preload hints for critical above-the-fold resources, so that Largest Contentful Paint (LCP) and Time to First Contentful Paint (FCP) scores improve.

#### Acceptance Criteria

1. THE System SHALL include a `<link rel="preload" as="style">` hint in the Head_Block for the primary Google Fonts stylesheet URL.
2. WHEN font stylesheets are loaded, THE System SHALL ensure each `@font-face` declaration uses `font-display: swap` to prevent invisible text during font load.

---

### Requirement 14: Keyword Integration in Page Content

**User Story:** As a search engine, I want the visible page content to naturally include high-value keywords, so that on-page relevance signals reinforce the meta tag keyword targeting.

#### Acceptance Criteria

1. WHEN the Hero section is rendered, THE System SHALL include at least two terms from the Keyword_Set in the visible text content of that section (h1, subheading, or body copy).
2. WHEN the Use Cases section is rendered, THE System SHALL include at least three terms from the Keyword_Set across the visible text content of that section.
3. WHEN the How It Works section is rendered, THE System SHALL include at least one term from the Keyword_Set in the visible text content of that section.
