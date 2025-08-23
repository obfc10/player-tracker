'use client';

import { useState } from 'react';
import { CombatEfficiencyMatrix } from '@/components/charts/CombatEfficiencyMatrix';
import { PlayerDetailCard } from '@/components/player-detail';

export default function CombatEfficiencyPage() {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const handlePlayerClick = (playerId: string) => {
    setSelectedPlayerId(playerId);
  };

  const handleClosePlayerDetail = () => {
    setSelectedPlayerId(null);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Combat Efficiency Matrix</h1>
        <p className="text-gray-400">
          Analyze combat performance across alliances with heat map visualization showing
          units killed, K/D ratios, healing efficiency, and win rates.
        </p>
      </div>

      {/* Combat Efficiency Matrix */}
      <CombatEfficiencyMatrix
        onPlayerClick={handlePlayerClick}
        sortBy="unitsKilled"
      />

      {/* Player Detail Modal/Drawer */}
      {selectedPlayerId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">Player Details</h2>
              <button
                onClick={handleClosePlayerDetail}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-auto max-h-[calc(90vh-80px)]">
              <PlayerDetailCard 
                lordId={selectedPlayerId} 
                onClose={handleClosePlayerDetail}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}