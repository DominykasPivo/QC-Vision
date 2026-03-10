# Photo Rotation Feature - Complete Walkthrough

## 📋 Table of Contents

1. [Overview & User Workflow](#overview--user-workflow)
2. [Architecture Diagram](#architecture-diagram)
3. [File-by-File Breakdown](#file-by-file-breakdown)
4. [Data Flow](#data-flow)
5. [Code Examples](#code-examples)

---

## Overview & User Workflow

### What Problem Does This Solve?

Mobile devices often capture photos in the wrong orientation due to EXIF metadata issues. This feature allows users to manually rotate photos before uploading them.

### User Experience Flow

```
1. User uploads photos → 2. Previews appear → 3. Clicks rotate button (↻)
→ 4. Photo rotates 90° → 5. Submits form → 6. Rotated images uploaded
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      CreateTest.tsx                          │
│  (Main page component - orchestrates everything)             │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ usePhotoUpload() │  │ usePhotoPreview()│                │
│  │ - Manages files  │  │ - Tracks rotation│                │
│  │ - Validates      │  │ - Creates URLs   │                │
│  └──────────────────┘  └──────────────────┘                │
│           │                     │                            │
│           └─────────┬───────────┘                           │
│                     ▼                                        │
│         ┌─────────────────────┐                             │
│         │ PhotoPreviewGrid    │                             │
│         │ (Displays all photos)│                             │
│         └─────────────────────┘                             │
│                     │                                        │
│         ┌───────────┴───────────┐                           │
│         ▼                       ▼                           │
│  ┌──────────────┐       ┌──────────────┐                   │
│  │PhotoPreview  │  ...  │PhotoPreview  │                   │
│  │Card #1       │       │Card #N       │                   │
│  │  [Rotate ↻]  │       │  [Rotate ↻]  │                   │
│  └──────────────┘       └──────────────┘                   │
│         │                                                    │
│         └────────────────┐                                  │
│                          ▼                                  │
│              ┌────────────────────┐                         │
│              │ rotateImageFile()  │                         │
│              │ (Canvas rotation)  │                         │
│              └────────────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

---

## File-by-File Breakdown

### 🎯 **1. Core Utility: `image-rotation.ts`**

**Location:** `src/lib/utils/image-rotation.ts`

**Purpose:** Low-level image manipulation using HTML5 Canvas API

**Key Function: `rotateImageFile()`**

```typescript
export async function rotateImageFile(
  file: File,
  degrees: number,
): Promise<File>;
```

**What It Does:**

1. Creates an HTML `<img>` element and loads the file
2. Creates a `<canvas>` element with rotated dimensions
3. Applies rotation transformation using canvas context:
   - **90°**: Translates to top-right, rotates 90° clockwise
   - **180°**: Translates to bottom-right, rotates 180°
   - **270°**: Translates to bottom-left, rotates 270°
4. Draws the rotated image onto canvas
5. Converts canvas to Blob, then to a new File object
6. Returns the new rotated File with same name and type

**Why Canvas?**

- Canvas allows pixel-perfect image manipulation
- Produces actual rotated image data (not just CSS transform)
- Output is a real rotated file that gets uploaded

**Code Flow:**

```
File → Image → Canvas (rotated) → Blob → New File
```

---

### 🎨 **2. Presentation Component: `PhotoPreviewCard.tsx`**

**Location:** `src/components/tests/PhotoPreviewCard.tsx`

**Purpose:** Displays a single photo preview with rotate button

**New Props Added:**

- `rotation?: number` - Current rotation angle (0, 90, 180, 270)
- `onRotate?: () => void` - Callback when rotate button clicked
- `showRotateButton?: boolean` - Whether to show rotate button

**Visual Layout:**

```
┌────────────────────────┐
│ ┌────────────────────┐ │
│ │                 [↻]│ │ ← Rotate button (top-right)
│ │                    │ │
│ │   Photo Image      │ │ ← CSS transform applied
│ │                    │ │
│ └────────────────────┘ │
│ ┌────────────────────┐ │
│ │   Remove Button    │ │ ← Footer action
│ └────────────────────┘ │
└────────────────────────┘
```

**Key Code:**

```typescript
<img
  src={imageUrl}
  alt={alt}
  className="h-full w-full object-cover transition-transform duration-200"
  style={{
    transform: rotation ? `rotate(${rotation}deg)` : undefined,
  }}
/>
```

- CSS `transform: rotate()` provides instant visual feedback
- `transition-transform` makes rotation smooth (200ms)

**Rotate Button:**

```typescript
<button
  className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center
             rounded-lg bg-white/90 text-slate-700 shadow-md backdrop-blur-sm
             transition-all hover:bg-white hover:scale-110"
  onClick={onRotate}
>
  <RotateCw className="h-4 w-4" />
</button>
```

- Positioned `absolute top-2 right-2` (top-right corner)
- Semi-transparent white background (`bg-white/90`)
- Scales up on hover (`hover:scale-110`)
- Uses lucide-react's `RotateCw` icon

---

### 📊 **3. Grid Container: `PhotoPreviewGrid.tsx`**

**Location:** `src/components/tests/PhotoPreviewGrid.tsx`

**Purpose:** Renders a grid of photo preview cards

**Props:**

```typescript
interface PhotoPreviewGridProps {
  photoPreviews: PhotoPreview[]; // Array of photos with metadata
  onRemove: (index: number) => void; // Delete handler
  onRotate?: (index: number) => void; // Rotate handler
  disabled: boolean; // Loading state
}
```

**Responsibilities:**

1. Maps over `photoPreviews` array
2. Renders a `PhotoPreviewCard` for each photo
3. Passes index-based callbacks to child components
4. Manages responsive grid layout (2 cols mobile, 3 cols desktop)

**Key Feature:**

```typescript
showRotateButton={!!onRotate}
```

- Only shows rotate button if `onRotate` handler provided
- Makes feature opt-in (can be used without rotation)

---

### 🎣 **4. State Management Hook: `usePhotoPreview.ts`**

**Location:** `src/hooks/usePhotoPreview.ts`

**Purpose:** Manages photo preview URLs and rotation state

**Return Value:**

```typescript
{
  photoPreviews: PhotoPreview[],  // Array of {file, url, rotation}
  rotatePhoto: (index: number) => void,
  getRotation: (file: File) => number,
  clearRotations: () => void
}
```

**State Management:**

```typescript
const [rotations, setRotations] = useState<Map<string, number>>(new Map());
```

- Uses `Map` to track rotation per photo
- Key: `${file.name}-${file.lastModified}` (unique identifier)
- Value: rotation angle (0, 90, 180, 270)

**Why Map Instead of Array?**

- Photos can be added/removed dynamically
- Map ensures rotation persists for the correct file
- Handles edge cases (duplicate filenames, reordering)

**`rotatePhoto()` Function:**

```typescript
const rotatePhoto = (index: number) => {
  const photo = selectedPhotos[index];
  const key = `${photo.name}-${photo.lastModified}`;
  setRotations((prev) => {
    const newRotations = new Map(prev);
    const currentRotation = newRotations.get(key) ?? 0;
    const newRotation = (currentRotation + 90) % 360; // Cycle: 0→90→180→270→0
    newRotations.set(key, newRotation);
    return newRotations;
  });
};
```

**Memory Management:**

```typescript
useEffect(() => {
  return () => {
    photoPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
  };
}, [photoPreviews]);
```

- Cleans up blob URLs when component unmounts
- Prevents memory leaks

---

### 📤 **5. Upload Hook: `usePhotoUpload.ts`**

**Location:** `src/hooks/usePhotoUpload.ts`

**Purpose:** Manages file selection and validation

**New Function Added: `replacePhoto()`**

```typescript
const replacePhoto = (index: number, newFile: File) => {
  setSelectedPhotos((prev) => {
    const updated = [...prev];
    updated[index] = newFile;
    return updated;
  });
};
```

**Why Replace?**

- When user rotates, we need to replace the original File
- Canvas-rotated image becomes a new File object
- This ensures the rotated version gets uploaded

**Full Flow:**

```
User clicks rotate → CSS preview rotates → Canvas creates new File
→ replacePhoto() swaps old File → New File ready for upload
```

---

### 📄 **6. Page Component: `CreateTest.tsx`**

**Location:** `src/pages/CreateTest.tsx`

**Purpose:** Main page that ties everything together

**Hook Usage:**

```typescript
// File management
const {
  selectedPhotos, // Current File[] array
  replacePhoto, // Function to swap a file
  handleRemovePhoto, // Delete a photo
  clearPhotos, // Clear all
} = usePhotoUpload();

// Preview & rotation
const {
  photoPreviews, // Preview data with rotation
  rotatePhoto, // Update rotation state
  getRotation, // Get current rotation
  clearRotations, // Reset rotations
} = usePhotoPreview(selectedPhotos);
```

**The `handleRotatePhoto` Function:**

```typescript
const handleRotatePhoto = async (index: number) => {
  // Step 1: Update visual rotation state (instant CSS feedback)
  rotatePhoto(index);

  // Step 2: Get the file and its rotation angle
  const file = selectedPhotos[index];
  const rotation = (getRotation(file) + 90) % 360;

  // Step 3: If rotated (not 0°), create actual rotated file
  if (rotation !== 0) {
    try {
      const rotatedFile = await rotateImageFile(file, rotation);
      replacePhoto(index, rotatedFile);
    } catch (error) {
      console.error("Failed to rotate image:", error);
    }
  }
};
```

**Why Two Steps?**

1. **Immediate UI feedback** - CSS rotation happens instantly (no lag)
2. **Background processing** - Canvas rotation takes time (async)
3. **Better UX** - User sees rotation immediately, file updates in background

**Form Submission:**

```typescript
const onSubmit = (e: FormEvent) => {
  handleSubmit(e, selectedPhotos); // selectedPhotos now contains rotated files
};
```

---

### 🔄 **7. Test Update: `useTestUpdate.ts`**

**Location:** `src/hooks/useTestUpdate.ts`

**Purpose:** Same rotation logic for editing existing tests

**Similar Structure:**

```typescript
const {
  photoPreviews: newPhotoPreviews,
  rotatePhoto,
  getRotation,
  clearRotations,
} = usePhotoPreview(newPhotos);

const handleRotateNewPhoto = async (index: number) => {
  rotatePhoto(index);
  const file = newPhotos[index];
  const rotation = (getRotation(file) + 90) % 360;

  if (rotation !== 0) {
    const rotatedFile = await rotateImageFile(file, rotation);
    setNewPhotos((prev) => {
      const updated = [...prev];
      updated[index] = rotatedFile;
      return updated;
    });
  }
};
```

**Used In:**

- `TestDetails.tsx` - Editing existing tests
- `UpdateTestModal.tsx` - Modal for photo management

---

## Data Flow

### Complete Rotation Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USER CLICKS ROTATE BUTTON                                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. PhotoPreviewCard.tsx                                          │
│    onClick={onRotate}  →  calls parent's onRotate handler       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. PhotoPreviewGrid.tsx                                          │
│    onRotate={() => onRotate(index)}  →  passes index to parent  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. CreateTest.tsx - handleRotatePhoto(index)                    │
│    A) rotatePhoto(index)  →  Updates CSS rotation state         │
│    B) Gets current rotation angle                                │
│    C) Calls rotateImageFile() for actual file rotation          │
│    D) Replaces file in selectedPhotos array                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. usePhotoPreview - rotatePhoto(index)                         │
│    - Finds file by index                                         │
│    - Creates unique key: filename-timestamp                      │
│    - Updates Map: rotation = (current + 90) % 360               │
│    - Re-renders with new rotation                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. PhotoPreviewCard.tsx - Re-renders                            │
│    <img style={{ transform: `rotate(${rotation}deg)` }} />      │
│    → USER SEES ROTATED IMAGE IMMEDIATELY                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. image-rotation.ts - rotateImageFile()                        │
│    - Loads image into memory                                     │
│    - Creates canvas with rotated dimensions                      │
│    - Applies rotation transformation                             │
│    - Draws image on canvas                                       │
│    - Converts to Blob → File                                     │
│    - Returns new rotated File                                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 8. CreateTest.tsx - replacePhoto(index, rotatedFile)           │
│    - Updates selectedPhotos[index] with new rotated File        │
│    - File is now permanently rotated                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 9. USER SUBMITS FORM                                             │
│    handleSubmit(e, selectedPhotos)                              │
│    → Rotated files are uploaded to backend                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Code Examples

### Example 1: Basic Rotation Button

```typescript
// PhotoPreviewCard.tsx
{showRotateButton && onRotate && (
  <button
    type="button"
    className="absolute top-2 right-2"
    onClick={onRotate}
  >
    <RotateCw className="h-4 w-4" />
  </button>
)}
```

### Example 2: Tracking Rotation State

```typescript
// usePhotoPreview.ts
const [rotations, setRotations] = useState<Map<string, number>>(new Map());

const photoPreviews = useMemo(() => {
  return selectedPhotos.map((file) => {
    const key = `${file.name}-${file.lastModified}`;
    return {
      file,
      url: URL.createObjectURL(file),
      rotation: rotations.get(key) ?? 0, // Default to 0°
    };
  });
}, [selectedPhotos, rotations]);
```

### Example 3: Canvas Rotation

```typescript
// image-rotation.ts
if (rotation === 90) {
  ctx.translate(canvas.width, 0); // Move to top-right
  ctx.rotate((90 * Math.PI) / 180); // Rotate 90°
}
ctx.drawImage(img, 0, 0); // Draw rotated
```

---

## Key Takeaways for Presentation

### ✅ **Technical Highlights**

1. **Dual-Phase Approach**: CSS for instant feedback + Canvas for actual rotation
2. **State Management**: Map-based tracking ensures rotation persists correctly
3. **Memory Safety**: Automatic cleanup of blob URLs
4. **Type Safety**: Full TypeScript with proper interfaces

### ✅ **User Experience**

1. **Instant Feedback**: CSS rotation happens immediately (no loading)
2. **Intuitive UI**: Rotate button positioned at top-right (familiar pattern)
3. **Visual Polish**: Smooth animations, hover effects, accessibility

### ✅ **Architecture Benefits**

1. **Reusable Components**: Same code works for create and edit flows
2. **Separation of Concerns**: UI, state, and business logic clearly separated
3. **Opt-in Feature**: Rotation is optional (backward compatible)

### ✅ **Edge Cases Handled**

1. Multiple clicks → Cycles through 0°, 90°, 180°, 270°
2. Rotation persists if user adds/removes other photos
3. Error handling for canvas failures
4. Memory cleanup prevents leaks

---

## Questions to Anticipate

**Q: Why not just use CSS transform?**
A: CSS only affects display. We need the actual image data rotated so it uploads correctly to the backend.

**Q: Why track rotation in a Map instead of in the File object?**
A: File objects are immutable. We need separate state to track UI rotation before committing to canvas rotation.

**Q: Does this affect performance?**
A: Canvas operations are async and happen in background. UI stays responsive with CSS preview.

**Q: What about browser support?**
A: Canvas API has 97%+ browser support. Works on all modern browsers and mobile devices.

---

## Demo Script

1. **Show before/after photos** (landscape vs portrait)
2. **Upload a photo** → Show preview appears
3. **Click rotate button** → Instant visual rotation
4. **Click 3 more times** → Show full 360° rotation
5. **Submit form** → Show uploaded image is actually rotated
6. **Edit existing test** → Show same feature works in edit modal

---

**End of Walkthrough**
