/**
 * Utility functions for formatting data consistently across the application
 */

/**
 * Format large numbers with appropriate suffixes (K, M, B, T)
 */
export function formatNumber(value: string | number | bigint, precision: number = 1): string {
  let num: number;
  
  if (typeof value === 'bigint') {
    num = Number(value);
  } else if (typeof value === 'string') {
    num = parseInt(value) || 0;
  } else {
    num = value || 0;
  }

  if (num >= 1e12) return (num / 1e12).toFixed(precision) + 'T';
  if (num >= 1e9) return (num / 1e9).toFixed(precision) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(precision) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(precision) + 'K';
  
  return num.toLocaleString();
}

/**
 * Format power values (handles BigInt strings)
 */
export function formatPower(value: string, precision: number = 1): string {
  try {
    const bigIntValue = BigInt(value || '0');
    const numValue = Number(bigIntValue);
    return formatNumber(numValue, precision);
  } catch {
    return '0';
  }
}

/**
 * Format percentage values
 */
export function formatPercentage(value: number, precision: number = 1): string {
  return `${value.toFixed(precision)}%`;
}

/**
 * Format dates consistently
 */
export function formatDate(date: string | Date, format: 'short' | 'long' | 'time' = 'short'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  switch (format) {
    case 'long':
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    case 'time':
      return dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    case 'short':
    default:
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
  }
}

/**
 * Format time duration in a human-readable format
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

/**
 * Format file sizes
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format currency values
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

/**
 * Format battle efficiency ratio
 */
export function formatBattleEfficiency(unitsKilled: string | number, unitsDead: string | number): number {
  const killed = typeof unitsKilled === 'string' ? parseInt(unitsKilled) || 0 : unitsKilled;
  const dead = typeof unitsDead === 'string' ? parseInt(unitsDead) || 0 : unitsDead;
  
  if (dead === 0) return killed > 0 ? 100 : 0;
  return Math.round((killed / dead) * 100) / 100;
}

/**
 * Format kill/death ratio
 */
export function formatKillDeathRatio(victories: number, defeats: number): number {
  if (defeats === 0) return victories > 0 ? victories : 0;
  return Math.round((victories / defeats) * 100) / 100;
}

/**
 * Format alliance tag with fallback
 */
export function formatAllianceTag(tag: string | null | undefined): string {
  return tag || 'No Alliance';
}

/**
 * Format player status
 */
export function formatPlayerStatus(hasLeftRealm: boolean, lastSeenAt?: string): {
  status: 'active' | 'inactive' | 'left';
  label: string;
  color: string;
} {
  if (hasLeftRealm) {
    return {
      status: 'left',
      label: 'Left Realm',
      color: 'text-red-400'
    };
  }
  
  if (lastSeenAt) {
    const daysSinceLastSeen = Math.floor(
      (Date.now() - new Date(lastSeenAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceLastSeen > 7) {
      return {
        status: 'inactive',
        label: `Inactive (${daysSinceLastSeen}d)`,
        color: 'text-yellow-400'
      };
    }
  }
  
  return {
    status: 'active',
    label: 'Active',
    color: 'text-green-400'
  };
}

/**
 * Format search query highlighting
 */
export function highlightSearchQuery(text: string, query: string): string {
  if (!query) return text;
  
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<mark class="bg-yellow-200 text-yellow-900">$1</mark>');
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  
  if (years > 0) return `${years} year${years > 1 ? 's' : ''} ago`;
  if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`;
  if (weeks > 0) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  
  return 'Just now';
}

/**
 * Format upload status with appropriate styling
 */
export function formatUploadStatus(status: 'PROCESSING' | 'COMPLETED' | 'FAILED'): {
  label: string;
  color: string;
  bgColor: string;
} {
  switch (status) {
    case 'COMPLETED':
      return {
        label: 'Completed',
        color: 'text-green-400',
        bgColor: 'bg-green-500/10 border-green-500'
      };
    case 'FAILED':
      return {
        label: 'Failed',
        color: 'text-red-400',
        bgColor: 'bg-red-500/10 border-red-500'
      };
    case 'PROCESSING':
    default:
      return {
        label: 'Processing',
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/10 border-yellow-500'
      };
  }
}