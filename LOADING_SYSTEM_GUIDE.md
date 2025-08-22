# Sitewide Loading System Implementation Guide

This guide explains how to implement the new smart loading system across all pages in the application for a much better user experience.

## 🎯 Benefits

- **No more jarring loading wheels** for user actions like sorting/filtering
- **Subtle feedback** that doesn't interrupt the user's flow
- **Consistent experience** across all pages
- **Better perceived performance** with smart loading states
- **Reduced user errors** with disabled states during loading

## 📚 Available Tools

### 1. Core Hooks

#### `useLoadingStates`
Basic loading state management with three types:
- `initial`: Full page loading (shows main spinner)
- `action`: User actions like sort/filter (subtle feedback)
- `background`: Background operations (minimal UI impact)

#### `useApiWithLoading`
Combines API calls with smart loading state management:
- Automatic loading state handling
- Error management and retry logic
- Request cancellation
- Success/error callbacks

#### `useDataTable`
Complete solution for data tables with sorting, filtering, and pagination:
- Automatic API parameter building
- Smart loading for initial vs. action states
- Built-in sort/filter/pagination logic
- Optimized for common data table patterns

### 2. UI Components

#### `LoadingSpinner`
Configurable spinner component:
```tsx
<LoadingSpinner size="sm|md|lg" color="primary|secondary|white" />
```

#### `ActionLoadingIndicator`
Shows loading state next to content:
```tsx
<ActionLoadingIndicator isLoading={isLoading} loadingText="Updating...">
  <h1>Page Title</h1>
</ActionLoadingIndicator>
```

#### `ContentLoadingWrapper`
Wraps content with smart loading behavior:
```tsx
<ContentLoadingWrapper loadingStates={loadingStates}>
  <YourContent />
</ContentLoadingWrapper>
```

#### `TableLoadingWrapper`
Specialized wrapper for tables:
```tsx
<TableLoadingWrapper 
  isActionLoading={isActionLoading}
  title="Data Table"
  subtitle="1,234 items"
>
  <YourTable />
</TableLoadingWrapper>
```

#### `ButtonLoadingWrapper`
Loading states for buttons:
```tsx
<ButtonLoadingWrapper 
  isLoading={isLoading}
  loadingText="Saving..."
  onClick={handleClick}
>
  Save Data
</ButtonLoadingWrapper>
```

## 🚀 Implementation Examples

### Example 1: Simple Data Table Page

```tsx
'use client';

import { useDataTable } from '@/hooks/useDataTable';
import { ContentLoadingWrapper } from '@/components/ui/LoadingStates';

export default function PlayersPage() {
  const dataTable = useDataTable({
    fetchFunction: async (params) => {
      const response = await fetch(`/api/players?${new URLSearchParams(params)}`);
      return response.json();
    },
    initialSort: { field: 'name', direction: 'asc' },
    initialFilters: { status: 'active' },
  });

  return (
    <div className="p-6">
      <ContentLoadingWrapper loadingStates={dataTable.loadingStates}>
        <YourTableComponent
          data={dataTable.data}
          onSort={dataTable.handleSort}
          onFilter={dataTable.setFilter}
          loading={dataTable.loadingStates.action}
        />
      </ContentLoadingWrapper>
    </div>
  );
}
```

### Example 2: Custom API Calls

```tsx
'use client';

import { useApiWithLoading } from '@/hooks/useApiWithLoading';
import { ActionLoadingIndicator, ButtonLoadingWrapper } from '@/components/ui/LoadingStates';

export default function CustomPage() {
  const api = useApiWithLoading();

  const handleSave = async () => {
    await api.executeAction(async () => {
      const response = await fetch('/api/save', { method: 'POST', body: data });
      return response.json();
    });
  };

  const handleRefresh = async () => {
    await api.execute(async () => {
      const response = await fetch('/api/data');
      return response.json();
    });
  };

  return (
    <div className="p-6">
      <ActionLoadingIndicator 
        isLoading={api.loadingStates.action}
        loadingText="Processing..."
      >
        <h1>Page Title</h1>
      </ActionLoadingIndicator>

      <ButtonLoadingWrapper
        isLoading={api.loadingStates.action}
        onClick={handleSave}
        loadingText="Saving..."
      >
        Save Changes
      </ButtonLoadingWrapper>
    </div>
  );
}
```

### Example 3: Complex Forms

```tsx
'use client';

import { useApiWithLoading } from '@/hooks/useApiWithLoading';
import { ContentLoadingWrapper } from '@/components/ui/LoadingStates';

export default function FormPage() {
  const api = useApiWithLoading();
  const [formData, setFormData] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    await api.executeAction(async () => {
      const response = await fetch('/api/form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      return response.json();
    }, {
      onSuccess: () => {
        // Show success message, redirect, etc.
      },
      onError: (error) => {
        // Show error message
      }
    });
  };

  return (
    <ContentLoadingWrapper loadingStates={api.loadingStates}>
      <form onSubmit={handleSubmit}>
        {/* Form fields */}
        
        <button 
          type="submit" 
          disabled={api.loadingStates.action}
          className={api.loadingStates.action ? 'opacity-50 cursor-not-allowed' : ''}
        >
          {api.loadingStates.action ? 'Submitting...' : 'Submit'}
        </button>
      </form>
    </ContentLoadingWrapper>
  );
}
```

## 📋 Migration Checklist

### For Each Page:

1. **Replace existing loading state**:
   ```tsx
   // OLD
   const [loading, setLoading] = useState(false);
   
   // NEW
   const api = useApiWithLoading();
   // or
   const dataTable = useDataTable({ ... });
   ```

2. **Update fetch functions**:
   ```tsx
   // OLD
   const fetchData = async () => {
     setLoading(true);
     try {
       const response = await fetch('/api/data');
       const data = await response.json();
       setData(data);
     } finally {
       setLoading(false);
     }
   };
   
   // NEW
   const fetchData = () => api.execute(async () => {
     const response = await fetch('/api/data');
     return response.json();
   });
   ```

3. **Wrap content with loading components**:
   ```tsx
   // OLD
   {loading ? <LoadingSpinner /> : <YourContent />}
   
   // NEW
   <ContentLoadingWrapper loadingStates={api.loadingStates}>
     <YourContent />
   </ContentLoadingWrapper>
   ```

4. **Update action handlers**:
   ```tsx
   // OLD
   const handleSort = (field) => {
     setSortBy(field);
     // This triggers useEffect which shows loading
   };
   
   // NEW
   const handleSort = (field) => {
     dataTable.handleSort(field);
     // Automatically uses action loading
   };
   ```

### Priority Pages to Update:

1. **Dashboard pages** (`/dashboard/*`)
2. **Player detail pages**
3. **Data upload pages**
4. **Settings pages**
5. **Forms and modals**

## 🎨 Visual Loading States

### Initial Loading (Full Page)
- Large centered spinner
- "Loading..." text
- Blocks all interaction

### Action Loading (Sorts, Filters, etc.)
- Small spinner next to titles
- 70% opacity on content
- Disabled interactive elements
- Cursor changes to 'wait'

### Background Loading
- Minimal/no visual feedback
- For non-critical operations
- User can continue working

## 🔧 Customization

### Custom Loading Components
```tsx
const CustomLoader = () => (
  <div className="flex items-center gap-2">
    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    <span>Custom loading message...</span>
  </div>
);

<ContentLoadingWrapper 
  loadingStates={api.loadingStates}
  loadingComponent={<CustomLoader />}
>
  <Content />
</ContentLoadingWrapper>
```

### Custom Loading Behavior
```tsx
const api = useApiWithLoading();

// Custom retry logic
await api.execute(apiCall, {
  retryAttempts: 3,
  retryDelay: 2000,
  onSuccess: (data) => console.log('Success!', data),
  onError: (error) => console.error('Failed!', error)
});
```

## 📈 Performance Benefits

1. **Reduced API calls** through smart caching
2. **Better user experience** with appropriate loading feedback
3. **Prevented double-clicks** with disabled states
4. **Optimistic updates** where appropriate
5. **Request cancellation** to prevent race conditions

## 🧪 Testing

1. **Test all loading states** on each page
2. **Verify disabled states** work correctly
3. **Check loading indicators** appear and disappear properly
4. **Test error scenarios** and retry logic
5. **Ensure accessibility** with proper ARIA labels

This system provides a much more professional and responsive feel throughout the entire application!