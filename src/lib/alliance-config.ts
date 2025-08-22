// Sitewide alliance configuration for managed alliances

export interface ManagedAlliance {
  tag: string;
  id: string;
  priority: number;
  name: string;
  color: string;
}

// Primary alliances managed by the administrator
export const MANAGED_ALLIANCES: ManagedAlliance[] = [
  {
    tag: 'PLAC',
    id: '340984',
    priority: 1,
    name: 'PLAC',
    color: 'text-blue-400 bg-blue-400/20 border-blue-400/30'
  },
  {
    tag: 'FLAs',
    id: '341001',
    priority: 2,
    name: 'FLAs',
    color: 'text-green-400 bg-green-400/20 border-green-400/30'
  },
  {
    tag: 'Plaf',
    id: '340914',
    priority: 3,
    name: 'Plaf',
    color: 'text-purple-400 bg-purple-400/20 border-purple-400/30'
  }
];

// Helper functions
export const getManagedAllianceByTag = (tag: string): ManagedAlliance | undefined => {
  return MANAGED_ALLIANCES.find(alliance => alliance.tag === tag);
};

export const isManagedAlliance = (tag: string): boolean => {
  return MANAGED_ALLIANCES.some(alliance => alliance.tag === tag);
};

export const getManagedAllianceTags = (): string[] => {
  return MANAGED_ALLIANCES.map(alliance => alliance.tag);
};

export const getManagedAllianceColor = (tag: string): string => {
  const alliance = getManagedAllianceByTag(tag);
  return alliance ? alliance.color : 'text-gray-400 bg-gray-400/20 border-gray-400/30';
};

export const sortAlliancesByPriority = (alliances: string[]): string[] => {
  const managedTags = getManagedAllianceTags();
  const managed = alliances.filter(tag => managedTags.includes(tag));
  const unmanaged = alliances.filter(tag => !managedTags.includes(tag));
  
  // Sort managed alliances by priority
  managed.sort((a, b) => {
    const priorityA = getManagedAllianceByTag(a)?.priority || 999;
    const priorityB = getManagedAllianceByTag(b)?.priority || 999;
    return priorityA - priorityB;
  });
  
  // Sort unmanaged alliances alphabetically
  unmanaged.sort();
  
  return [...managed, ...unmanaged];
};

// Filter options for UI components
export const ALLIANCE_FILTER_OPTIONS = [
  { value: 'all', label: 'All Alliances' },
  { value: 'managed', label: 'My Alliances (PLAC, FLAs, Plaf)' },
  { value: 'PLAC', label: 'PLAC (Primary)' },
  { value: 'FLAs', label: 'FLAs' },
  { value: 'Plaf', label: 'Plaf' },
  { value: 'others', label: 'Other Alliances' }
];