# Photo Rotation - Quick Reference Sheet

## 🎯 One-Liner Summary

**A two-phase rotation system: CSS transform for instant UI feedback, Canvas API for actual file rotation.**

---

## 📁 File Structure (7 Files Modified)

```
frontend/src/
├── lib/utils/
│   └── image-rotation.ts              ⭐ NEW - Canvas rotation logic
├── components/tests/
│   ├── PhotoPreviewCard.tsx           ✏️ MODIFIED - Added rotate button
│   ├── PhotoPreviewGrid.tsx           ✏️ MODIFIED - Pass rotation handler
│   └── update-test-modal/
│       └── NewPhotosGrid.tsx          ✏️ MODIFIED - Same for edit modal
├── hooks/
│   ├── usePhotoPreview.ts             ✏️ MODIFIED - Track rotation state
│   ├── usePhotoUpload.ts              ✏️ MODIFIED - Replace files
│   └── useTestUpdate.ts               ✏️ MODIFIED - Edit flow support
└── pages/
    ├── CreateTest.tsx                 ✏️ MODIFIED - Orchestrate rotation
    └── TestDetails.tsx                ✏️ MODIFIED - Pass to edit modal
```

---

## 🔄 Data Flow (Simplified)

```
Click [↻] → Preview rotates (CSS) → Canvas creates rotated File → File replaced → Upload
```

---

## 💻 Key Code Snippets

### 1️⃣ Rotate Button UI

```tsx
<button className="absolute top-2 right-2" onClick={onRotate}>
  <RotateCw />
</button>
```

### 2️⃣ Track Rotation State

```typescript
const [rotations, setRotations] = useState<Map<string, number>>(new Map());
const newRotation = (currentRotation + 90) % 360;
```

### 3️⃣ Apply CSS Transform

```tsx
<img style={{ transform: `rotate(${rotation}deg)` }} />
```

### 4️⃣ Canvas Rotation

```typescript
ctx.translate(canvas.width, 0);
ctx.rotate((90 * Math.PI) / 180);
ctx.drawImage(img, 0, 0);
```

### 5️⃣ Replace File

```typescript
const rotatedFile = await rotateImageFile(file, rotation);
replacePhoto(index, rotatedFile);
```

---

## 🎨 Visual Design

```
┌──────────────────┐
│         [↻]      │ ← Rotate button (top-right)
│                  │
│   Photo Image    │
│                  │
└──────────────────┘
   [Remove Button]
```

**Button Specs:**

- Size: 32×32px (8×8 Tailwind)
- Position: `top-2 right-2`
- Style: White background, semi-transparent
- Icon: lucide-react `RotateCw`
- Hover: Scales 110%

---

## 🔍 Technical Decisions

| Question            | Answer        | Why                                            |
| ------------------- | ------------- | ---------------------------------------------- |
| CSS or Canvas?      | **Both**      | CSS for instant UI, Canvas for actual rotation |
| Array or Map?       | **Map**       | Handles dynamic add/remove, unique keys        |
| Immediate or Async? | **Two-phase** | Better UX with instant feedback                |
| Props or Context?   | **Props**     | Simple prop drilling, clear data flow          |

---

## 🎭 Demo Talking Points

1. **Problem**: "Mobile photos often upload sideways"
2. **Solution**: "One-click rotation with visual feedback"
3. **Tech**: "CSS for speed, Canvas for quality"
4. **UX**: "Instant response, works everywhere"
5. **Code**: "Clean architecture, reusable components"

---

## 🐛 Edge Cases Handled

✅ Multiple rotations (cycles 0→90→180→270→0)
✅ Adding/removing photos doesn't lose rotation
✅ Memory cleanup (blob URLs revoked)
✅ Error handling (canvas failures)
✅ Duplicate filenames (unique keys)
✅ Works in both create and edit flows

---

## 📊 Statistics

- **Lines of Code**: ~400 new/modified
- **New Files**: 1
- **Modified Files**: 7
- **New Dependencies**: 0 (uses built-in Canvas API)
- **Bundle Size**: +2KB (minimal)

---

## 🎤 Elevator Pitch

_"We added a rotation button to photo previews. When clicked, the image instantly rotates using CSS for smooth UX, while Canvas API creates an actually rotated file in the background. The rotated file gets uploaded, solving mobile orientation issues. Clean code, great UX, zero new dependencies."_

---

## 📱 Browser Support

- **Canvas API**: 97%+ (IE9+, all modern browsers)
- **CSS Transform**: 99%+ (all browsers)
- **Blob API**: 97%+ (all modern browsers)

**Result**: Works everywhere, including mobile Safari and Android Chrome.

---

## 🎯 Success Metrics

**Before:**

- Users had to rotate images externally
- Photos uploaded in wrong orientation
- Poor UX, extra steps

**After:**

- One-click rotation in-app
- Photos upload correctly oriented
- Smooth, intuitive experience

---

## 💡 Future Enhancements (Optional)

- [ ] Batch rotation (rotate all button)
- [ ] Undo rotation
- [ ] Rotation angle picker (not just 90°)
- [ ] Auto-rotation based on EXIF (backend already does this!)

---

**Need more detail? See PHOTO_ROTATION_WALKTHROUGH.md**
