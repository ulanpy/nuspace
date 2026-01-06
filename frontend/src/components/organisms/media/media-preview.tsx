"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/atoms/button";
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Download,
  Maximize,
  Minimize
} from "lucide-react";
import { MediaItem } from "@/features/media/types/media";

export interface MediaPreviewProps {
  items: MediaItem[] | string[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (index: number) => void;
  
  // Customization
  showNavigation?: boolean;
  showZoom?: boolean;
  showRotate?: boolean;
  showDownload?: boolean;
  showFullscreen?: boolean;
  
  // Styling  
  className?: string;
  overlayClassName?: string;
  
  // Callbacks
  onDownload?: (item: MediaItem, index: number) => void;
}

const DEFAULT_PROPS = {
  showNavigation: true,
  showZoom: true,
  showRotate: true,
  showDownload: true,
  showFullscreen: true,
  className: "",
  overlayClassName: ""
};

export function MediaPreview(props: MediaPreviewProps) {
  const {
    items,
    currentIndex,
    isOpen,
    onClose,
    onNavigate,
    showNavigation = DEFAULT_PROPS.showNavigation,
    showZoom = DEFAULT_PROPS.showZoom,
    showRotate = DEFAULT_PROPS.showRotate,
    showDownload = DEFAULT_PROPS.showDownload,
    showFullscreen = DEFAULT_PROPS.showFullscreen,
    className = DEFAULT_PROPS.className,
    overlayClassName = DEFAULT_PROPS.overlayClassName,
    onDownload
  } = props;

  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Normalize items
  const normalizedItems: MediaItem[] = items.map((item, index) => {
    if (typeof item === 'string') {
      return { id: index, url: item, type: 'image' };
    }
    return { ...item, id: item.id ?? index, type: item.type ?? 'image' };
  });

  const currentItem = normalizedItems[currentIndex];
  const canNavigatePrev = currentIndex > 0;
  const canNavigateNext = currentIndex < normalizedItems.length - 1;

  // Reset transform when index changes
  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          if (canNavigatePrev && onNavigate) {
            onNavigate(currentIndex - 1);
          }
          break;
        case 'ArrowRight':
          if (canNavigateNext && onNavigate) {
            onNavigate(currentIndex + 1);
          }
          break;
        case '+':
        case '=':
          if (showZoom) {
            setZoom(prev => Math.min(prev + 0.25, 3));
          }
          break;
        case '-':
          if (showZoom) {
            setZoom(prev => Math.max(prev - 0.25, 0.25));
          }
          break;
        case 'r':
          if (showRotate) {
            setRotation(prev => prev + 90);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, canNavigatePrev, canNavigateNext, onNavigate, onClose, showZoom, showRotate]);

  const handlePrevious = () => {
    if (canNavigatePrev && onNavigate) {
      onNavigate(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (canNavigateNext && onNavigate) {
      onNavigate(currentIndex + 1);
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.25));
  };

  const handleRotate = () => {
    setRotation(prev => prev + 90);
  };

  const handleDownload = () => {
    if (onDownload && currentItem) {
      onDownload(currentItem, currentIndex);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      e.preventDefault();
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition(prev => ({
        x: prev.x + e.movementX,
        y: prev.y + e.movementY
      }));
    }
  }, [isDragging, zoom]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  if (!isOpen || !currentItem) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`fixed inset-0 z-50 bg-black/90 backdrop-blur-sm ${overlayClassName}`}
        onClick={onClose}
      >
        <div 
          className={`relative w-full h-full flex items-center justify-center p-4 ${className}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <Button
            variant="secondary"
            size="sm"
            className="absolute top-4 right-4 z-10 h-10 w-10 p-0"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Navigation buttons */}
          {showNavigation && normalizedItems.length > 1 && (
            <>
              <Button
                variant="secondary"
                size="sm"
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 p-0"
                onClick={handlePrevious}
                disabled={!canNavigatePrev}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 p-0"
                onClick={handleNext}
                disabled={!canNavigateNext}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}

          {/* Controls */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
            {showZoom && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-10 w-10 p-0"
                  onClick={handleZoomOut}
                  disabled={zoom <= 0.25}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-10 w-10 p-0"
                  onClick={handleZoomIn}
                  disabled={zoom >= 3}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </>
            )}
            
            {showRotate && (
              <Button
                variant="secondary"
                size="sm"
                className="h-10 w-10 p-0"
                onClick={handleRotate}
              >
                <RotateCw className="h-4 w-4" />
              </Button>
            )}

            {showDownload && (
              <Button
                variant="secondary"
                size="sm"
                className="h-10 w-10 p-0"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4" />
              </Button>
            )}

            {showFullscreen && (
              <Button
                variant="secondary"
                size="sm"
                className="h-10 w-10 p-0"
                onClick={toggleFullscreen}
              >
                {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </Button>
            )}
          </div>

          {/* Image counter */}
          {normalizedItems.length > 1 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
              {currentIndex + 1} / {normalizedItems.length}
            </div>
          )}

          {/* Media content */}
          <motion.div
            className="max-w-full max-h-full cursor-move"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg) translate(${position.x}px, ${position.y}px)`,
              cursor: zoom > 1 ? 'move' : 'default'
            }}
            onMouseDown={handleMouseDown}
            drag={zoom > 1 ? true : false}
            dragMomentum={false}
          >
            {currentItem.type === 'video' ? (
              <video
                src={currentItem.url}
                controls
                className="max-w-full max-h-full object-contain"
                autoPlay
              />
            ) : (
              <img
                src={currentItem.url}
                alt={currentItem.name || `Media ${currentIndex + 1}`}
                className="max-w-full max-h-full object-contain select-none"
                draggable={false}
              />
            )}
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Export default props for external reference
export { DEFAULT_PROPS as MediaPreviewDefaults };