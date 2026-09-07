# EPR Nexuss — EPR Credit Marketplace (Frontend)

A B2B marketplace UI where verified sellers list EPR credits, buyers post requirements, and
EPR Nexuss mediates every deal — no direct buyer/seller contact, ever.

This is a **plain JavaScript / JSX** React app (no TypeScript), built with Vite + Tailwind CSS v4.
It was converted from an original TypeScript/TSX prototype, with all type annotations stripped and
the code reformatted for readability.

## Tech Stack

- React 19
- Vite 8
- Tailwind CSS v4 (CSS-first config, see `src/index.css`)
- Plain JavaScript (`.js` / `.jsx`) — no TypeScript, no build-time type checking

## Project Structure

```
src/
  main.jsx                 # App entry point
  App.jsx                  # Root component: client-side page router + Navbar + Footer
  index.css                # Tailwind import + design tokens (CSS variables) + fonts
  components/
    ui.jsx                 # Shared UI kit: Badge, Button, Card, Input, Select, Textarea,
                            # StatCard, Table/Tr/Td, ConfidentialityBanner, CreditTypeIcon, EmptyState
  data/
    mock.js                # Mock data: credit listings, buyer requirements, deals, verification queue
  pages/
    HomePage.jsx            # Public homepage — hero, search/filter, listings, how-it-works, features
    MarketplacePage.jsx     # Full browsable/filterable credit listing grid
    CreditDetailPage.jsx    # Single credit detail + "Request This Credit" form
    AuthPage.jsx             # Login / Sign up (Seller or Buyer)
    SellerDashboard.jsx     # Seller overview, listings table
    AddListingPage.jsx      # Seller: post new credit + upload portal screenshot for verification
    BuyerDashboard.jsx      # Buyer overview, requirements table
    AdminDashboard.jsx      # Admin: KPIs, purchase requests, verification queue, deal pipeline
```

## Routing

There's no router library yet — `App.jsx` swaps pages by a `page` string kept in React state
(`useState`), and `onNavigate(page, id?)` is passed down as a prop to every page. This is fine for
a prototype, but before deployment you'll likely want real URLs (see "Next Steps" below).

## Getting Started

```bash
npm install
npm run dev       # starts the dev server (http://localhost:5173)
npm run build     # production build -> dist/
npm run preview   # preview the production build locally
npm run format    # format all source files with Prettier
```

## Deployment

The `npm run build` command outputs a static site to `dist/`. This can be deployed to any static
host:

- **Vercel**: import the repo, framework preset "Vite", no extra config needed.
- **Netlify**: build command `npm run build`, publish directory `dist`.
- **Any static host** (S3 + CloudFront, GitHub Pages, Cloudflare Pages, etc.): upload the
  contents of `dist/` after running the build.

## What's Mocked / Not Yet Wired Up

Everything currently runs on static mock data in `src/data/mock.js` and local component state.
Nothing persists between reloads and there's no backend yet. To make this a real, working
product you'll need:

1. **Backend API** — matches the original project draft's stack: Node.js/Express, MongoDB, JWT
   auth. Suggested collections: `users`, `sellerListings`, `buyerRequirements`, `documents`,
   `deals`, `messages`, `notifications`, `commissions`, `activityLogs`.
2. **Real authentication** — `AuthPage.jsx` currently has no logic wired to submit/validate.
3. **File upload** — `AddListingPage.jsx`'s screenshot upload currently just stores the file name
   in state; wire this to real upload storage (e.g. Cloudinary or S3) and send it to the backend
   for the admin verification queue.
4. **Client-side routing** — swap the `page` state router in `App.jsx` for `react-router-dom` so
   pages have real, shareable, bookmarkable URLs (also needed for SEO on public pages).
5. **Data fetching** — replace the static imports from `mock.js` with API calls (e.g. via
   `fetch`/`axios` + React Query or plain `useEffect`).
6. **Admin verification & deal mediation logic** — `AdminDashboard.jsx`'s Approve/Reject and
   deal-locking actions are currently UI-only; they need to call real backend mutations.

## Design System Notes

- Brand green is hardcoded as `#5AC361` throughout (buttons, badges, accents).
- All other colors go through CSS variable tokens defined in `:root` in `src/index.css`
  (`--background`, `--card`, `--border`, `--muted-foreground`, etc.) — keep using these tokens
  for new UI rather than introducing new hardcoded hex colors, so theming stays consistent.
- Fonts: **Outfit** for headings/display text, **Inter** for body/UI text (both loaded via Google
  Fonts `@import` in `index.css`).
- No dynamic Tailwind class string interpolation — status/variant styling uses static lookup
  objects (see `badgeStyles` / `btnVariants` in `components/ui.jsx`) so Tailwind's compiler can
  see every class at build time.
