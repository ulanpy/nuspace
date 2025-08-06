import { useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/atoms/button";
import { ImageIcon, Upload, FileIcon, Film } from "lucide-react";

export interface MediaDropZoneProps {
  isDragging: boolean;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  maxSizeText?: string;
  className?: string;
  
  // New customization props
  title?: string;
  description?: string;
  icon?: 'image' | 'file' | 'video' | React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'compact' | 'minimal';
  showButton?: boolean;
  buttonText?: string;
  allowedTypes?: string[];
}

const DEFAULT_PROPS = {
  accept: "image/*",
  multiple: true,
  disabled: false,
  maxSizeText: "PNG, JPG, GIF up to 10MB",
  className: "",
  title: "Upload files",
  description: "Drag and drop or click to browse",
  icon: 'image' as const,
  variant: 'default' as const,
  showButton: true,
  buttonText: "Choose Files",
  allowedTypes: []
};

export function MediaDropZone(props: MediaDropZoneProps) {
  const {
    isDragging,
    onDragOver,
    onDragLeave,
    onDrop,
    onFileSelect,
    accept = DEFAULT_PROPS.accept,
    multiple = DEFAULT_PROPS.multiple,
    disabled = DEFAULT_PROPS.disabled,
    maxSizeText = DEFAULT_PROPS.maxSizeText,
    className = DEFAULT_PROPS.className,
    title = DEFAULT_PROPS.title,
    description = DEFAULT_PROPS.description,
    icon = DEFAULT_PROPS.icon,
    variant = DEFAULT_PROPS.variant,
    showButton = DEFAULT_PROPS.showButton,
    buttonText = DEFAULT_PROPS.buttonText,
    allowedTypes = DEFAULT_PROPS.allowedTypes
  } = props;

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const getIcon = () => {
    if (typeof icon === 'string') {
      switch (icon) {
        case 'image':
          return ImageIcon;
        case 'file':
          return FileIcon;
        case 'video':
          return Film;
        default:
          return ImageIcon;
      }
    }
    return icon;
  };

  const IconComponent = getIcon();

  const getVariantClasses = () => {
    switch (variant) {
      case 'compact':
        return {
          container: "p-4",
          iconSize: "h-6 w-6",
          iconPadding: "p-3",
          titleSize: "text-sm",
          descriptionSize: "text-xs"
        };
      case 'minimal':
        return {
          container: "p-6",
          iconSize: "h-7 w-7",
          iconPadding: "p-3",
          titleSize: "text-base",
          descriptionSize: "text-sm"
        };
      default:
        return {
          container: "p-8",
          iconSize: "h-8 w-8",
          iconPadding: "p-4",
          titleSize: "text-base",
          descriptionSize: "text-sm"
        };
    }
  };

  const variantClasses = getVariantClasses();

  const getDragTitle = () => {
    if (isDragging) return "Drop your files here";
    return title;
  };

  const getDescription = () => {
    if (disabled) return "Upload is currently disabled";
    const baseDesc = isDragging ? "Release to upload" : description;
    const sizeInfo = allowedTypes.length > 0 
      ? `${allowedTypes.join(', ')} • ${maxSizeText}`
      : maxSizeText;
    return `${baseDesc} • ${sizeInfo}`;
  };

  return (
    <motion.div
      className={`relative border-2 rounded-lg ${variantClasses.container} cursor-pointer transition-all duration-300 overflow-hidden group ${
        disabled 
          ? "border-muted-foreground/10 bg-muted/5 cursor-not-allowed"
          : isDragging 
            ? "border-primary bg-primary/5 scale-[1.02]" 
            : "border-dashed border-muted-foreground/25 hover:border-primary/50 hover:bg-primary/5"
      } ${className}`}
      onDragOver={disabled ? undefined : onDragOver}
      onDragLeave={disabled ? undefined : onDragLeave}
      onDrop={disabled ? undefined : onDrop}
      onClick={handleClick}
      whileHover={disabled ? {} : { scale: 1.005 }}
      whileTap={disabled ? {} : { scale: 0.995 }}
    >
      {/* Background animation effect */}
      {!disabled && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100"
          animate={isDragging ? {
            x: ['-100%', '100%'],
          } : {}}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      )}
      
      <div className="flex flex-col items-center justify-center text-center space-y-4 relative z-10">
        <motion.div 
          className={`relative ${variantClasses.iconPadding} rounded-full transition-colors duration-300 ${
            disabled 
              ? "bg-muted/30"
              : isDragging 
                ? "bg-primary/10" 
                : "bg-muted/50"
          }`}
          animate={!disabled ? { 
            scale: isDragging ? [1, 1.1, 1] : 1,
            rotate: isDragging ? [0, 5, -5, 0] : 0
          } : {}}
          transition={{ duration: 0.5 }}
        >
          <IconComponent className={`${variantClasses.iconSize} transition-colors duration-300 ${
            disabled 
              ? "text-muted-foreground/50"
              : isDragging 
                ? "text-primary" 
                : "text-muted-foreground"
          }`} />
        </motion.div>
        
        <div>
          <p className={`${variantClasses.titleSize} font-medium mb-2 ${
            disabled ? "text-muted-foreground/50" : ""
          }`}>
            {disabled ? "Upload disabled" : getDragTitle()}
          </p>
          
          <p className={`${variantClasses.descriptionSize} mb-4 ${
            disabled ? "text-muted-foreground/40" : "text-muted-foreground"
          }`}>
            {getDescription()}
          </p>
          
          {!disabled && showButton && (
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                type="button" 
                variant="outline" 
                size={variant === 'compact' ? 'sm' : 'sm'}
                className="relative transition-all duration-200 hover:bg-primary hover:text-primary-foreground group/btn overflow-hidden"
                disabled={disabled}
              >
                <Upload className="mr-2 h-4 w-4" />
                {buttonText}
              </Button>
            </motion.div>
          )}
        </div>
      </div>
      
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept={accept}
        multiple={multiple}
        onChange={onFileSelect}
        disabled={disabled}
      />
    </motion.div>
  );
}

// Export default props for external reference
export { DEFAULT_PROPS as MediaDropZoneDefaults };