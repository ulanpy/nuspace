# Unified Media System Migration Guide 🚀

## Overview

The unified media system consolidates all media upload functionality across the application into a single, consistent, and feature-rich system. This eliminates code duplication and provides a standardized experience.

## 🎯 Benefits

- **Single Source of Truth**: One set of components for all media operations
- **Consistent UX**: Same behavior across all features
- **Reduced Bundle Size**: Eliminates duplicate code
- **Better Maintenance**: Single codebase to maintain
- **Enhanced Features**: Rich functionality available everywhere
- **Type Safety**: Full TypeScript support with proper types

## 📦 Architecture

### Core Components

```
src/features/media/
├── context/UnifiedMediaContext.tsx     # Global state management
├── hooks/useUnifiedMedia.ts            # Main hook with all functionality
├── config/mediaConfigs.ts              # Feature-specific configurations
├── index.ts                            # Main exports
└── UNIFIED_MIGRATION_GUIDE.md          # This file

src/components/organisms/media/
└── UnifiedMediaUploadZone.tsx          # Universal media upload component
```

## 🔄 Migration Steps

### Step 1: Replace Existing Components

#### Before (CampusCurrent):
```tsx
// Old way - multiple imports and manual composition
import { MediaUploadZone } from '@/components/organisms/media';
import { useMediaSelection } from '@/features/media/hooks/useMediaSelection';
import { useMediaEdit } from '@/features/media/hooks/useMediaEdit';

export function EventMediaUpload() {
  const { isEditMode } = useEventForm();
  const { handleMediaDelete } = useMediaEdit();
  const { previewMedia, removeNewMedia, ...dragHandlers } = useMediaSelection();

  return (
    <MediaUploadZone
      items={previewMedia}
      onRemove={isEditMode ? handleMediaDelete : removeNewMedia}
      {...dragHandlers}
      // ... many props
    />
  );
}
```

#### After (Unified):
```tsx
// New way - single import, everything included
import { UnifiedEventMediaUpload } from '@/features/media';

export function EventMediaUpload() {
  return <UnifiedEventMediaUpload />;
}
```

### Step 2: Custom Configuration

For custom configurations, use the configuration system:

```tsx
import { 
  UnifiedMediaProvider, 
  UnifiedMediaUploadZone,
  createCustomMediaConfig 
} from '@/features/media';

function CustomMediaUpload() {
  const config = createCustomMediaConfig('campusCurrentEvents', {
    maxFiles: 5,
    maxFileSize: 2,
    enableReordering: false,
  });

  return (
    <UnifiedMediaProvider config={config}>
      <UnifiedMediaUploadZone
        label="Custom Upload"
        layout="horizontal"
        columns={3}
      />
    </UnifiedMediaProvider>
  );
}
```

### Step 3: Advanced Usage

For complex scenarios with custom logic:

```tsx
import { 
  UnifiedMediaProvider, 
  useUnifiedMedia,
  getMediaConfig 
} from '@/features/media';

function AdvancedMediaComponent() {
  const {
    previewMedia,
    isUploading,
    uploadFiles,
    deleteMarkedMedia,
    removeMedia,
    // ... all other methods
  } = useUnifiedMedia();

  const handleCustomUpload = async () => {
    await deleteMarkedMedia(); // Delete marked items first
    const success = await uploadFiles({
      entityType: EntityType.products,
      entityId: productId,
      mediaFormat: MediaFormat.carousel,
    });
    
    if (success) {
      // Handle success
    }
  };

  return (
    <div>
      <UnifiedMediaUploadZone 
        customActions={[
          {
            id: 'custom',
            label: 'Custom Action',
            icon: CustomIcon,
            onClick: (index, item) => {
              // Custom logic
            }
          }
        ]}
      />
      <Button onClick={handleCustomUpload}>
        Custom Upload Process
      </Button>
    </div>
  );
}

export function MyFeature() {
  const config = getMediaConfig('kupiProdaiProducts');
  
  return (
    <UnifiedMediaProvider config={config}>
      <AdvancedMediaComponent />
    </UnifiedMediaProvider>
  );
}
```

## 🎨 Configuration Options

### Available Configurations

```tsx
import { MEDIA_CONFIGS } from '@/features/media';

// Pre-built configurations
MEDIA_CONFIGS.campusCurrentEvents    // Events: 10 files, 10MB each
MEDIA_CONFIGS.kupiProdaiProducts     // Products: 8 files, 5MB each  
MEDIA_CONFIGS.communityProfiles      // Profiles: 1 file, 2MB
MEDIA_CONFIGS.communityPosts         // Posts: 5 files, 8MB each
MEDIA_CONFIGS.reviews                // Reviews: 3 files, 3MB each
MEDIA_CONFIGS.profileAvatars         // Avatars: 1 file, 1MB
```

### Configuration Properties

```tsx
interface MediaConfig {
  entityType: EntityType;           // Database entity type
  mediaFormat: MediaFormat;         // Upload format
  maxFiles?: number;               // Maximum files allowed
  maxFileSize?: number;            // Maximum file size in MB
  allowedTypes?: string[];         // Allowed MIME types
  enableMainSelection?: boolean;    // Enable main image selection
  enablePreview?: boolean;         // Enable preview modal
  enableReordering?: boolean;      // Enable drag & drop reordering
}
```

## 🎛️ Component Props

### UnifiedMediaUploadZone Props

```tsx
interface UnifiedMediaUploadZoneProps {
  // Core props
  label?: string;                  // Section label
  title?: string;                  // Drop zone title
  description?: string;            // Drop zone description
  
  // Layout options
  layout?: 'vertical' | 'horizontal' | 'grid';
  spacing?: 'tight' | 'normal' | 'loose';
  
  // Gallery options
  columns?: 'auto' | 2 | 3 | 4 | 5 | 6;
  aspectRatio?: 'square' | 'video' | 'auto';
  showMainIndicator?: boolean;
  enablePreview?: boolean;
  enableReordering?: boolean;
  
  // Drop zone options
  dropZoneVariant?: 'default' | 'compact' | 'minimal';
  showDropZoneWhenHasItems?: boolean;
  
  // Progress options
  showProgress?: boolean;
  progressVariant?: 'inline' | 'overlay' | 'standalone';
  
  // Callbacks
  onPreview?: (index: number, item: MediaItem) => void;
  onSetMain?: (index: number, item: MediaItem) => void;
  onReorder?: (oldIndex: number, newIndex: number) => void;
  
  // Custom actions
  customActions?: MediaAction[];
  
  // Styling
  className?: string;
  dropZoneClassName?: string;
  galleryClassName?: string;
  progressClassName?: string;
}
```

## 🔧 Hook Methods

### useUnifiedMedia Hook

```tsx
const {
  // State
  mediaFiles,              // File[] - Selected files
  previewMedia,           // string[] - Preview URLs
  originalMedia,          // MediaItem[] - Existing media (edit mode)
  mediaToDelete,          // number[] - IDs marked for deletion
  isUploading,            // boolean - Upload in progress
  uploadProgress,         // number - Upload progress (0-100)
  isDragging,             // boolean - Drag state
  currentIndex,           // number - Current selected index
  
  // File operations
  handleFileSelect,       // File input change handler
  handleDragOver,         // Drag over handler
  handleDragLeave,        // Drag leave handler
  handleDrop,             // Drop handler
  removeMedia,            // Remove media by index
  clearAllFiles,          // Clear all new files
  
  // Upload operations
  uploadFiles,            // Upload files to server
  deleteMarkedMedia,      // Delete marked media from server
  
  // Edit operations
  initializeExistingMedia, // Set existing media for edit mode
  setMainMedia,           // Set main media index
  
  // UI operations
  setCurrentMediaIndex,   // Set current index
  
  // Utility
  getTotalMediaCount,     // Get total media count
  canAddMoreFiles,        // Check if can add more files
  getValidationErrors,    // Validate files
  reset,                  // Reset all state
} = useUnifiedMedia();
```

## 📋 Migration Checklist

### Phase 1: Prepare
- [ ] Review current media upload implementations
- [ ] Identify feature-specific requirements
- [ ] Plan migration timeline

### Phase 2: Replace Components
- [ ] Replace `EventMediaUpload` with `UnifiedEventMediaUpload`
- [ ] Replace `MediaUploadSection` with `UnifiedProductMediaUpload`
- [ ] Update imports across the codebase
- [ ] Test basic functionality

### Phase 3: Advanced Features
- [ ] Implement custom actions where needed
- [ ] Configure layouts and styling
- [ ] Add feature-specific validations
- [ ] Test edge cases

### Phase 4: Cleanup
- [ ] Remove old components:
  - `src/features/kupi-prodai/components/media/MediaDropZone.tsx`
  - `src/features/kupi-prodai/components/media/MediaGallery.tsx`
  - `src/features/kupi-prodai/components/media/UploadProgressIndicator.tsx`
  - `src/features/kupi-prodai/components/forms/sections/MediaUploadSection.tsx`
  - `src/features/campuscurrent/components/forms/UploadProgress.tsx`
- [ ] Update context dependencies
- [ ] Remove unused imports
- [ ] Run tests and verify functionality

### Phase 5: Optimization
- [ ] Bundle size analysis
- [ ] Performance testing
- [ ] Accessibility testing
- [ ] Mobile responsiveness testing

## 🧪 Testing

### Unit Tests
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { UnifiedMediaProvider, UnifiedMediaUploadZone } from '@/features/media';
import { getMediaConfig } from '@/features/media/config/mediaConfigs';

test('should upload files correctly', async () => {
  const config = getMediaConfig('campusCurrentEvents');
  
  render(
    <UnifiedMediaProvider config={config}>
      <UnifiedMediaUploadZone />
    </UnifiedMediaProvider>
  );
  
  const dropZone = screen.getByText(/drag & drop files/i);
  const file = new File(['test'], 'test.png', { type: 'image/png' });
  
  fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });
  
  // Assert file was added
  expect(screen.getByAltText(/test/i)).toBeInTheDocument();
});
```

### Integration Tests
```tsx
test('should integrate with legacy contexts', () => {
  // Test context bridge functionality
  // Verify state synchronization
  // Test upload/delete operations
});
```

## 🚨 Breaking Changes

### Removed Components
- All feature-specific media components are deprecated
- Old hook APIs are maintained for backward compatibility but deprecated

### Changed APIs
- `onRemove` prop signature changed from `(index: number)` to `(index: number, item?: MediaItem)`
- Upload hooks now require configuration objects

### Migration Timeline
- **Phase 1** (Week 1): Install unified system alongside existing
- **Phase 2** (Week 2): Migrate CampusCurrent features
- **Phase 3** (Week 3): Migrate Kupi-Prodai features  
- **Phase 4** (Week 4): Remove deprecated components
- **Phase 5** (Week 5): Performance optimization and testing

## 📞 Support

For migration support or questions:
- Check existing examples in the codebase
- Review component props and hook documentation
- Test with small components first before migrating large features

## 🎉 Success Metrics

After migration, you should see:
- ✅ Consistent media upload behavior across all features
- ✅ Reduced bundle size (removal of duplicate code)
- ✅ Improved maintainability (single codebase)
- ✅ Better user experience (unified interactions)
- ✅ Enhanced functionality (rich features everywhere)
