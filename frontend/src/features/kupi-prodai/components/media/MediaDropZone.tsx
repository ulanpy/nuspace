import { useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/atoms/button";
import { ImageIcon, Upload } from "lucide-react";

interface MediaDropZoneProps {
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
}

export function MediaDropZone({
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileSelect,
  accept = "image/*",
  multiple = true,
  disabled = false,
  maxSizeText = "PNG, JPG, GIF up to 10MB",
  className = ""
}: MediaDropZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  return (
    <motion.div
      className={`relative border-2 rounded-lg p-8 cursor-pointer transition-all duration-300 overflow-hidden group ${
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
          className={`relative p-4 rounded-full transition-colors duration-300 ${
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
          <ImageIcon className={`h-8 w-8 transition-colors duration-300 ${
            disabled 
              ? "text-muted-foreground/50"
              : isDragging 
                ? "text-primary" 
                : "text-muted-foreground"
          }`} />
        </motion.div>
        
        <div>
          <p className={`text-base font-medium mb-2 ${
            disabled ? "text-muted-foreground/50" : ""
          }`}>
            {disabled 
              ? "Upload disabled" 
              : isDragging 
                ? "Drop your images here" 
                : "Upload product images"
            }
          </p>
          
          <p className={`text-sm mb-4 ${
            disabled ? "text-muted-foreground/40" : "text-muted-foreground"
          }`}>
            {disabled 
              ? "Upload is currently disabled"
              : `Drag and drop or click to browse • ${maxSizeText}`
            }
          </p>
          
          {!disabled && (
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                className="relative transition-all duration-200 hover:bg-primary hover:text-primary-foreground group/btn overflow-hidden"
                disabled={disabled}
              >
                <Upload className="mr-2 h-4 w-4" />
                Choose Files
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