'use client';

import { useState } from 'react';

interface BulkExportOptions {
  format?: 'basic' | 'detailed';
  includeHistory?: boolean;
}

export function useBulkActions() {
  const [isExporting, setIsExporting] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const exportSelectedPlayers = async (
    playerIds: string[], 
    options: BulkExportOptions = {}
  ) => {
    if (playerIds.length === 0) {
      throw new Error('No players selected for export');
    }

    setIsExporting(true);
    try {
      const response = await fetch('/api/leaderboard/bulk-export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          playerIds,
          format: options.format || 'detailed',
          includeHistory: options.includeHistory || false
        })
      });

      if (!response.ok) {
        throw new Error('Failed to export players');
      }

      const exportData = await response.json();
      
      // Create CSV content
      const headers = [
        'Player ID', 'Name', 'Alliance', 'Power', 'Merits', 'Merit Efficiency',
        'Level', 'Division', 'Faction'
      ];

      if (options.format === 'detailed') {
        headers.push(
          'Units Killed', 'Units Dead', 'K/D Ratio', 'Victories', 'Defeats', 
          'Win Rate %', 'Helps Given', 'City Sieges', 'Scouted',
          'Building Power', 'Hero Power', 'Legion Power', 'Tech Power',
          'Gold', 'Wood', 'Ore', 'Mana', 'Gems'
        );
      }

      const csvContent = [
        headers.join(','),
        ...exportData.data.map((player: any) => {
          const baseRow = [
            player.playerId,
            `"${player.name}"`,
            `"${player.alliance}"`,
            player.power,
            player.merits,
            player.meritEfficiency,
            player.level,
            player.division,
            `"${player.faction || ''}"`
          ];

          if (options.format === 'detailed') {
            baseRow.push(
              player.unitsKilled || 0,
              player.unitsDead || 0,
              player.killDeathRatio || 0,
              player.victories || 0,
              player.defeats || 0,
              player.winRate || 0,
              player.helpsGiven || 0,
              player.citySieges || 0,
              player.scouted || 0,
              player.buildingPower || 0,
              player.heroPower || 0,
              player.legionPower || 0,
              player.techPower || 0,
              player.gold || 0,
              player.wood || 0,
              player.ore || 0,
              player.mana || 0,
              player.gems || 0
            );
          }

          return baseRow.join(',');
        })
      ].join('\n');

      // Download CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 
        `selected_players_${options.format}_${new Date().toISOString().split('T')[0]}.csv`
      );
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      return exportData;

    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    } finally {
      setIsExporting(false);
    }
  };

  const generatePerformanceReport = async (playerIds: string[]) => {
    if (playerIds.length === 0) {
      throw new Error('No players selected for report generation');
    }

    setIsGeneratingReport(true);
    try {
      const exportData = await fetch('/api/leaderboard/bulk-export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          playerIds,
          format: 'detailed',
          includeHistory: true
        })
      });

      if (!exportData.ok) {
        throw new Error('Failed to generate performance report');
      }

      const data = await exportData.json();
      
      // Generate performance report
      const report = {
        title: 'Performance Report',
        generatedAt: new Date().toISOString(),
        summary: data.summary,
        playerAnalysis: data.data.map((player: any) => {
          const efficiencyRating = 
            player.meritEfficiency >= 2.0 ? 'Elite' :
            player.meritEfficiency >= 1.5 ? 'Excellent' :
            player.meritEfficiency >= 1.0 ? 'Good' :
            player.meritEfficiency >= 0.5 ? 'Average' : 'Needs Improvement';

          const recommendations: string[] = [];
          
          if (player.meritEfficiency < 1.0) {
            recommendations.push('Focus on merit accumulation through combat and events');
          }
          if (player.killDeathRatio < 1.0) {
            recommendations.push('Improve combat efficiency and army composition');
          }
          if (player.winRate < 60) {
            recommendations.push('Review battle strategy and target selection');
          }
          if (player.helpsGiven < 10) {
            recommendations.push('Increase alliance participation and help activity');
          }

          return {
            ...player,
            efficiencyRating,
            recommendations,
            riskLevel: player.meritEfficiency < 0.5 ? 'High' : 
                      player.meritEfficiency < 1.0 ? 'Medium' : 'Low'
          };
        })
      };

      // Create JSON report file
      const reportBlob = new Blob([JSON.stringify(report, null, 2)], 
        { type: 'application/json;charset=utf-8;' }
      );
      const reportLink = document.createElement('a');
      const reportUrl = URL.createObjectURL(reportBlob);
      reportLink.setAttribute('href', reportUrl);
      reportLink.setAttribute('download', 
        `performance_report_${new Date().toISOString().split('T')[0]}.json`
      );
      reportLink.style.visibility = 'hidden';
      document.body.appendChild(reportLink);
      reportLink.click();
      document.body.removeChild(reportLink);

      return report;

    } catch (error) {
      console.error('Report generation failed:', error);
      throw error;
    } finally {
      setIsGeneratingReport(false);
    }
  };

  return {
    isExporting,
    isGeneratingReport,
    exportSelectedPlayers,
    generatePerformanceReport
  };
}