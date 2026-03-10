# Photo Rotation Feature

## Overview

Added functionality to rotate photos during upload/preview with a button at the top-right of each photo.

## Implementation

### Components Updated

1. **PhotoPreviewCard** - Added rotate button with icon
   - Button appears at top-right of photo
   - Applies CSS rotation transform for preview
   - Uses lucide-react's RotateCw icon

2. **PhotoPreviewGrid** - Supports rotation callbacks
   - Passes rotation state to individual cards
   - Handles rotation clicks

3. **NewPhotosGrid** - Similar updates for test editing

4. **ExistingPhotosGrid** - Currently only for new photos (existing photos already uploaded)

### Hooks Updated

1. **usePhotoPreview** - Manages rotation state
   - Tracks rotation per photo (0, 90, 180, 270 degrees)
   - Returns `rotatePhoto`, `getRotation`, `clearRotations` functions
   - Applies CSS transform for visual preview

2. **usePhotoUpload** - Added photo replacement
   - New `replacePhoto` function to update File objects

3. **useTestUpdate** - Integrated rotation for test editing
   - Similar to CreateTest functionality

### Pages Updated

1. **CreateTest** - Full rotation support
   - Rotate button on each photo preview
   - Rotates actual File using canvas before upload

2. **TestDetails** - Passes rotation handlers to UpdateTestModal

### Utilities Created

1. **image-rotation.ts** - Image manipulation utilities
   - `rotateImageFile()` - Rotates File object using canvas
   - `getRotationTransform()` - CSS transform helper

## How It Works

1. User uploads photo(s)
2. Rotate button appears at top-right of each preview
3. Clicking rotates 90° clockwise (visual preview via CSS)
4. Actual File is rotated using canvas and replaced
5. On submit, rotated files are uploaded

## Benefits

- Fixes orientation issues from mobile uploads
- User-friendly interface
- Works for both new tests and editing existing tests
- Rotation persists on upload (not just visual)
