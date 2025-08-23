# Worst Performers - Archived Features

This directory contains the isolated Worst Performers functionality that was removed from the main application.

## Archived Components

- `worst-performers/page.tsx` - Worst Performers Tracker dashboard page
- `WorstPerformersTracker.tsx` - Business component for tracking underperforming players

## Features Removed

- **Worst Performers Tracker**: Dashboard page for identifying underperforming players
- **Performance Analysis**: Analytics for players with declining metrics
- **Recommendation System**: Automated suggestions for improving player performance
- **Player Progress Charts**: Visualizations showing performance trends

## Functionality

The Worst Performers tracker analyzed players based on:
- Power growth trends
- Combat performance metrics
- Resource efficiency
- Alliance contribution levels
- Progress over time comparisons

## Database Fields

All player performance data remains in the database schema but is no longer used for the Worst Performers analysis:
- `power`, `currentPower` progression tracking
- Combat statistics (`unitsKilled`, `killDeathRatio`, `winRate`)
- Resource metrics (`gold`, `wood`, `ore`, `mana` spent/gained)
- Alliance metrics (`helpsGiven`, `resourcesGiven`)

## Restoration

To restore Worst Performers functionality:

1. Move files back to their original locations:
   - `worst-performers/` → `src/app/dashboard/worst-performers/`
   - `WorstPerformersTracker.tsx` → `src/components/business/WorstPerformersTracker.tsx`

2. Add back to dashboard navigation in `src/app/dashboard/layout.tsx`:
   ```typescript
   { name: 'Worst Performers', href: '/dashboard/worst-performers', icon: AlertTriangle }
   ```

3. Import AlertTriangle icon in layout.tsx

## Technical Details

The Worst Performers tracker used:
- Player progress analysis algorithms
- Performance trend calculations
- Statistical analysis for identifying outliers
- Automated recommendation generation
- Integration with PlayerProgressChart component