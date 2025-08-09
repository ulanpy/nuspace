# Media Upload System 📸

A comprehensive, reusable media upload and management system built for scalability and ease of use across multiple features.

## 🎯 Overview

This media system provides a complete solution for file uploads, gallery displays, progress tracking, and media previews. It's designed to be used across different features while maintaining consistent UX and functionality.

## 📦 Components

### 1. MediaUploadZone (Recommended)
**The all-in-one solution** - Combines dropzone, gallery, progress, and preview in a single component.

```tsx
import { MediaUploadZone } from '@/components/organisms/media';

function ProductMediaUpload() {
  const {
    previewMedia,
    isDragging,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileSelect,
    removeNewMedia,
  } = useMediaSelection();

  return (
    <MediaUploadZone
      items={previewMedia}
      onItemsChange={setPreviewMedia}
      onRemove={removeNewMedia}
      isDragging={isDragging}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onFileSelect={handleFileSelect}
      label="Product Images"
      showMainIndicator={true}
      enablePreview={true}
    />
  );
}
```

### 2. Individual Components

#### MediaDropZone
Drag & drop file upload interface with animations.

```tsx
import { MediaDropZone } from '@/components/organisms/media';

<MediaDropZone
  isDragging={isDragging}
  onDragOver={handleDragOver}
  onDragLeave={handleDragLeave}
  onDrop={handleDrop}
  onFileSelect={handleFileSelect}
  accept="image/*"
  multiple={true}
  title="Upload Event Images"
  variant="compact"
  allowedTypes={['PNG', 'JPG', 'GIF']}
/>
```

#### MediaGallery
Display uploaded media with management actions.

```tsx
import { MediaGallery } from '@/components/organisms/media';

<MediaGallery
  items={mediaItems}
  onRemove={handleRemove}
  onSetMain={handleSetMain}
  onPreview={handlePreview}
  showMainIndicator={true}
  columns={4}
  aspectRatio="square"
  customActions={[
    {
      id: 'edit',
      label: 'Edit',
      icon: Edit,
      onClick: (index, item) => openEditor(item),
      showInDropdown: true
    }
  ]}
/>
```

#### MediaUploadProgress
Upload progress indicator with multiple variants.

```tsx
import { MediaUploadProgress } from '@/components/organisms/media';

<MediaUploadProgress
  isUploading={isUploading}
  progress={uploadProgress}
  status="uploading"
  variant="standalone"
  onCancel={handleCancel}
  onRetry={handleRetry}
/>
```

#### MediaPreview
Full-screen media preview with zoom and navigation.

```tsx
import { MediaPreview } from '@/components/organisms/media';

<MediaPreview
  items={mediaItems}
  currentIndex={selectedIndex}
  isOpen={isPreviewOpen}
  onClose={() => setIsPreviewOpen(false)}
  onNavigate={setSelectedIndex}
  showZoom={true}
  showDownload={true}
  onDownload={handleDownload}
/>
```

## 🎨 Customization Options

### Variants
- **DropZone**: `default`, `compact`, `minimal`
- **Gallery**: `default`, `compact`, `detailed`
- **Progress**: `inline`, `overlay`, `standalone`, `minimal`

### Layout Options
- **Grid Columns**: `auto`, `2`, `3`, `4`, `5`, `6`
- **Aspect Ratio**: `square`, `video`, `auto`
- **Spacing**: `tight`, `normal`, `loose`

### Media Types
- **Images**: PNG, JPG, GIF, WebP
- **Videos**: MP4, WebM, MOV
- **Documents**: PDF (with custom preview)

## 🔧 Integration Examples

### Campus Current Events
```tsx
import { MediaUploadZone } from '@/components/organisms/media';

export function EventMediaUpload() {
  const { isEditMode } = useEventForm();
  const { isUploading } = useMediaUploadContext();
  const { handleMediaDelete } = useMediaEdit();
  const mediaSelection = useMediaSelection();

  return (
    <MediaUploadZone
      {...mediaSelection}
      label="Event Images"
      isUploading={isUploading}
      onRemove={isEditMode ? handleMediaDelete : mediaSelection.removeNewMedia}
      showMainIndicator={false}
      dropZoneProps={{
        maxSizeText: "PNG or JPG up to 10MB",
        variant: "default"
      }}
      galleryProps={{
        columns: 3,
        animateEntrance: true
      }}
    />
  );
}
```

### Kupi-prodai Products
```tsx
import { MediaUploadZone } from '@/components/organisms/media';

export function ProductMediaUpload() {
  const mediaSelection = useMediaSelection();
  const { isUploading, uploadProgress } = useMediaUploadContext();

  return (
    <MediaUploadZone
      {...mediaSelection}
      label="Product Images"
      isUploading={isUploading}
      uploadProgress={uploadProgress}
      showMainIndicator={true}
      enablePreview={true}
      onSetMain={handleSetMainImage}
      dropZoneProps={{
        title: "Upload product images",
        variant: "default",
        allowedTypes: ['PNG', 'JPG', 'WebP']
      }}
      galleryProps={{
        columns: 4,
        showActions: true
      }}
      customActions={[
        {
          id: 'optimize',
          label: 'Optimize',
          icon: Zap,
          onClick: (index, item) => optimizeImage(item),
          showInDropdown: true
        }
      ]}
    />
  );
}
```

### Profile Picture Upload
```tsx
import { MediaUploadZone } from '@/components/organisms/media';

export function ProfilePictureUpload() {
  const [avatar, setAvatar] = useState<string>('');
  
  return (
    <MediaUploadZone
      items={avatar ? [avatar] : []}
      onItemsChange={(items) => setAvatar(items[0] as string)}
      onRemove={() => setAvatar('')}
      {...dragHandlers}
      label="Profile Picture"
      layout="horizontal"
      dropZoneProps={{
        variant: "compact",
        multiple: false,
        accept: "image/*"
      }}
      galleryProps={{
        columns: 1,
        aspectRatio: "square",
        showMainIndicator: false
      }}
    />
  );
}
```

## 🔌 Hooks Integration

The media system works seamlessly with existing hooks:

- `useMediaSelection` - File selection and drag & drop
- `useMediaUpload` - Upload functionality
- `useMediaEdit` - Edit mode handling
- `useMediaUploadContext` - Global upload state

## 🎯 Migration Guide

### From Feature-Specific Components

#### Before (Campus Current)
```tsx
// Multiple imports and manual composition
import { MediaDropZone } from '@/features/kupi-prodai/components/media/MediaDropZone';
import { MediaGallery } from '@/features/kupi-prodai/components/media/MediaGallery';

return (
  <div className="space-y-4">
    <Label>Event Images</Label>
    <MediaDropZone {...dropZoneProps} />
    {items.length > 0 && <MediaGallery {...galleryProps} />}
  </div>
);
```

#### After (Shared System)
```tsx
// Single import, everything included
import { MediaUploadZone } from '@/components/organisms/media';

return (
  <MediaUploadZone
    label="Event Images"
    {...allProps}
  />
);
```

## 🚀 Performance Features

- **Lazy Loading**: Images load only when visible
- **Animation Controls**: Can disable animations for performance
- **Memory Management**: Automatic cleanup of file URLs
- **Responsive**: Optimized for mobile and desktop
- **Accessible**: Full keyboard navigation and screen reader support

## 🛠️ Customization Examples

### Custom Actions
```tsx
const customActions: MediaAction[] = [
  {
    id: 'crop',
    label: 'Crop Image',
    icon: Crop,
    onClick: (index, item) => openCropEditor(item),
    showInHover: true,
    showInDropdown: true
  },
  {
    id: 'filters',
    label: 'Apply Filters',
    icon: Filter,
    onClick: (index, item) => openFilters(item),
    showInDropdown: true
  }
];
```

### Custom Styling
```tsx
<MediaUploadZone
  className="custom-upload-zone"
  dropZoneProps={{
    className: "border-dashed border-blue-300 bg-blue-50",
    variant: "compact"
  }}
  galleryProps={{
    className: "grid-cols-2 md:grid-cols-4",
    itemClassName: "rounded-xl shadow-lg"
  }}
/>
```

## 📱 Responsive Design

The components are fully responsive:
- **Mobile**: Touch-optimized, simplified controls
- **Tablet**: Balanced layout with medium grid
- **Desktop**: Full feature set with hover states

## ♿ Accessibility

- **Keyboard Navigation**: Full keyboard support
- **Screen Readers**: ARIA labels and descriptions
- **Focus Management**: Proper focus indicators
- **Color Contrast**: Meets WCAG guidelines

## 🔍 Troubleshooting

### Common Issues

1. **Images not displaying**: Check CORS headers for external URLs
2. **Upload failing**: Verify file size and type restrictions
3. **Performance issues**: Consider reducing animation or image sizes
4. **Layout problems**: Check container width and CSS conflicts

### Debug Mode
```tsx
<MediaUploadZone
  // ... props
  galleryProps={{
    loading: isDebugMode,
    error: debugError
  }}
/>
```

## 🎨 Theme Integration

The components use CSS custom properties for easy theming:

```css
:root {
  --media-dropzone-border: theme(colors.border);
  --media-gallery-radius: theme(borderRadius.lg);
  --media-progress-color: theme(colors.primary.DEFAULT);
}
```

## 📋 TypeScript Support

Full TypeScript support with comprehensive type definitions:

```tsx
import type { MediaItem, MediaAction, MediaUploadZoneProps } from '@/components/organisms/media';

interface CustomMediaProps extends MediaUploadZoneProps {
  onCustomAction: (item: MediaItem) => void;
}
```

---

## 🎉 Ready to Use!

The media system is now ready for use across your application. Start with `MediaUploadZone` for most use cases, or use individual components for specialized needs.