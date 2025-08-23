# Merit Analytics - Archived Features

This directory contains the isolated Merit Analytics functionality that was removed from the main application.

## Archived Components

- `merits/page.tsx` - Merit analytics dashboard page
- `api-routes/route.ts` - Merit analytics API endpoint
- `MeritEfficiencyChart.tsx` - Merit efficiency visualization chart
- `MeritDistributionChart.tsx` - Merit distribution chart
- `MeritTrendChart.tsx` - Merit trend analysis chart

## Database Fields

The `merits` field remains in the database schema (`PlayerSnapshot.merits`) but is no longer used for analytics in the main application.

## Restoration

To restore merit analytics functionality:

1. Move files back to their original locations:
   - `merits/` → `src/app/dashboard/merits/`
   - `api-routes/route.ts` → `src/app/api/merits/route.ts`
   - Chart files → `src/components/charts/`

2. Add back to `src/components/charts/index.ts`:
   ```typescript
   export { MeritTrendChart } from './MeritTrendChart';
   export { MeritDistributionChart } from './MeritDistributionChart';  
   export { MeritEfficiencyChart } from './MeritEfficiencyChart';
   ```

3. Add back to dashboard navigation in `src/app/dashboard/layout.tsx`:
   ```typescript
   { name: 'Merit Analytics', href: '/dashboard/merits', icon: Award }
   ```

4. Import Award icon in layout.tsx