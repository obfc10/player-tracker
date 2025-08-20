// src/app/dashboard/players/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExportButton } from '@/components/ui/export-button';
import { ExportConfigs } from '@/lib/export';
import { ALLIANCE_FILTER_OPTIONS, getManagedAllianceColor, isManagedAlliance, sortAlliancesByPriority } from '@/lib/alliance-config';

interface PlayerData {
  lordId: string;
  name: string;
  division: number;
  allianceTag: string;
  currentPower: string;
  power: string;
  merits: string;
  unitsKilled: string;
  unitsDead: string;
  unitsHealed: string;
  t1KillCount: string;
  t2KillCount: string;
  t3KillCount: string;
  t4KillCount: string;
  t5KillCount: string;
  buildingPower: string;
  heroPower: string;
  legionPower: string;
  techPower: string;
  victories: number;
  defeats: number;
  citySieges: number;
  scouted: number;
  helpsGiven: number;
  gold: string;
  goldSpent: string;
  wood: string;
  woodSpent: string;
  ore: string;
  oreSpent: string;
  mana: string;
  manaSpent: string;
  gems: string;
  gemsSpent: string;
  resourcesGiven: string;
  resourcesGivenCount: number;
  cityLevel: number;
  faction: string;
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<PlayerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAlliance, setSelectedAlliance] = useState('all');
  const [sortColumn, setSortColumn] = useState<keyof PlayerData>('currentPower');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const router = useRouter();

  // Column definitions for all 39 fields
  const columns = [
    { key: 'lordId', label: 'Lord ID', type: 'string' },
    { key: 'name', label: 'Name', type: 'string' },
    { key: 'division', label: 'Division', type: 'number' },
    { key: 'allianceTag', label: 'Alliance', type: 'string' },
    { key: 'currentPower', label: 'Current Power', type: 'bigNumber' },
    { key: 'power', label: 'Power', type: 'bigNumber' },
    { key: 'merits', label: 'Merits', type: 'bigNumber' },
    { key: 'unitsKilled', label: 'Units Killed', type: 'bigNumber' },
    { key: 'unitsDead', label: 'Units Dead', type: 'bigNumber' },
    { key: 'unitsHealed', label: 'Units Healed', type: 'bigNumber' },
    { key: 't1KillCount', label: 'T1 Kills', type: 'bigNumber' },
    { key: 't2KillCount', label: 'T2 Kills', type: 'bigNumber' },
    { key: 't3KillCount', label: 'T3 Kills', type: 'bigNumber' },
    { key: 't4KillCount', label: 'T4 Kills', type: 'bigNumber' },
    { key: 't5KillCount', label: 'T5 Kills', type: 'bigNumber' },
    { key: 'buildingPower', label: 'Building Power', type: 'bigNumber' },
    { key: 'heroPower', label: 'Hero Power', type: 'bigNumber' },
    { key: 'legionPower', label: 'Legion Power', type: 'bigNumber' },
    { key: 'techPower', label: 'Tech Power', type: 'bigNumber' },
    { key: 'victories', label: 'Victories', type: 'number' },
    { key: 'defeats', label: 'Defeats', type: 'number' },
    { key: 'citySieges', label: 'City Sieges', type: 'number' },
    { key: 'scouted', label: 'Scouted', type: 'number' },
    { key: 'helpsGiven', label: 'Helps Given', type: 'number' },
    { key: 'gold', label: 'Gold', type: 'bigNumber' },
    { key: 'goldSpent', label: 'Gold Spent', type: 'bigNumber' },
    { key: 'wood', label: 'Wood', type: 'bigNumber' },
    { key: 'woodSpent', label: 'Wood Spent', type: 'bigNumber' },
    { key: 'ore', label: 'Ore', type: 'bigNumber' },
    { key: 'oreSpent', label: 'Ore Spent', type: 'bigNumber' },
    { key: 'mana', label: 'Mana', type: 'bigNumber' },
    { key: 'manaSpent', label: 'Mana Spent', type: 'bigNumber' },
    { key: 'gems', label: 'Gems', type: 'bigNumber' },
    { key: 'gemsSpent', label: 'Gems Spent', type: 'bigNumber' },
    { key: 'resourcesGiven', label: 'Resources Given', type: 'bigNumber' },
    { key: 'resourcesGivenCount', label: 'Donation Count', type: 'number' },
    { key: 'cityLevel', label: 'City Level', type: 'number' },
    { key: 'faction', label: 'Faction', type: 'string' }
  ];

  useEffect(() => {
    fetchPlayers();
  }, []);

  useEffect(() => {
    filterAndSortPlayers();
  }, [players, searchTerm, selectedAlliance, sortColumn, sortDirection]);

  const fetchPlayers = async () => {
    try {
      const response = await fetch('/api/players');
      const data = await response.json();
      setPlayers(data.players || []);
    } catch (error) {
      console.error('Error fetching players:', error);
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortPlayers = () => {
    let filtered = [...players];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(player => 
        player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.lordId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply alliance filter
    if (selectedAlliance !== 'all') {
      filtered = filtered.filter(player => player.allianceTag === selectedAlliance);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      
      // Handle string numbers (bigNumbers)
      if (typeof aVal === 'string' && typeof bVal === 'string' && !isNaN(Number(aVal))) {
        const numA = parseInt(aVal);
        const numB = parseInt(bVal);
        return sortDirection === 'asc' ? numA - numB : numB - numA;
      }
      
      // Handle regular numbers
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      // Handle strings
      const strA = String(aVal || '');
      const strB = String(bVal || '');
      return sortDirection === 'asc' 
        ? strA.localeCompare(strB)
        : strB.localeCompare(strA);
    });

    setFilteredPlayers(filtered);
  };

  const handleSort = (column: keyof PlayerData) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const openPlayerCard = (lordId: string) => {
    router.push(`/dashboard/player/${lordId}`);
  };

  const formatNumber = (value: string | number): string => {
    if (typeof value === 'string') {
      const num = parseInt(value);
      return isNaN(num) ? value : num.toLocaleString();
    }
    return value.toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-white">Players Database</h1>
          <ExportButton
            data={filteredPlayers.map(player => ({
              name: player.name,
              alliance: player.allianceTag,
              power: parseInt(player.currentPower || '0'),
              killPoints: parseInt(player.merits || '0'),
              level: player.cityLevel,
              vipLevel: 0, // Not available in current data
              might: parseInt(player.power || '0'),
              troopKills: parseInt(player.unitsKilled || '0'),
              deads: parseInt(player.unitsDead || '0'),
              rss_assistance_given: parseInt(player.resourcesGiven || '0'),
              rss_assistance_received: 0 // Not available in current data
            }))}
            exportConfig={ExportConfigs.players}
            filename={`players_export_${new Date().toISOString().split('T')[0]}`}
            title="Kingdom 671 - Players Database"
            subtitle={`Export generated on ${new Date().toLocaleDateString()} | ${filteredPlayers.length} players`}
          />
        </div>
        
        {/* Filters */}
        <div className="flex gap-4 mb-4">
          <input
            type="text"
            placeholder="Search by name or Lord ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg flex-1 max-w-md"
          />
          
          <select
            value={selectedAlliance}
            onChange={(e) => setSelectedAlliance(e.target.value)}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg"
          >
            {ALLIANCE_FILTER_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
            <optgroup label="All Available Alliances">
              {players && players.length > 0 && sortAlliancesByPriority(Array.from(new Set(players.map(p => p.allianceTag).filter(Boolean)))).map(alliance => (
                <option key={`all-${alliance}`} value={alliance}>
                  {alliance} {isManagedAlliance(alliance) ? '★' : ''}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
        
        <p className="text-gray-400">
          Showing {filteredPlayers.length} of {players?.length || 0} players
        </p>
      </div>

      {/* Scrollable Table Container */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900 sticky top-0 z-10">
              <tr>
                {columns.map(column => (
                  <th
                    key={column.key}
                    onClick={() => handleSort(column.key as keyof PlayerData)}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-800 whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      {column.label}
                      {sortColumn === column.key && (
                        <span className="text-purple-500">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredPlayers.map(player => (
                <tr
                  key={player.lordId}
                  onClick={() => openPlayerCard(player.lordId)}
                  className={`cursor-pointer transition-colors hover:bg-gray-700 ${
                    player.allianceTag && isManagedAlliance(player.allianceTag) 
                      ? 'ring-1 ring-yellow-400/30 bg-gray-800/50' 
                      : ''
                  }`}
                >
                  {columns.map(column => (
                    <td
                      key={column.key}
                      className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap"
                    >
                      {column.key === 'allianceTag' ? (
                        player.allianceTag ? (
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            isManagedAlliance(player.allianceTag) 
                              ? getManagedAllianceColor(player.allianceTag)
                              : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          }`}>
                            {player.allianceTag}
                            {isManagedAlliance(player.allianceTag) && (
                              <span className="ml-1">★</span>
                            )}
                          </span>
                        ) : '-'
                      ) : column.type === 'bigNumber' 
                        ? formatNumber(player[column.key as keyof PlayerData])
                        : player[column.key as keyof PlayerData] || '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}