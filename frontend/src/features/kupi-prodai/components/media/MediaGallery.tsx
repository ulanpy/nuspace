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

interface MediaItem {
  id?: number;
  url: string;
  name?: string;
  size?: number;
  isMain?: boolean;
}

interface MediaGalleryProps {
  items: MediaItem[] | string[];
  onRemove: (index: number) => void;
  onSetMain?: (index: number) => void;
  onPreview?: (index: number) => void;
  showMainIndicator?: boolean;
  showActions?: boolean;
  maxItems?: number;
  className?: string;
  itemClassName?: string;
  animateEntrance?: boolean;
}

export function MediaGallery({
  items,
  onRemove,
  onSetMain,
  onPreview,
  showMainIndicator = true,
  showActions = true,
  maxItems,
  className = "",
  itemClassName = "",
  animateEntrance = true
}: MediaGalleryProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Normalize items to MediaItem format
  const normalizedItems: MediaItem[] = items.map((item, index) => {
    if (typeof item === 'string') {
      return { id: index, url: item };
    }
    return { ...item, id: item.id ?? index };
  });

  const displayItems = maxItems ? normalizedItems.slice(0, maxItems) : normalizedItems;
  const hasMoreItems = maxItems && normalizedItems.length > maxItems;

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

  if (displayItems.length === 0) {
    return null;
  }

  return (
    <motion.div 
      className={`grid grid-cols-3 sm:grid-cols-4 gap-3 ${className}`}
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
            className={`relative aspect-square rounded-lg overflow-hidden group ${itemClassName}`}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {/* Image */}
            <img
              src={item.url || "/placeholder.svg"}
              alt={item.name || `Media ${index + 1}`}
              className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-110"
              loading="lazy"
            />

            {/* Main indicator */}
            {showMainIndicator && item.isMain && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1"
              >
                <Star className="h-3 w-3 fill-current" />
                Main
              </motion.div>
            )}

            {/* Hover overlay */}
            <AnimatePresence>
              {showActions && hoveredIndex === index && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/50 flex items-center justify-center"
                >
                  <div className="flex gap-2">
                    {/* Preview button */}
                    {onPreview && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPreview(index);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}

                    {/* Set main button */}
                    {onSetMain && !item.isMain && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-8 px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSetMain(index);
                        }}
                      >
                        <Star className="h-3 w-3 mr-1" />
                        Main
                      </Button>
                    )}

                    {/* More actions dropdown */}
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
                        {onSetMain && !item.isMain && (
                          <DropdownMenuItem onClick={() => onSetMain(index)}>
                            <Star className="h-4 w-4 mr-2" />
                            Set as main
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          onClick={() => onRemove(index)}
                          className="text-destructive focus:text-destructive"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quick remove button - always visible on mobile */}
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2 h-6 w-6 p-0 opacity-80 hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(index);
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
          className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center text-muted-foreground"
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