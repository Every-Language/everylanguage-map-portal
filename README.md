# EL Map Portal

Public, view-first interactive map for EveryLanguage analytics. The app shows language entities, project locations, and aggregated listening activity as heatmaps and clusters. Authenticated users access a sponsorship portal with more detailed, privacy-safe views.

## Stack
- React 19 + TypeScript + Vite
- Supabase (same project as audio app) with `@everylanguage/shared-types`
- TanStack Query, Zustand
- Tailwind + existing design system
- CI: GitHub Actions; Hosting: Vercel

## Getting Started
1. Copy `env.example` to `.env.local` and set values:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
# Optional map keys
# VITE_MAPTILER_KEY=...
```
2. Install dependencies and start dev server:
```
npm install
npm run dev
```

## Environments
- Dev: `.env.local` (Supabase dev project)
- Prod: Configure environment variables in Vercel/GitHub Secrets

## Scripts
- `dev`, `build`, `preview`, `lint`, `type-check`, `test`

## Next Steps
- Integrate MapLibre GL and deck.gl layers
- Add public read-only views for aggregated analytics (via Supabase views/functions)
- Implement language entity filters and privacy-aware heatmaps