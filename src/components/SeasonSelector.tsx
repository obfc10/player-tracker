'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSeason } from '@/contexts/SeasonContext';
import { 
  Calendar,
  Infinity,
  Trophy,
  ChevronDown,
  Check
} from 'lucide-react';

interface SeasonSelectorProps {
  compact?: boolean;
  className?: string;
}

export function SeasonSelector({ compact = false, className = '' }: SeasonSelectorProps) {
  const { 
    seasons, 
    currentSeason, 
    selectedSeasonMode, 
    selectedSeasonId, 
    setSeasonMode, 
    loading 
  } = useSeason();
  
  const [isOpen, setIsOpen] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const getCurrentDisplayText = () => {
    if (!hasMounted) {
      return 'Loading...';
    }
    if (selectedSeasonMode === 'all-time') {
      return 'All Time Data';
    } else if (selectedSeasonMode === 'current' && currentSeason) {
      return `Current: ${currentSeason.name}`;
    } else if (selectedSeasonMode === 'specific' && selectedSeasonId) {
      const season = seasons.find(s => s.id === selectedSeasonId);
      return season ? season.name : 'Unknown Season';
    }
    return 'Select Period';
  };

  const handleModeSelect = (mode: 'current' | 'all-time' | 'specific', seasonId?: string) => {
    setSeasonMode(mode, seasonId);
    setIsOpen(false);
  };

  if (loading || !hasMounted) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-10 bg-gray-700 rounded"></div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`relative ${className}`}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
        >
          <Calendar className="w-4 h-4" />
          {getCurrentDisplayText()}
          <ChevronDown className="w-4 h-4" />
        </Button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-1 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
            <div className="p-2 space-y-1">
              {/* All Time Option */}
              <button
                onClick={() => handleModeSelect('all-time')}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${
                  selectedSeasonMode === 'all-time' 
                    ? 'bg-purple-600/20 text-purple-300' 
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <Infinity className="w-4 h-4" />
                All Time Data
                {selectedSeasonMode === 'all-time' && <Check className="w-4 h-4 ml-auto" />}
              </button>

              {/* Current Season Option */}
              {currentSeason && (
                <button
                  onClick={() => handleModeSelect('current')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${
                    selectedSeasonMode === 'current' 
                      ? 'bg-green-600/20 text-green-300' 
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <Trophy className="w-4 h-4" />
                  Current: {currentSeason.name}
                  <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs">
                    Active
                  </Badge>
                  {selectedSeasonMode === 'current' && <Check className="w-4 h-4 ml-auto" />}
                </button>
              )}

              {/* Separator */}
              {seasons.length > 0 && (
                <div className="border-t border-gray-700 my-1"></div>
              )}

              {/* Individual Seasons */}
              {seasons.map(season => (
                <button
                  key={season.id}
                  onClick={() => handleModeSelect('specific', season.id)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${
                    selectedSeasonMode === 'specific' && selectedSeasonId === season.id
                      ? 'bg-blue-600/20 text-blue-300' 
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  {season.name}
                  {season.isActive && (
                    <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs">
                      Active
                    </Badge>
                  )}
                  {selectedSeasonMode === 'specific' && selectedSeasonId === season.id && (
                    <Check className="w-4 h-4 ml-auto" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full card version
  return (
    <Card className={`bg-gray-800 border-gray-700 ${className}`}>
      <CardHeader>
        <CardTitle className="text-white text-sm">Data Period</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* All Time Button */}
          <Button
            variant={selectedSeasonMode === 'all-time' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => handleModeSelect('all-time')}
            className="w-full justify-start"
          >
            <Infinity className="w-4 h-4 mr-2" />
            All Time Data
          </Button>

          {/* Current Season Button */}
          {currentSeason && (
            <Button
              variant={selectedSeasonMode === 'current' ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => handleModeSelect('current')}
              className="w-full justify-start"
            >
              <Trophy className="w-4 h-4 mr-2" />
              Current: {currentSeason.name}
            </Button>
          )}

          {/* Individual Seasons */}
          {seasons.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs text-gray-400 uppercase tracking-wider px-2 py-1">
                Specific Seasons
              </div>
              {seasons.slice(0, 5).map(season => (
                <Button
                  key={season.id}
                  variant={selectedSeasonMode === 'specific' && selectedSeasonId === season.id ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => handleModeSelect('specific', season.id)}
                  className="w-full justify-start text-xs"
                >
                  <Calendar className="w-3 h-3 mr-2" />
                  {season.name}
                  {season.isActive && (
                    <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs ml-auto">
                      Active
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}