# Combat Efficiency - Archived Features

This directory contains the isolated Combat Efficiency functionality that was removed from the main application.

## Archived Components

- `combat-efficiency/page.tsx` - Combat Efficiency Matrix dashboard page with heat map visualization
- `CombatEfficiencyMatrix.tsx` - Combat efficiency matrix component showing K/D ratios, healing efficiency, win rates
- `test-component/` - Test page for combat efficiency components

## Features Removed

- **Combat Efficiency Matrix**: Heat map visualization showing combat performance across alliances
- **Player Combat Analytics**: Detailed combat statistics with units killed, K/D ratios, healing efficiency
- **Interactive Heat Map**: Clickable matrix with player detail modals
- **Combat Performance Sorting**: Sort by various combat metrics

## Database Fields

Combat-related fields remain in the database schema but are no longer used for the Combat Efficiency Matrix:
- `unitsKilled`, `unitsLost`, `killDeathRatio` 
- `healingGiven`, `healingReceived`
- `battlesWon`, `battlesLost`, `winRate`

## Restoration

To restore Combat Efficiency functionality:

1. Move files back to their original locations:
   - `combat-efficiency/` → `src/app/dashboard/combat-efficiency/`
   - `CombatEfficiencyMatrix.tsx` → `src/components/charts/CombatEfficiencyMatrix.tsx`
   - `test-component/` → `src/app/test-component/`

2. Add back to `src/components/charts/index.ts`:
   ```typescript
   export { CombatEfficiencyMatrix } from './CombatEfficiencyMatrix';
   ```

3. Add back to dashboard navigation in `src/app/dashboard/layout.tsx`:
   ```typescript
   { name: 'Combat Efficiency', href: '/dashboard/combat-efficiency', icon: Target }
   ```

4. Import Target icon in layout.tsx

## Technical Details

The Combat Efficiency Matrix used:
- Heat map visualization with color-coded performance metrics
- Player click handlers for detailed views
- Sorting capabilities by different combat statistics
- Responsive grid layout for alliance-based grouping