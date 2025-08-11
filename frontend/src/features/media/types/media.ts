// src/features/media/types/media.ts

export interface MediaItem {
  id?: number | string;
  url: string;
  name?: string;
  size?: number;
  isMain?: boolean;
  type?: 'image' | 'video' | 'document';
}

export interface MediaAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: (index: number, item: MediaItem) => void;
  variant?: 'default' | 'destructive';
  showInHover?: boolean;
  showInDropdown?: boolean;
}

