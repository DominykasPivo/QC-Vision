# QC Matrix Components

This folder contains all components, types, helpers, and utilities related to the QC Matrix feature.

## Structure

- **QCMatrixCard.tsx** - Main component that orchestrates the QC Matrix display
- **QCMatrixCard.types.ts** - TypeScript type definitions for the QC Matrix
- **QCMatrixCard.helpers.ts** - Helper functions (parseColumns, getCellStatus)
- **MatrixCell.tsx** - Individual cell component with photo display
- **MatrixTable.tsx** - Table structure and header rendering
- **ColumnDropdown.tsx** - Dropdown UI for managing visible columns
- **index.ts** - Barrel exports for easy importing

## Related Files

- **useMatrixColumns.ts** - Located in `/hooks`, contains all state management logic

## Usage

```tsx
import { QCMatrixCard } from "@/components/tests/qc-matrix";

<QCMatrixCard
  testId={testId}
  colors={colors}
  photos={photos}
  matrixColumns={matrixColumns}
/>;
```
