import { Button } from "@/components/atoms/button";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star, Eye, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/atoms/dropdown-menu";

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

export interface MediaGalleryProps {
  items: MediaItem[] | string[];
  onRemove: (index: number, item?: MediaItem) => void;
  onSetMain?: (index: number, item: MediaItem) => void;
  onPreview?: (index: number, item: MediaItem) => void;
  
  // Display options
  showMainIndicator?: boolean;
  showActions?: boolean;
  maxItems?: number;
  className?: string;
  itemClassName?: string;
  animateEntrance?: boolean;
  
  // Grid layout options
  columns?: 'auto' | 2 | 3 | 4 | 5 | 6;
  aspectRatio?: 'square' | 'video' | 'auto';
  
  // Customization
  customActions?: MediaAction[];
  removeButtonPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  
  // Loading states
  loading?: boolean;
  error?: string;
}

const DEFAULT_PROPS = {
  showMainIndicator: true,
  showActions: true,
  animateEntrance: true,
  columns: 'auto' as const,
  aspectRatio: 'square' as const,
  removeButtonPosition: 'top-right' as const,
  loading: false,
  customActions: []
};

export function MediaGallery(props: MediaGalleryProps) {
  const {
    items,
    onRemove,
    onSetMain,
    onPreview,
    showMainIndicator = DEFAULT_PROPS.showMainIndicator,
    showActions = DEFAULT_PROPS.showActions,
    maxItems,
    className = "",
    itemClassName = "",
    animateEntrance = DEFAULT_PROPS.animateEntrance,
    columns = DEFAULT_PROPS.columns,
    aspectRatio = DEFAULT_PROPS.aspectRatio,
    customActions = DEFAULT_PROPS.customActions,
    removeButtonPosition = DEFAULT_PROPS.removeButtonPosition,
    loading = DEFAULT_PROPS.loading,
    error
  } = props;

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Normalize items to MediaItem format
  const normalizedItems: MediaItem[] = items.map((item, index) => {
    if (typeof item === 'string') {
      return { id: index, url: item, type: 'image' };
    }
    return { ...item, id: item.id ?? index, type: item.type ?? 'image' };
  });

  const displayItems = maxItems ? normalizedItems.slice(0, maxItems) : normalizedItems;
  const hasMoreItems = maxItems && normalizedItems.length > maxItems;

  const getGridColumns = () => {
    if (columns === 'auto') {
      return 'grid-cols-3 sm:grid-cols-4';
    }
    return `grid-cols-${Math.min(columns, 3)} sm:grid-cols-${columns}`;
  };

  const getAspectRatio = () => {
    switch (aspectRatio) {
      case 'video':
        return 'aspect-video';
      case 'auto':
        return '';
      default:
        return 'aspect-square';
    }
  };

  const getRemoveButtonPosition = () => {
    switch (removeButtonPosition) {
      case 'top-left':
        return 'top-2 left-2';
      case 'bottom-right':
        return 'bottom-2 right-2';
      case 'bottom-left':
        return 'bottom-2 left-2';
      default:
        return 'top-2 right-2';
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 400,
        damping: 10
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.8,
      transition: {
        duration: 0.2
      }
    }
  };

  // Default actions
  const defaultActions: MediaAction[] = [
    ...(onPreview ? [{
      id: 'preview',
      label: 'Preview',
      icon: Eye,
      onClick: (index: number, item: MediaItem) => onPreview(index, item),
      showInHover: true,
      showInDropdown: false
    }] : []),
    ...(onSetMain ? [{
      id: 'setMain',
      label: 'Set as main',
      icon: Star,
      onClick: (index: number, item: MediaItem) => onSetMain(index, item),
      showInHover: true,
      showInDropdown: true
    }] : []),
  ];

  const allActions = [...defaultActions, ...customActions];
  const hoverActions = allActions.filter(action => action.showInHover !== false);
  const dropdownActions = allActions.filter(action => action.showInDropdown !== false);

  if (loading) {
    return (
      <div className={`grid ${getGridColumns()} gap-3 ${className}`}>
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className={`${getAspectRatio()} rounded-lg bg-muted animate-pulse ${itemClassName}`} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4 text-destructive">
        <p>{error}</p>
      </div>
    );
  }

  if (displayItems.length === 0) {
    return null;
  }

  return (
    <motion.div 
      className={`grid ${getGridColumns()} gap-3 ${className}`}
      variants={animateEntrance ? containerVariants : undefined}
      initial={animateEntrance ? "hidden" : undefined}
      animate={animateEntrance ? "visible" : undefined}
    >
      <AnimatePresence mode="popLayout">
        {displayItems.map((item, index) => (
          <motion.div
            key={item.id}
            variants={animateEntrance ? itemVariants : undefined}
            initial={animateEntrance ? "hidden" : undefined}
            animate={animateEntrance ? "visible" : undefined}
            exit={animateEntrance ? "exit" : undefined}
            layout
            className={`relative ${getAspectRatio()} rounded-lg overflow-hidden group ${itemClassName}`}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {/* Media Content */}
            {item.type === 'video' ? (
              <video
                src={item.url}
                className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-110"
                muted
                playsInline
              />
            ) : (
              <img
                src={item.url || "/placeholder.svg"}
                alt={item.name || `Media ${index + 1}`}
                className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-110"
                loading="lazy"
              />
            )}

            {/* Main indicator */}
            {showMainIndicator && item.isMain && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 z-10"
              >
                <Star className="h-3 w-3 fill-current" />
                Main
              </motion.div>
            )}

            {/* Hover overlay with actions */}
            <AnimatePresence>
              {showActions && hoveredIndex === index && hoverActions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/50 flex items-center justify-center z-20"
                >
                  <div className="flex gap-2">
                    {/* Direct hover actions */}
                    {hoverActions.slice(0, 2).map((action) => {
                      const IconComponent = action.icon;
                      const shouldShow = action.id !== 'setMain' || !item.isMain;
                      
                      if (!shouldShow) return null;
                      
                      return (
                        <Button
                          key={action.id}
                          type="button"
                          variant={action.variant === 'destructive' ? 'destructive' : 'secondary'}
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            action.onClick(index, item);
                          }}
                        >
                          <IconComponent className="h-4 w-4" />
                        </Button>
                      );
                    })}

                    {/* More actions dropdown */}
                    {dropdownActions.length > 0 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {dropdownActions.map((action) => {
                            const IconComponent = action.icon;
                            const shouldShow = action.id !== 'setMain' || !item.isMain;
                            
                            if (!shouldShow) return null;
                            
                            return (
                              <DropdownMenuItem
                                key={action.id}
                                onClick={() => action.onClick(index, item)}
                                className={action.variant === 'destructive' ? 'text-destructive focus:text-destructive' : ''}
                              >
                                <IconComponent className="h-4 w-4 mr-2" />
                                {action.label}
                              </DropdownMenuItem>
                            );
                          })}
                          <DropdownMenuItem 
                            onClick={() => onRemove(index, item)}
                            className="text-destructive focus:text-destructive"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quick remove button - always visible on mobile */}
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className={`absolute ${getRemoveButtonPosition()} h-6 w-6 p-0 opacity-80 hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-30`}
              onClick={(e) => {
                e.stopPropagation();
                onRemove(index, item);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Show more indicator */}
      {hasMoreItems && (
        <motion.div
          variants={animateEntrance ? itemVariants : undefined}
          className={`${getAspectRatio()} rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center text-muted-foreground`}
        >
          <div className="text-center">
            <span className="text-sm font-medium">+{normalizedItems.length - maxItems!}</span>
            <p className="text-xs">more</p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

// Export default props for external reference
export { DEFAULT_PROPS as MediaGalleryDefaults };