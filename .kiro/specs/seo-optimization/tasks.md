# Implementation Plan: SEO Optimization

## Overview

All changes are confined to five files: `index.html`, `public/sitemap.xml`, `public/robots.txt`, `public/site.webmanifest`, and `src/App.tsx`. No new dependencies are required for the implementation itself. Testing requires adding Vitest, @testing-library/react, fast-check, and jsdom as dev dependencies.

## Tasks

- [x] 1. Add JSON-LD structured data blocks to index.html
  - Add three separate `<script type="application/ld+json">` blocks inside `<head>` in `index.html`
  - Block 1 — `SoftwareApplication`: include `name`, `description`, `url`, `operatingSystem` ("Windows, macOS"), `applicationCategory` ("BusinessApplication"), and `offers` array with a free-tier entry (`price: "0"`, `priceCurrency: "USD"`)
  - Block 2 — `Organization`: include `name` ("hintio"), `url` ("https://www.hintio.tech"), `logo` ("https://www.hintio.tech/icon-512.png")
  - Block 3 — `FAQPage`: include `mainEntity` array with all three FAQ entries from `src/App.tsx` (detection, data privacy, platform compatibility) as `Question`/`Answer` pairs
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 3.1, 3.2, 3.3_

  - [ ]* 1.1 Write property test for JSON-LD schema completeness
    - Parse all JSON-LD blocks from `index.html` using `JSON.parse`
    - For each block, verify required fields are present and non-empty based on `@type`
    - **Property 1: JSON-LD Schema Completeness**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 3.1, 3.2**
    - Tag: `Feature: seo-optimization, Property 1: JSON-LD schema completeness`

- [x] 2. Update meta tags and title in index.html
  - Update `<title>` to `hintio — AI Interview Copilot & Real-Time Assistant` (≤60 chars, includes ≥2 Keyword_Set terms)
  - Update `<meta name="description">` content to include ≥3 Keyword_Set terms within 160 chars, e.g.: `"hintio is an AI interview copilot and real-time interview assistant — an invisible overlay for Windows & Mac. Undetectable AI for coding interviews, sales calls, and meetings."`
  - Update `<meta property="og:description">` to include ≥2 Keyword_Set terms within 200 chars
  - Update `<meta property="og:title">` and `<meta name="twitter:title">` to match the new title
  - Update `<meta name="twitter:description">` to match the new description
  - Add `<meta name="keywords">` with all Keyword_Set terms comma-separated
  - Add `<meta name="author" content="hintio">`
  - Add `<meta name="application-name" content="hintio">`
  - Add `<meta property="og:image:width" content="1200">`
  - Add `<meta property="og:image:height" content="630">`
  - Add `<meta property="og:locale" content="en_US">`
  - Add `<meta name="twitter:site" content="@hintioapp">`
  - Add `<meta name="twitter:creator" content="@hintioapp">`
  - Add `<meta name="apple-mobile-web-app-capable" content="yes">`
  - Add `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`
  - Add `<meta name="apple-mobile-web-app-title" content="hintio">`
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3_

  - [ ]* 2.1 Write unit tests for meta tag presence and values
    - Read `index.html` as a string and use DOMParser (or regex) to verify each new/updated tag
    - Verify `author`, `application-name`, `og:locale`, `twitter:site`, `twitter:creator`, all three `apple-mobile-web-app-*` tags
    - _Requirements: 4.4, 4.5, 5.1, 5.2, 5.4, 5.5, 6.1, 6.2, 6.3_

  - [ ]* 2.2 Write property test for keyword coverage thresholds
    - For each field with a minimum keyword count (title ≥2, description ≥3, og:description ≥2), parse the value and count Keyword_Set term occurrences
    - **Property 2: Keyword Coverage Thresholds**
    - **Validates: Requirements 4.1, 4.2, 5.3**
    - Tag: `Feature: seo-optimization, Property 2: keyword coverage thresholds`

- [x] 3. Add preload hint for Google Fonts in index.html
  - Add `<link rel="preload" as="style" href="...">` immediately above the existing Google Fonts `<link rel="stylesheet">` tag, using the same Bricolage Grotesque + Inter + JetBrains Mono URL
  - Verify the existing stylesheet URL already contains `&display=swap` (it does — no change needed to the URL itself)
  - _Requirements: 13.1, 13.2_

  - [ ]* 3.1 Write unit test for preload hint presence
    - Parse `index.html` and verify a `<link rel="preload" as="style">` element exists pointing to `fonts.googleapis.com`
    - _Requirements: 13.1, 13.2_

- [x] 4. Checkpoint — Verify index.html changes
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Update public/sitemap.xml
  - Add `<lastmod>2025-01-01</lastmod>` to the existing homepage `<url>` entry
  - Add a second `<url>` entry for `https://www.hintio.tech/help` with `<lastmod>2025-01-01</lastmod>`, `<changefreq>monthly</changefreq>`, `<priority>0.7</priority>`
  - _Requirements: 7.1, 7.2, 7.3_

  - [ ]* 5.1 Write property test for sitemap URL entry completeness
    - Parse `sitemap.xml` using an XML parser, iterate all `<url>` elements
    - For each entry verify `<loc>`, `<lastmod>`, `<changefreq>`, `<priority>` are all present and non-empty
    - Verify the `/help` URL is present
    - **Property 3: Sitemap URL Entry Completeness**
    - **Validates: Requirements 7.1, 7.2, 7.3**
    - Tag: `Feature: seo-optimization, Property 3: sitemap URL entry completeness`

- [x] 6. Update public/robots.txt
  - Add `Disallow: /api/` directive after the existing `Allow: /` line
  - Add `Crawl-delay: 10` directive
  - Retain existing `Allow: /` and `Sitemap: https://www.hintio.tech/sitemap.xml` lines
  - _Requirements: 8.1, 8.2, 8.3_

  - [ ]* 6.1 Write unit tests for robots.txt directives
    - Read `robots.txt` as a string and verify presence of `Disallow: /api/`, `Crawl-delay: 10`, `Allow: /`, and `Sitemap:` lines
    - _Requirements: 8.1, 8.2, 8.3_

- [x] 7. Update public/site.webmanifest icons array
  - Replace the empty `"icons": []` with two entries: `{ "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" }` and `{ "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }`
  - Create placeholder `public/icon-192.png` and `public/icon-512.png` files (1×1 transparent PNG is acceptable as a placeholder; real brand icons should replace these before launch)
  - _Requirements: 9.1, 9.2, 9.3_

  - [ ]* 7.1 Write property test for web manifest icon entry completeness
    - Parse `site.webmanifest` as JSON, iterate the `icons` array
    - For each entry verify `src`, `sizes`, and `type` fields are present and `type === "image/png"`
    - Verify at least two entries exist (192×192 and 512×512)
    - **Property 4: Web Manifest Icon Entry Completeness**
    - **Validates: Requirements 9.1, 9.2, 9.3**
    - Tag: `Feature: seo-optimization, Property 4: web manifest icon entry completeness`

- [x] 8. Checkpoint — Verify public file changes
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Fix heading hierarchy in src/App.tsx
  - Verify the Hero `<h1>` is the only `<h1>` on the page (it currently is — no change needed)
  - Audit each section component and ensure the primary section heading uses `<h2>`: UseCases ("Built for every high-stakes moment."), HowItWorks, Pricing, FAQ ("Got questions?"), ShortcutsHelp ("Hintio Shortcuts Help")
  - Audit card/item headings within sections and ensure they use `<h3>`: use-case card titles (Interviews, Sales, etc.), FAQ item question headings, pricing tier names, shortcut card titles
  - _Requirements: 10.1, 10.2, 10.3_

  - [ ]* 9.1 Write property test for heading hierarchy correctness
    - Render the full `App` component with `@testing-library/react`
    - Query all `h1`, `h2`, `h3` elements and verify: exactly one `h1`, all known section headings are `h2`, all known card headings are `h3`
    - **Property 5: Heading Hierarchy Correctness**
    - **Validates: Requirements 10.1, 10.2, 10.3**
    - Tag: `Feature: seo-optimization, Property 5: heading hierarchy correctness`

- [x] 10. Add semantic landmark and ARIA attributes in src/App.tsx
  - In the `App` function, wrap all section components between `<Navbar>` and `<Footer>` in a `<main>` element
  - In the `Navbar` component, add `aria-expanded={isMobileMenuOpen}` and `aria-label="Toggle navigation menu"` to the mobile menu toggle `<button>`
  - In the `FAQ` component, add `aria-label="Search frequently asked questions"` to the search `<input>`
  - In the `Hero` component, add `aria-hidden="true"` to the decorative waveform `<svg>` element
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 12.2_

  - [ ]* 10.1 Write unit tests for landmark and ARIA presence
    - Render the `App` component and verify a `<main>` element exists
    - Render the `FAQ` component and verify the search input has `aria-label`
    - _Requirements: 11.2, 11.4_

  - [ ]* 10.2 Write property test for accessibility attribute completeness
    - Render the full `App` component
    - Query all `<button>` elements without visible text and verify each has `aria-label`
    - Query all `<img>` elements and verify each has a non-empty `alt` attribute
    - Query decorative SVGs and verify each has `aria-hidden="true"`
    - Query the mobile menu toggle and verify `aria-expanded` is present
    - **Property 6: Accessibility Attribute Completeness**
    - **Validates: Requirements 11.1, 11.3, 12.1, 12.2**
    - Tag: `Feature: seo-optimization, Property 6: accessibility attribute completeness`

- [x] 11. Add keyword copy to src/App.tsx content sections
  - In the `Hero` component, update the `<p>` subheading to naturally include "AI interview copilot" and "real-time interview assistant" — e.g. weave them into the existing copy without making it feel forced
  - In the `UseCases` component, update the section body paragraph to include "invisible overlay", "AI for coding interviews", and "AI sales call assistant" — add to the existing description text or card copy
  - In the `HowItWorks` component, add "live meeting assistant" or "undetectable AI" to the section description paragraph
  - _Requirements: 14.1, 14.2, 14.3_

  - [ ]* 11.1 Write property test for keyword coverage in content sections
    - Render each section component (`Hero`, `UseCases`, `HowItWorks`) and extract text content
    - For each section verify the count of Keyword_Set terms meets its minimum threshold (Hero ≥2, UseCases ≥3, HowItWorks ≥1)
    - **Property 2 (content portion): Keyword Coverage Thresholds**
    - **Validates: Requirements 14.1, 14.2, 14.3**
    - Tag: `Feature: seo-optimization, Property 2: keyword coverage thresholds`

- [x] 12. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster implementation pass
- Icon PNG files created in Task 7 are placeholders — replace with real brand icons before launch
- The Twitter handle `@hintioapp` used in Task 2 should be updated to the actual handle if different
- The `lastmod` dates in Task 5 should be updated to the actual deployment date
- Property tests use fast-check with a minimum of 100 iterations each
- All tests use Vitest as the runner with jsdom as the DOM environment
