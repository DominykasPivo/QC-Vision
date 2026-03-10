# Photo Rotation - Annotated Code Examples

## 📖 Purpose

Line-by-line code explanations for presentation reference.

---

## 1. Image Rotation Utility (`image-rotation.ts`)

### Function Signature

```typescript
export async function rotateImageFile(
  file: File, // Input: Original photo file
  degrees: number, // Input: Rotation angle (90, 180, 270)
): Promise<File>; // Output: New rotated file
```

### Full Implementation with Annotations

```typescript
export async function rotateImageFile(
  file: File,
  degrees: number,
): Promise<File> {
  return new Promise((resolve, reject) => {
    // 1. Create image element to load the file into memory
    const img = new Image();

    // 2. Create canvas element for drawing
    const canvas = document.createElement("canvas");

    // 3. Get 2D rendering context (the "paintbrush")
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Could not get canvas context"));
      return;
    }

    // 4. When image loads successfully...
    img.onload = () => {
      // Normalize rotation: -90 becomes 270, 450 becomes 90, etc.
      const rotation = ((degrees % 360) + 360) % 360;

      // 5. Set canvas dimensions
      // For 90° and 270°, swap width and height
      // Example: 800x600 image → 600x800 canvas
      if (rotation === 90 || rotation === 270) {
        canvas.width = img.height; // Swap!
        canvas.height = img.width;
      } else {
        canvas.width = img.width; // Keep same
        canvas.height = img.height;
      }

      // 6. Apply rotation transformation
      ctx.save(); // Save current state

      if (rotation === 90) {
        // Move origin to top-right corner
        ctx.translate(canvas.width, 0);
        // Rotate 90° clockwise around new origin
        ctx.rotate((90 * Math.PI) / 180);
      } else if (rotation === 180) {
        // Move origin to bottom-right corner
        ctx.translate(canvas.width, canvas.height);
        // Rotate 180°
        ctx.rotate((180 * Math.PI) / 180);
      } else if (rotation === 270) {
        // Move origin to bottom-left corner
        ctx.translate(0, canvas.height);
        // Rotate 270° (or -90°)
        ctx.rotate((270 * Math.PI) / 180);
      }

      // 7. Draw the rotated image
      ctx.drawImage(img, 0, 0);

      ctx.restore(); // Restore original state

      // 8. Convert canvas to Blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to create blob from canvas"));
            return;
          }

          // 9. Create new File from Blob
          const rotatedFile = new File(
            [blob], // Blob data
            file.name, // Keep original filename
            {
              type: file.type, // Keep original type (image/jpeg, etc.)
              lastModified: Date.now(), // Update timestamp
            },
          );

          // 10. Return the new rotated file
          resolve(rotatedFile);
        },
        file.type, // Output format (matches input)
        0.95, // Quality (95%)
      );
    };

    // 11. Handle image load errors
    img.onerror = () => {
      reject(new Error("Failed to load image"));
    };

    // 12. Start loading the image
    img.src = URL.createObjectURL(file);
  });
}
```

### Visual Explanation of Rotation

```
Original Image (800x600):
┌─────────────┐
│   TOP       │
│             │
│   BOTTOM    │
└─────────────┘

After 90° Rotation (600x800):
┌──────┐
│BOTTOM│
│      │
│  TOP │
└──────┘

Canvas coordinates:
- 0°: (0,0) at top-left
- 90°: translate to top-right, then rotate
- 180°: translate to bottom-right, then rotate
- 270°: translate to bottom-left, then rotate
```

---

## 2. Preview Hook (`usePhotoPreview.ts`)

### State Structure

```typescript
// Map: "filename-timestamp" → rotation angle
// Example: { "photo1.jpg-1678435200000" → 90 }
const [rotations, setRotations] = useState<Map<string, number>>(new Map());
```

### Building Preview Array

```typescript
const photoPreviews = useMemo(() => {
  return selectedPhotos.map((file) => {
    // Create unique key from filename and timestamp
    const key = `${file.name}-${file.lastModified}`;

    return {
      file, // Original File object
      url: URL.createObjectURL(file), // Blob URL for preview
      rotation: rotations.get(key) ?? 0, // Rotation angle (default 0)
    };
  });
}, [selectedPhotos, rotations]); // Recompute when either changes
```

### Rotate Function

```typescript
const rotatePhoto = (index: number) => {
  // Get the file at this index
  const photo = selectedPhotos[index];
  if (!photo) return;

  // Create unique key
  const key = `${photo.name}-${photo.lastModified}`;

  // Update rotations map
  setRotations((prev) => {
    const newRotations = new Map(prev); // Clone existing Map
    const currentRotation = newRotations.get(key) ?? 0; // Get current or 0
    const newRotation = (currentRotation + 90) % 360; // Add 90°, wrap at 360
    newRotations.set(key, newRotation); // Update Map
    return newRotations; // Trigger re-render
  });
};
```

**Why this works:**

1. Map persists rotation even if photos are reordered
2. Modulo 360 cycles: 0→90→180→270→0
3. Unique key prevents rotation from affecting wrong photo

---

## 3. CreateTest Integration (`CreateTest.tsx`)

### Hook Setup

```typescript
// File management
const {
  selectedPhotos, // File[] - Current uploaded files
  replacePhoto, // (index, newFile) => void - Swap a file
  clearPhotos, // () => void - Clear all files
} = usePhotoUpload();

// Preview generation with rotation tracking
const {
  photoPreviews, // PhotoPreview[] - {file, url, rotation}
  rotatePhoto, // (index) => void - Increment rotation
  getRotation, // (file) => number - Get current rotation
  clearRotations, // () => void - Reset all rotations
} = usePhotoPreview(selectedPhotos);
```

### The Rotation Handler

```typescript
const handleRotatePhoto = async (index: number) => {
  // PHASE 1: Instant visual feedback
  // Update rotation state → triggers re-render → CSS applies rotation
  rotatePhoto(index);

  // PHASE 2: Background file manipulation
  const file = selectedPhotos[index];
  const rotation = (getRotation(file) + 90) % 360;

  // Only create rotated file if not at 0° (optimization)
  if (rotation !== 0) {
    try {
      // Call Canvas API to create actual rotated file
      const rotatedFile = await rotateImageFile(file, rotation);

      // Replace the File object in our array
      replacePhoto(index, rotatedFile);

      // Now selectedPhotos[index] contains the rotated file
      // When form submits, this rotated file gets uploaded
    } catch (error) {
      console.error("Failed to rotate image:", error);
      // Visual rotation already happened, so UX isn't broken
      // Just log error for debugging
    }
  }
};
```

**Timeline:**

```
0ms:   User clicks rotate button
1ms:   CSS applies transform (instant visual feedback)
10ms:  Canvas starts working in background
150ms: Canvas finishes, file replaced
∞:     User can click again immediately (no blocking)
```

---

## 4. Preview Card Component (`PhotoPreviewCard.tsx`)

### Component Structure

```typescript
export function PhotoPreviewCard({
  imageUrl,          // Blob URL for preview
  rotation = 0,      // Current rotation angle
  onRotate,          // Callback function
  showRotateButton = false,  // Whether to show button
  // ... other props
}: PhotoPreviewCardProps) {
  return (
    <div className={cardClassName}>
      {/* Image container with relative positioning */}
      <div className={`${imageWrapClassName} relative`}>
        {imageUrl ? (
          <>
            {/* The actual image with CSS transform */}
            <img
              src={imageUrl}
              alt={alt}
              className="h-full w-full object-cover transition-transform duration-200"
              style={{
                // Apply CSS rotation if angle is not 0
                transform: rotation ? `rotate(${rotation}deg)` : undefined,
              }}
            />

            {/* Rotate button (conditionally rendered) */}
            {showRotateButton && onRotate && (
              <button
                type="button"
                // Positioned absolutely in top-right corner
                className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center
                           rounded-lg bg-white/90 text-slate-700 shadow-md backdrop-blur-sm
                           transition-all hover:bg-white hover:scale-110
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                onClick={onRotate}  // Call parent's handler
                aria-label="Rotate photo 90 degrees"
                title="Rotate"
              >
                <RotateCw className="h-4 w-4" />
              </button>
            )}
          </>
        ) : (
          <div>Loading...</div>
        )}
      </div>

      {/* Footer with Remove button */}
      <div className={footerClassName}>
        <button onClick={onRemove}>Remove</button>
      </div>
    </div>
  );
}
```

### CSS Classes Explained

- `relative` on container → allows absolute positioning of button
- `absolute top-2 right-2` → positions button 8px from top-right
- `bg-white/90` → 90% opaque white background
- `backdrop-blur-sm` → blurs content behind button
- `hover:scale-110` → grows 110% on hover
- `transition-all` → smooth animations
- `focus-visible:ring-2` → accessibility (keyboard navigation)

---

## 5. Grid Component (`PhotoPreviewGrid.tsx`)

### Mapping Over Photos

```typescript
export function PhotoPreviewGrid({
  photoPreviews,  // Array of {file, url, rotation}
  onRemove,       // (index) => void
  onRotate,       // (index) => void | undefined
  disabled,       // boolean
}: PhotoPreviewGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {photoPreviews.map((preview, index) => (
        <PhotoPreviewCard
          key={`${preview.file.name}-${preview.file.lastModified}-${index}`}
          imageUrl={preview.url}
          rotation={preview.rotation}  // Pass rotation from preview

          // Wrap callbacks to include index
          onRemove={() => onRemove(index)}
          onRotate={onRotate ? () => onRotate(index) : undefined}

          // Only show button if handler exists
          showRotateButton={!!onRotate}
        />
      ))}
    </div>
  );
}
```

**Key Point:**

- `onRotate` is optional (`onRotate?`)
- Button only shows if `onRotate` is provided
- Makes feature backward-compatible

---

## 6. Upload Hook (`usePhotoUpload.ts`)

### Replace Photo Function

```typescript
const replacePhoto = (index: number, newFile: File) => {
  setSelectedPhotos((prev) => {
    const updated = [...prev]; // Clone array
    updated[index] = newFile; // Replace at index
    return updated; // New array triggers re-render
  });
};
```

**Why Immutable?**

```typescript
// ❌ DON'T DO THIS (mutates state):
selectedPhotos[index] = newFile;

// ✅ DO THIS (creates new array):
const updated = [...prev];
updated[index] = newFile;
return updated;
```

React won't detect the change if you mutate the array directly.

---

## 7. Complete Flow Example

### Scenario: User rotates photo twice (0° → 90° → 180°)

```typescript
// INITIAL STATE
selectedPhotos = [file1, file2, file3]
rotations = Map { }
photoPreviews = [
  {file: file1, url: 'blob:...', rotation: 0},
  {file: file2, url: 'blob:...', rotation: 0},
  {file: file3, url: 'blob:...', rotation: 0}
]

// USER CLICKS ROTATE ON PHOTO #2 (index 1) - FIRST TIME
handleRotatePhoto(1)
  → rotatePhoto(1)
    → rotations = Map { "file2-1234567890": 90 }
    → photoPreviews[1].rotation = 90
    → CSS applies: transform: rotate(90deg)
  → rotateImageFile(file2, 90)
    → (Canvas works in background)
    → returns rotatedFile2
  → replacePhoto(1, rotatedFile2)
    → selectedPhotos = [file1, rotatedFile2, file3]

// USER CLICKS ROTATE ON PHOTO #2 AGAIN - SECOND TIME
handleRotatePhoto(1)
  → rotatePhoto(1)
    → rotations = Map { "rotatedFile2-9876543210": 180 }
    → photoPreviews[1].rotation = 180
    → CSS applies: transform: rotate(180deg)
  → rotateImageFile(rotatedFile2, 180)
    → returns doubleRotatedFile2
  → replacePhoto(1, doubleRotatedFile2)
    → selectedPhotos = [file1, doubleRotatedFile2, file3]

// USER SUBMITS FORM
onSubmit()
  → handleSubmit(e, selectedPhotos)
    → Upload: [file1, doubleRotatedFile2, file3]
    → Backend receives photo #2 rotated 180°!
```

---

## 8. Memory Management

### Cleanup on Unmount

```typescript
useEffect(() => {
  // Cleanup function runs when component unmounts
  return () => {
    photoPreviews.forEach((preview) => {
      // Revoke blob URLs to free memory
      URL.revokeObjectURL(preview.url);
    });
  };
}, [photoPreviews]); // Re-run if previews change
```

**Why Important?**

- Blob URLs consume memory
- Without cleanup, memory leaks
- Creates new blobs when photos change
- Old blobs should be cleaned up

---

## 9. TypeScript Interfaces

### PhotoPreview Type

```typescript
export interface PhotoPreview {
  file: File; // Original or rotated File object
  url: string; // Blob URL for preview (blob:http://...)
  rotation: number; // CSS rotation angle (0, 90, 180, 270)
}
```

### Props Interfaces

```typescript
interface PhotoPreviewCardProps {
  imageUrl?: string; // Optional because might not load yet
  alt: string; // Required for accessibility
  onRemove: () => void; // Required callback
  rotation?: number; // Optional, defaults to 0
  onRotate?: () => void; // Optional, if not provided = no button
  showRotateButton?: boolean; // Optional, defaults to false
  // ... styling props
}
```

---

## 10. Error Handling

### Try-Catch in Rotation Handler

```typescript
const handleRotatePhoto = async (index: number) => {
  rotatePhoto(index); // This always succeeds (just updates state)

  const file = selectedPhotos[index];
  const rotation = (getRotation(file) + 90) % 360;

  if (rotation !== 0) {
    try {
      const rotatedFile = await rotateImageFile(file, rotation);
      replacePhoto(index, rotatedFile);
    } catch (error) {
      // Log error but don't block UI
      console.error("Failed to rotate image:", error);

      // User already sees CSS rotation, so UX isn't broken
      // They can try again or just submit with CSS rotation
      // (Backend handles EXIF orientation anyway)
    }
  }
};
```

**Graceful Degradation:**

1. CSS rotation always works (instant fallback)
2. Canvas failure doesn't crash app
3. User can continue using other features
4. Backend EXIF fix provides additional safety net

---

**End of Annotated Code Examples**
