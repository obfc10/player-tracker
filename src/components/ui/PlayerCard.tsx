'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlayerListItemDto } from '@/types/dto';
// Local implementations of formatting functions to avoid conflicts

interface PlayerListCardProps {
  player: PlayerListItemDto;
  onClick?: () => void;
  showMetrics?: boolean;
  compact?: boolean;
  className?: string;
}

export function PlayerListCard({
  player,
  onClick,
  showMetrics = false,
  compact = false,
  className = ''
}: PlayerListCardProps) {
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  const battleEfficiency = React.useMemo(() => {
    if (!showMetrics) return null;
    
    // PlayerListItemDto doesn't have combat stats, only PlayerDetailDto does
    // For list view, we don't show battle efficiency
    return null;
  }, [showMetrics]);

  return (
    <Card 
      className={`
        transition-all duration-200 
        ${onClick ? 'cursor-pointer hover:border-gray-500 hover:shadow-lg' : ''}
        ${player.hasLeftRealm ? 'opacity-60 border-red-800' : 'border-gray-600'}
        ${className}
      `}
      onClick={handleClick}
    >
      <CardContent className={`${compact ? 'p-4' : 'p-6'}`}>
        <div className="space-y-3">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-white truncate">
                {player.name}
              </h3>
              <p className="text-sm text-gray-400 truncate">
                ID: {player.lordId}
              </p>
            </div>
            
            {player.hasLeftRealm && (
              <Badge variant="destructive" className="ml-2 text-xs">
                Left Realm
              </Badge>
            )}
          </div>

          {/* Alliance */}
          {player.allianceTag && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-400">Alliance:</span>
              <Badge variant="secondary" className="text-xs">
                {player.allianceTag}
              </Badge>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-400">Power</p>
              <p className="font-medium text-white">
                {formatPower(player.power)}
              </p>
            </div>
            
            <div>
              <p className="text-gray-400">Merits</p>
              <p className="font-medium text-white">
                {formatNumber(player.merits)}
              </p>
            </div>
            
            {!compact && (
              <>
                <div>
                  <p className="text-gray-400">Division</p>
                  <p className="font-medium text-white">
                    {player.division}
                  </p>
                </div>
                
                <div>
                  <p className="text-gray-400">City Level</p>
                  <p className="font-medium text-white">
                    {player.cityLevel}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Metrics not available for PlayerListItemDto - only for PlayerDetailDto */}

          {/* Faction */}
          {player.faction && !compact && (
            <div className="pt-2">
              <Badge variant="outline" className="text-xs">
                {player.faction}
              </Badge>
            </div>
          )}

          {/* Last Seen (if left realm) */}
          {player.hasLeftRealm && player.lastSeenAt && (
            <div className="pt-2 text-xs text-gray-500">
              Last seen: {new Date(player.lastSeenAt).toLocaleDateString()}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Helper function to format large numbers
function formatNumber(value: string | number): string {
  const num = typeof value === 'string' ? parseInt(value) : value;
  if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
  return num.toLocaleString();
}

// Helper function to format power values
function formatPower(value: string): string {
  try {
    const bigIntValue = BigInt(value || '0');
    const numValue = Number(bigIntValue);
    return formatNumber(numValue);
  } catch {
    return '0';
  }
}