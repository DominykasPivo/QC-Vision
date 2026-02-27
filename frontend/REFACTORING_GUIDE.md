# Frontend Refactoring Guide

## 📊 Refactoring Results

### createtests.tsx Transformation

- **Before**: 623 lines
- **After**: 182 lines
- **Reduction**: 71% (441 lines removed)

## 🏗️ New Folder Structure

```
frontend/src/
├── hooks/                      # Custom React hooks
│   ├── index.ts
│   ├── useTestSearch.ts       # Search state management
│   ├── useTestFilters.ts      # Filter state management
│   ├── usePagination.ts       # Generic pagination logic
│   └── useFilteredTests.ts    # Combined filtering/sorting
│
├── lib/
│   ├── constants/             # Constants & configurations
│   │   ├── index.ts
│   │   └── testConstants.ts   # Test-related constants
│   │
│   └── utils/
│       └── tests/             # Test-related utilities
│           ├── index.ts
│           ├── dateFilters.ts    # Date range filtering
│           ├── searchHelpers.ts  # Search tokenization
│           └── testSorting.ts    # Sort comparators
│
└── components/
    ├── tests/                 # Test-specific components
    │   ├── index.ts
    │   ├── TestCard.tsx          # Individual test card
    │   ├── TestSearchBar.tsx     # Search form
    │   ├── TestFilters.tsx       # Desktop filters
    │   └── TestFiltersMobile.tsx # Mobile filter modal
    │
    └── common/                # Shared components
        ├── index.ts
        └── EmptyState.tsx        # Generic empty state
```

## 🎯 What Was Extracted

### 1. Custom Hooks (`hooks/`)

**useTestSearch.ts** - Search state management

- Manages search input and query state
- Handles search submission
- Provides clear search functionality

**useTestFilters.ts** - Filter state management

- Manages all filter states (status, type, assigned to, date range)
- Provides unified filter update function
- Tracks if any filters are active

**usePagination.ts** - Generic pagination logic

- Reusable for any list
- Handles page navigation
- Auto-adjusts when items change

**useFilteredTests.ts** - Combined filtering/sorting

- Applies all filters (search, status, type, etc.)
- Sorts results based on selected option
- Single source of truth for filtered data

### 2. Utility Functions (`lib/utils/tests/`)

**dateFilters.ts** - Pure functions for date filtering

- `isInDateRange()` - Checks if deadline matches filter
- Supports: overdue, today, this week, this month, next month

**searchHelpers.ts** - Search text processing

- `tokenizeSearchQuery()` - Splits search into tokens
- `createSearchableText()` - Builds searchable string
- `matchesAllTokens()` - Checks if all tokens match

**testSorting.ts** - Sorting comparators

- Individual sort functions for each option
- `sortTests()` - Main sorting function
- Fully typed with SortOption enum

### 3. Constants (`lib/constants/`)

**testConstants.ts** - Centralized constants

- `STATUS_LABELS` - Display labels for statuses
- `STATUS_TEXT_COLORS` - Color classes for statuses
- `SORT_OPTIONS` - Available sort options
- `DATE_RANGE_OPTIONS` - Date filter options
- `DEFAULT_PAGE_SIZE` - Pagination size

### 4. UI Components (`components/`)

**TestCard.tsx** - Individual test card

- Self-contained test display
- Handles ID formatting
- Includes view details button

**TestSearchBar.tsx** - Search form

- Controlled input with change handler
- Submit handling
- Clear on empty input

**TestFilters.tsx** - Desktop filter controls

- All filter dropdowns
- Assigned to input
- Sort selection

**TestFiltersMobile.tsx** - Mobile filter modal

- Full-screen modal for mobile
- Same filters as desktop
- Toggle button with active indicator

**EmptyState.tsx** - Generic empty state

- Reusable for any empty list
- Supports custom actions
- Error variant support

## 🔄 How to Apply This Pattern to Other Pages

### Step 1: Identify What to Extract

For any large page component, identify:

1. **State Logic** → Custom Hooks
   - Form state management
   - Filter/search logic
   - Pagination
   - Data fetching

2. **Pure Functions** → Utilities
   - Sorting algorithms
   - Filtering logic
   - Data transformations
   - Calculations

3. **Constants** → Constants files
   - Status mappings
   - Color schemes
   - Configuration values
   - Option lists

4. **Repeated JSX** → Components
   - Cards, lists, grids
   - Forms and inputs
   - Modals and dialogs
   - Empty states

### Step 2: Create the Structure

```bash
# For a new feature called "reports"
mkdir frontend/src/hooks
mkdir frontend/src/lib/utils/reports
mkdir frontend/src/lib/constants
mkdir frontend/src/components/reports
```

### Step 3: Extract in Order

1. **Constants first** - They have no dependencies
2. **Utilities next** - May depend on constants
3. **Hooks** - May depend on utilities and constants
4. **Components** - Depend on everything else
5. **Refactor page** - Use all extracted pieces

### Step 4: Example Pattern

**Before** (500+ lines):

```tsx
export function MyPage() {
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState("desc");
  // 50 lines of state

  const filtered = useMemo(() => {
    // 100 lines of filtering logic
  }, [deps]);

  return <div>{/* 300 lines of JSX */}</div>;
}
```

**After** (100-150 lines):

```tsx
export function MyPage() {
  const { filters, updateFilter } = useMyFilters();
  const filtered = useFilteredData(data, filters);
  const { paginatedItems, ...pagination } = usePagination(filtered, 12);

  return (
    <PageContainer>
      <PageHeader />
      <MyFilters filters={filters} onChange={updateFilter} />
      <MyDataGrid items={paginatedItems} />
      <Pagination {...pagination} />
    </PageContainer>
  );
}
```

## 📏 Code Quality Metrics

### Target Line Counts

- ✅ **Page components**: 100-200 lines
- ✅ **Reusable components**: 50-150 lines
- ✅ **Custom hooks**: 30-100 lines
- ✅ **Utility functions**: 10-50 lines

### Benefits

1. **Maintainability**: Easier to find and fix bugs
2. **Testability**: Small units are easier to test
3. **Reusability**: Components/hooks work across pages
4. **Readability**: Less cognitive load per file
5. **Collaboration**: Smaller files = fewer merge conflicts

## 🔍 Pages to Refactor Next

Based on current line counts:

1. **PhotoDefects.tsx** (1,300 lines) - PRIORITY 🔴
   - Extract annotation logic
   - Create Konva canvas component
   - Separate defect management hooks

2. **TestDetails.tsx** (1,283 lines) - PRIORITY 🔴
   - Extract status management
   - Create detail sections as components
   - Separate form handling logic

3. **TestsList.tsx** (716 lines)
   - Similar to createtests.tsx
   - Reuse existing test components
   - Extract any unique logic

4. **Gallery.tsx** (608 lines)
   - Extract image grid component
   - Create lightbox component
   - Separate upload logic

5. **CreateTest.tsx** (552 lines)
   - Extract form sections
   - Create field components
   - Separate validation logic

## 💡 Best Practices

### 1. Single Responsibility

Each file should do ONE thing well.

### 2. Composition Over Complexity

Build small pieces and compose them together.

### 3. Keep Related Code Together

Use feature-based folders when appropriate:

```
components/
  tests/        # All test-related components
  photos/       # All photo-related components
  annotations/  # All annotation components
```

### 4. Use Barrel Exports

Create `index.ts` files for clean imports:

```tsx
// Instead of:
import { TestCard } from "@/components/tests/TestCard";
import { TestFilters } from "@/components/tests/TestFilters";

// Do this:
import { TestCard, TestFilters } from "@/components/tests";
```

### 5. Type Everything

Use TypeScript types and interfaces for better IDE support and fewer bugs.

### 6. Document Complex Logic

Add JSDoc comments to utility functions explaining what they do.

## 🚀 Next Steps

1. **Test the refactored page** - Ensure all functionality works
2. **Apply pattern to PhotoDefects.tsx** - Biggest impact
3. **Create shared photo components** - Used by multiple pages
4. **Extract form components** - Reused across create/edit pages
5. **Add unit tests** - Test utilities and hooks independently

## 📚 Additional Resources

- [React Hooks Documentation](https://react.dev/reference/react)
- [Component Composition Patterns](https://react.dev/learn/passing-props-to-a-component)
- [Custom Hooks Best Practices](https://react.dev/learn/reusing-logic-with-custom-hooks)
- [TypeScript with React](https://react.dev/learn/typescript)
