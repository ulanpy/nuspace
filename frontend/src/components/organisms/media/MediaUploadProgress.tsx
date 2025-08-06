import { motion, AnimatePresence } from "framer-motion";
import { Progress } from "@/components/atoms/progress";
import { RefreshCw, CheckCircle, XCircle, Upload, Loader } from "lucide-react";

export interface MediaUploadProgressProps {
  isUploading: boolean;
  progress: number;
  status?: 'idle' | 'uploading' | 'success' | 'error' | 'processing';
  message?: string;
  
  // Display options
  showIcon?: boolean;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'inline' | 'overlay' | 'standalone' | 'minimal';
  
  // Styling
  className?: string;
  progressClassName?: string;
  
  // Callbacks
  onRetry?: () => void;
  onCancel?: () => void;
  
  // Advanced options
  animated?: boolean;
  autoHide?: boolean;
  hideDelay?: number;
}

const DEFAULT_PROPS = {
  status: 'idle' as const,
  showIcon: true,
  showPercentage: true,
  size: 'md' as const,
  variant: 'standalone' as const,
  className: "",
  progressClassName: "",
  animated: true,
  autoHide: false,
  hideDelay: 3000
};

export function MediaUploadProgress(props: MediaUploadProgressProps) {
  const {
    isUploading,
    progress,
    status = DEFAULT_PROPS.status,
    message,
    showIcon = DEFAULT_PROPS.showIcon,
    showPercentage = DEFAULT_PROPS.showPercentage,
    size = DEFAULT_PROPS.size,
    variant = DEFAULT_PROPS.variant,
    className = DEFAULT_PROPS.className,
    progressClassName = DEFAULT_PROPS.progressClassName,
    onRetry,
    onCancel,
    animated = DEFAULT_PROPS.animated,
    autoHide = DEFAULT_PROPS.autoHide,
    hideDelay = DEFAULT_PROPS.hideDelay
  } = props;

  const getIcon = () => {
    if (!showIcon) return null;

    switch (status) {
      case 'uploading':
        return <RefreshCw className={`${getSizeClasses().icon} animate-spin text-primary`} />;
      case 'processing':
        return <Loader className={`${getSizeClasses().icon} animate-spin text-blue-500`} />;
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
          progress: 'h-1.5',
          spacing: 'space-y-1'
        };
      case 'lg':
        return {
          icon: 'h-6 w-6',
          text: 'text-lg',
          progress: 'h-3',
          spacing: 'space-y-3'
        };
      default:
        return {
          icon: 'h-5 w-5',
          text: 'text-base',
          progress: 'h-2',
          spacing: 'space-y-2'
        };
    }
  };

  const getMessage = () => {
    if (message) return message;
    
    switch (status) {
      case 'uploading':
        return 'Uploading files...';
      case 'processing':
        return 'Processing...';
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
      case 'processing':
        return 'bg-blue-500';
      default:
        return '';
    }
  };

  const containerClasses = {
    inline: "flex items-center gap-2",
    overlay: "absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50",
    standalone: `w-full ${getSizeClasses().spacing}`,
    minimal: "flex items-center gap-2 text-sm"
  };

  const shouldShow = isUploading || status !== 'idle' || (autoHide && status !== 'idle');

  if (!shouldShow) {
    return null;
  }

  const progressValue = status === 'success' ? 100 : progress;

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={animated ? { 
            opacity: 0, 
            y: variant === 'overlay' ? 0 : 10,
            scale: variant === 'overlay' ? 0.9 : 1
          } : undefined}
          animate={animated ? { 
            opacity: 1, 
            y: 0,
            scale: 1
          } : undefined}
          exit={animated ? { 
            opacity: 0, 
            y: variant === 'overlay' ? 0 : -10,
            scale: variant === 'overlay' ? 0.9 : 1
          } : undefined}
          transition={{ duration: 0.3 }}
          className={`${containerClasses[variant]} ${className}`}
        >
          {variant === 'inline' || variant === 'minimal' ? (
            <>
              {getIcon()}
              <span className={getSizeClasses().text}>
                {getMessage()}
                {showPercentage && (isUploading || status === 'processing') && ` ${progress}%`}
              </span>
            </>
          ) : variant === 'overlay' ? (
            <div className="text-center space-y-3 bg-background/95 rounded-lg p-6 shadow-lg border max-w-sm">
              <div className="flex justify-center">
                {getIcon()}
              </div>
              <div>
                <p className={`${getSizeClasses().text} font-medium`}>
                  {getMessage()}
                </p>
                {showPercentage && (isUploading || status === 'processing') && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {progress}%
                  </p>
                )}
              </div>
              {(isUploading || status === 'processing') && (
                <motion.div
                  initial={animated ? { opacity: 0, scaleX: 0 } : undefined}
                  animate={animated ? { opacity: 1, scaleX: 1 } : undefined}
                  className="origin-left"
                >
                  <Progress 
                    value={progressValue} 
                    className={`w-48 ${getSizeClasses().progress} ${progressClassName}`}
                  />
                </motion.div>
              )}
              {/* Action buttons for overlay */}
              {(status === 'error' && onRetry) && (
                <button
                  onClick={onRetry}
                  className="text-sm text-primary hover:underline"
                >
                  Try again
                </button>
              )}
              {onCancel && isUploading && (
                <button
                  onClick={onCancel}
                  className="text-sm text-muted-foreground hover:underline ml-4"
                >
                  Cancel
                </button>
              )}
            </div>
          ) : (
            // standalone
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getIcon()}
                  <span className={getSizeClasses().text}>
                    {getMessage()}
                  </span>
                </div>
                {showPercentage && (isUploading || status === 'processing') && (
                  <span className={`${getSizeClasses().text} text-muted-foreground font-mono`}>
                    {progress}%
                  </span>
                )}
              </div>
              
              {(isUploading || status === 'processing') && (
                <motion.div
                  initial={animated ? { opacity: 0, scaleX: 0 } : undefined}
                  animate={animated ? { opacity: 1, scaleX: 1 } : undefined}
                  exit={animated ? { opacity: 0, scaleX: 0 } : undefined}
                  className="origin-left"
                >
                  <Progress 
                    value={progressValue} 
                    className={`w-full ${getSizeClasses().progress} ${getProgressColor()} ${progressClassName}`}
                  />
                </motion.div>
              )}

              {/* Action buttons for standalone */}
              {((status === 'error' && onRetry) || (onCancel && isUploading)) && (
                <div className="flex gap-2 text-sm">
                  {status === 'error' && onRetry && (
                    <button
                      onClick={onRetry}
                      className="text-primary hover:underline"
                    >
                      Try again
                    </button>
                  )}
                  {onCancel && isUploading && (
                    <button
                      onClick={onCancel}
                      className="text-muted-foreground hover:underline"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Export default props for external reference
export { DEFAULT_PROPS as MediaUploadProgressDefaults };