# Old Loading Code Migration Checklist

## 🎯 Files That Still Use Old Loading Patterns

### Dashboard Pages (High Priority)
These are the main user-facing pages that should be migrated first:

1. **`/src/app/dashboard/merits/page.tsx`** ⚠️
   - Uses: `const [loading, setLoading] = useState(true)`
   - Pattern: Full page loading for merit analytics
   - Migration: Use `useDataTable` hook for merit leaderboards

2. **`/src/app/dashboard/name-changes/page.tsx`** ⚠️
   - Uses: `const [loading, setLoading] = useState(true)`
   - Pattern: Table loading for name change history
   - Migration: Use `useDataTable` hook

3. **`/src/app/dashboard/changes/page.tsx`** ⚠️
   - Uses: `const [loading, setLoading] = useState(true)`
   - Pattern: Table loading for alliance/name changes
   - Migration: Use `useDataTable` hook

4. **`/src/app/dashboard/alliance-moves/page.tsx`** ⚠️
   - Uses: `const [loading, setLoading] = useState(true)`
   - Pattern: Table loading for alliance movement tracking
   - Migration: Use `useDataTable` hook

5. **`/src/app/dashboard/overview/page.tsx`** ⚠️
   - Uses: `const [loading, setLoading] = useState(true)`
   - Pattern: Dashboard stats loading
   - Migration: Use `useApiWithLoading` hook

6. **`/src/app/dashboard/joined-realm/page.tsx`** ⚠️
   - Uses: `const [loading, setLoading] = useState(true)` + `const [loadingSnapshots, setLoadingSnapshots] = useState(false)`
   - Pattern: Dual loading states for players and snapshots
   - Migration: Use `useDataTable` + `useApiWithLoading`

7. **`/src/app/dashboard/players/page.tsx`** ⚠️
   - Uses: `const [loading, setLoading] = useState(true)`
   - Pattern: Player list loading
   - Migration: Use `useDataTable` hook

8. **`/src/app/dashboard/left-realm/page.tsx`** ⚠️
   - Uses: `const [loading, setLoading] = useState(true)`
   - Pattern: Player list loading for left realm players
   - Migration: Use `useDataTable` hook

9. **`/src/app/dashboard/progress/page.tsx`** ⚠️
   - Uses: `const [loading, setLoading] = useState(false)`
   - Pattern: Progress tracking data
   - Migration: Use `useApiWithLoading` hook

10. **`/src/app/dashboard/upload/page.tsx`** ⚠️
    - Uses: `const [uploading, setUploading] = useState(false)`
    - Pattern: File upload progress
    - Migration: Use `ButtonLoadingWrapper` component

### Admin Pages (Medium Priority)

11. **`/src/app/dashboard/admin/seasons/page.tsx`** ⚠️
    - Uses: `const [loading, setLoading] = useState(true)`
    - Pattern: Admin season management
    - Migration: Use `useDataTable` hook

12. **`/src/app/dashboard/admin/users/page.tsx`** ⚠️
    - Uses: `const [loading, setLoading] = useState(true)`
    - Pattern: User management table
    - Migration: Use `useDataTable` hook

### Components (Medium Priority)

13. **`/src/components/player-detail/PlayerDetailCard.tsx`** ⚠️
    - Uses: `const [loading, setLoading] = useState(true)`
    - Pattern: Player detail loading
    - Migration: Use `useApiWithLoading` hook

14. **`/src/components/upload/UploadHistory.tsx`** ⚠️
    - Uses: `const [loading, setLoading] = useState(true)`
    - Pattern: Upload history table
    - Migration: Use `useDataTable` hook

15. **`/src/components/progress/PlayerSearch.tsx`** ⚠️
    - Uses: `const [loading, setLoading] = useState(false)`
    - Pattern: Search functionality
    - Migration: Use `useApiWithLoading` hook

### Events System (Lower Priority)

16. **`/src/components/events/EventSelector.tsx`** ⚠️
17. **`/src/components/events/PlayerSelectionGrid.tsx`** ⚠️
18. **`/src/components/events/TeamManager.tsx`** ⚠️
19. **`/src/components/events/EventCreationModal.tsx`** ⚠️
20. **`/src/components/events/EventParticipationManager.tsx`** ⚠️
21. **`/src/components/events/EventTypeManagementModal.tsx`** ⚠️

### Debug/Utility (Lowest Priority)

22. **`/src/components/debug/SystemStatus.tsx`** ⚠️

## 🚀 Migration Priority Order

### Phase 1: Core Dashboard Pages (Immediate)
- Merits page
- Overview page  
- Changes page
- Name changes page
- Alliance moves page

### Phase 2: Data Management Pages
- Players page
- Joined realm page
- Left realm page
- Progress page
- Upload page

### Phase 3: Admin & Components
- Admin pages
- Player detail component
- Upload history component
- Search components

### Phase 4: Events System
- All events-related components

## 🔧 Common Migration Patterns

### Old Pattern - Data Table Pages
```tsx
const [loading, setLoading] = useState(true);
const [data, setData] = useState([]);

useEffect(() => {
  fetchData();
}, [/* dependencies */]);

const fetchData = async () => {
  setLoading(true);
  try {
    const response = await fetch('/api/endpoint');
    const result = await response.json();
    setData(result);
  } finally {
    setLoading(false);
  }
};

// In render:
{loading ? <LoadingSpinner /> : <DataTable data={data} />}
```

### New Pattern - Data Table Pages
```tsx
const dataTable = useDataTable({
  fetchFunction: async (params) => {
    const response = await fetch(`/api/endpoint?${new URLSearchParams(params)}`);
    return response.json();
  },
  initialSort: { field: 'name', direction: 'asc' },
  initialFilters: {},
});

// In render:
<ContentLoadingWrapper loadingStates={dataTable.loadingStates}>
  <DataTable 
    data={dataTable.data}
    onSort={dataTable.handleSort}
    loading={dataTable.loadingStates.action}
  />
</ContentLoadingWrapper>
```

### Old Pattern - Simple API Calls
```tsx
const [loading, setLoading] = useState(false);

const handleAction = async () => {
  setLoading(true);
  try {
    await fetch('/api/action', { method: 'POST' });
  } finally {
    setLoading(false);
  }
};

// In render:
<button disabled={loading} onClick={handleAction}>
  {loading ? 'Loading...' : 'Action'}
</button>
```

### New Pattern - Simple API Calls
```tsx
const api = useApiWithLoading();

const handleAction = () => {
  api.executeAction(async () => {
    return fetch('/api/action', { method: 'POST' });
  });
};

// In render:
<ButtonLoadingWrapper 
  isLoading={api.loadingStates.action}
  onClick={handleAction}
  loadingText="Processing..."
>
  Action
</ButtonLoadingWrapper>
```

## ✅ Benefits After Migration

- **Consistent UX**: All pages will have the same professional loading behavior
- **Better Performance**: No more jarring full-page spinners for user actions
- **Reduced Code**: Less boilerplate loading state management
- **Type Safety**: Full TypeScript support with the new hooks
- **Error Handling**: Built-in error management and retry logic
- **Request Cancellation**: Automatic cleanup of ongoing requests

## 📋 Testing Checklist

For each migrated page, verify:
- [ ] Initial loading shows appropriate spinner
- [ ] Sort/filter actions show subtle loading feedback
- [ ] Loading states don't block user interaction unnecessarily
- [ ] Error states are handled gracefully
- [ ] No console errors or TypeScript issues
- [ ] Performance feels snappy and responsive

## 📈 Estimated Migration Time

- **Phase 1**: 2-3 hours (high impact, core pages)
- **Phase 2**: 3-4 hours (data management pages)
- **Phase 3**: 2-3 hours (admin and components)  
- **Phase 4**: 3-4 hours (events system)

**Total**: ~10-14 hours for complete migration

The investment will significantly improve the user experience across the entire application!