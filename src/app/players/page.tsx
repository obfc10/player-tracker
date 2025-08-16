'use client';

import { useEffect, useState } from 'react';

type PlayerSnapshot = {
  timestamp: string;
  division: number;
  allianceId?: string;
  allianceTag?: string;
  currentPower: number;
  power: number;
  merits: number;
  unitsKilled: number;
  unitsDead: number;
  buildingPower: number;
  heroPower: number;
  legionPower: number;
  techPower: number;
};

type Player = {
  id: string;
  lordId: string;
  name: string;
  snapshots: PlayerSnapshot[];
};

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const res = await fetch('/api/players');
        let data: Player[] | { error: string } = [];
        try {
          data = await res.json();
        } catch {
          data = { error: 'Invalid JSON response from server' };
        }

        if ('error' in data) {
          setError(data.error);
          setPlayers([]);
        } else {
          setPlayers(data);
          setError(null);
        }
      } catch (err) {
        setError('Failed to fetch players');
        setPlayers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, []);

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-8">Players ({players.length})</h1>

      <div className="overflow-x-auto">
        <table className="w-full bg-gray-800">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="p-2 text-left">Lord ID</th>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Alliance</th>
              <th className="p-2 text-right">Current Power</th>
              <th className="p-2 text-right">Units Killed</th>
              <th className="p-2 text-right">Units Dead</th>
            </tr>
          </thead>
          <tbody>
            {players.map(player => {
              const latest = player.snapshots[0];
              return (
                <tr key={player.id} className="border-b border-gray-700 hover:bg-gray-700">
                  <td className="p-2">{player.lordId}</td>
                  <td className="p-2">{player.name}</td>
                  <td className="p-2">{latest?.allianceTag || '-'}</td>
                  <td className="p-2 text-right">{latest?.currentPower?.toLocaleString() || '0'}</td>
                  <td className="p-2 text-right">{latest?.unitsKilled?.toLocaleString() || '0'}</td>
                  <td className="p-2 text-right">{latest?.unitsDead?.toLocaleString() || '0'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}