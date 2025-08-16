'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Season {
  id: string;
  name: string;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
}

interface SeasonContextType {
  seasons: Season[];
  currentSeason: Season | null;
  selectedSeasonMode: 'current' | 'all-time' | 'specific';
  selectedSeasonId: string | null;
  setSeasonMode: (mode: 'current' | 'all-time' | 'specific', seasonId?: string) => void;
  refreshSeasons: () => Promise<void>;
  loading: boolean;
}

const SeasonContext = createContext<SeasonContextType | undefined>(undefined);

export function SeasonProvider({ children }: { children: React.ReactNode }) {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [currentSeason, setCurrentSeason] = useState<Season | null>(null);
  const [selectedSeasonMode, setSelectedSeasonMode] = useState<'current' | 'all-time' | 'specific'>('current');
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSeasons = async () => {
    try {
      const response = await fetch('/api/seasons');
      if (response.ok) {
        const data = await response.json();
        setSeasons(data.seasons);
        
        // Find and set current active season
        const activeSeason = data.seasons.find((s: Season) => s.isActive);
        setCurrentSeason(activeSeason || null);
        
        // Auto-select current season if available
        if (activeSeason && selectedSeasonMode === 'current') {
          setSelectedSeasonId(activeSeason.id);
        }
      }
    } catch (error) {
      console.error('Error fetching seasons:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSeasons();
  }, []);

  const setSeasonMode = (mode: 'current' | 'all-time' | 'specific', seasonId?: string) => {
    setSelectedSeasonMode(mode);
    
    if (mode === 'current' && currentSeason) {
      setSelectedSeasonId(currentSeason.id);
    } else if (mode === 'all-time') {
      setSelectedSeasonId(null);
    } else if (mode === 'specific' && seasonId) {
      setSelectedSeasonId(seasonId);
    }
  };

  const refreshSeasons = async () => {
    setLoading(true);
    await fetchSeasons();
  };

  return (
    <SeasonContext.Provider value={{
      seasons,
      currentSeason,
      selectedSeasonMode,
      selectedSeasonId,
      setSeasonMode,
      refreshSeasons,
      loading
    }}>
      {children}
    </SeasonContext.Provider>
  );
}

export function useSeason() {
  const context = useContext(SeasonContext);
  if (context === undefined) {
    throw new Error('useSeason must be used within a SeasonProvider');
  }
  return context;
}