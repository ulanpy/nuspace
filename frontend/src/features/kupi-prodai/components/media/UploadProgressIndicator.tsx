import { motion, AnimatePresence } from "framer-motion";
import { Progress } from "@/components/atoms/progress";
import { RefreshCw, CheckCircle, XCircle, Upload } from "lucide-react";

interface UploadProgressIndicatorProps {
  isUploading: boolean;
  progress: number;
  status?: 'idle' | 'uploading' | 'success' | 'error';
  message?: string;
  showIcon?: boolean;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'inline' | 'overlay' | 'standalone';
  className?: string;
}

export function UploadProgressIndicator({
  isUploading,
  progress,
  status = 'idle',
  message,
  showIcon = true,
  showPercentage = true,
  size = 'md',
  variant = 'standalone',
  className = ""
}: UploadProgressIndicatorProps) {
  const getIcon = () => {
    if (!showIcon) return null;

    switch (status) {
      case 'uploading':
        return <RefreshCw className={`${getSizeClasses().icon} animate-spin`} />;
      case 'success':
        return <CheckCircle className={`${getSizeClasses().icon} text-green-500`} />;
      case 'error':
        return <XCircle className={`${getSizeClasses().icon} text-red-500`} />;
      default:
        return <Upload className={`${getSizeClasses().icon} text-muted-foreground`} />;
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          icon: 'h-4 w-4',
          text: 'text-sm',
          progress: 'h-1.5'
        };
      case 'lg':
        return {
          icon: 'h-6 w-6',
          text: 'text-lg',
          progress: 'h-3'
        };
      default:
        return {
          icon: 'h-5 w-5',
          text: 'text-base',
          progress: 'h-2'
        };
    }
  };

  const getMessage = () => {
    if (message) return message;
    
    switch (status) {
      case 'uploading':
        return 'Uploading...';
      case 'success':
        return 'Upload complete';
      case 'error':
        return 'Upload failed';
      default:
        return 'Ready to upload';
    }
  };

  const getProgressColor = () => {
    switch (status) {
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      default:
        return '';
    }
  };

  const containerClasses = {
    inline: "flex items-center gap-2",
    overlay: "absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4",
    standalone: "w-full space-y-2"
  };

  if (!isUploading && status === 'idle') {
    return null;
  }

  return (
    <AnimatePresence>
      {(isUploading || status !== 'idle') && (
        <motion.div
          initial={{ opacity: 0, y: variant === 'overlay' ? 0 : 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: variant === 'overlay' ? 0 : -10 }}
          className={`${containerClasses[variant]} ${className}`}
        >
          {variant === 'inline' ? (
            <>
              {getIcon()}
              <span className={getSizeClasses().text}>
                {getMessage()}
                {showPercentage && isUploading && ` ${progress}%`}
              </span>
            </>
          ) : variant === 'overlay' ? (
            <div className="text-center space-y-3">
              {getIcon()}
              <div>
                <p className={`${getSizeClasses().text} font-medium`}>
                  {getMessage()}
                </p>
                {showPercentage && isUploading && (
                  <p className="text-sm text-muted-foreground">
                    {progress}%
                  </p>
                )}
              </div>
              {isUploading && (
                <Progress 
                  value={progress} 
                  className={`w-48 ${getSizeClasses().progress}`}
                />
              )}
            </div>
          ) : (
            // standalone
            <>
              <div className="flex items-center gap-2">
                {getIcon()}
                <span className={getSizeClasses().text}>
                  {getMessage()}
                </span>
                {showPercentage && isUploading && (
                  <span className={`${getSizeClasses().text} text-muted-foreground`}>
                    {progress}%
                  </span>
                )}
              </div>
              
              {isUploading && (
                <motion.div
                  initial={{ opacity: 0, scaleX: 0 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  exit={{ opacity: 0, scaleX: 0 }}
                  className="origin-left"
                >
                  <Progress 
                    value={progress} 
                    className={`${getSizeClasses().progress} ${getProgressColor()}`}
                  />
                </motion.div>
              )}
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}