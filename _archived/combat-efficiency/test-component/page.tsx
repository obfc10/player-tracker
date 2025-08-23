'use client';

import { CombatEfficiencyMatrix } from '../CombatEfficiencyMatrix';

export default function TestComponentPage() {
  const handlePlayerClick = (playerId: string) => {
    console.log('Player clicked:', playerId);
    // In a real implementation, this would open the PlayerDetailDrawer
    alert(`Player clicked: ${playerId}`);
  };

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">
          Combat Efficiency Matrix Test
        </h1>
        
        <div className="space-y-8">
          <CombatEfficiencyMatrix
            onPlayerClick={handlePlayerClick}
            sortBy="unitsKilled"
          />
        </div>
      </div>
    </div>
  );
}