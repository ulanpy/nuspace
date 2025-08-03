import { Button } from "@/components/atoms/button";
import { motion } from "framer-motion";
import { Plus, Save, Trash2 } from "lucide-react";
import { UploadProgressIndicator } from "../../media/UploadProgressIndicator";
import { sectionVariants } from "@/utils/animationVariants";

interface FormActionsSectionProps {
  mode: 'create' | 'edit';
  isSubmitting?: boolean;
  uploadProgress?: number;
  onDelete?: () => void;
  onCancel?: () => void;
  submitText?: string;
  disabled?: boolean;
}

export function FormActionsSection({
  mode,
  isSubmitting = false,
  uploadProgress = 0,
  onDelete,
  onCancel,
  submitText,
  disabled = false
}: FormActionsSectionProps) {
  const defaultSubmitText = mode === 'create' ? 'Create Listing' : 'Save Changes';
  const finalSubmitText = submitText || defaultSubmitText;

  return (
    <motion.div variants={sectionVariants}>
      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isSubmitting || disabled}
        className="w-full h-12 text-base font-medium shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
        size="lg"
      >
        {isSubmitting ? (
          <UploadProgressIndicator
            isUploading={isSubmitting}
            progress={uploadProgress}
            status="uploading"
            message={mode === 'create' ? 'Publishing...' : 'Saving...'}
            variant="inline"
            size="md"
            showPercentage={mode === 'create'}
          />
        ) : (
          <div className="flex items-center justify-center gap-2">
            {mode === 'create' ? (
              <Plus className="h-5 w-5" />
            ) : (
              <Save className="h-5 w-5" />
            )}
            <span>{finalSubmitText}</span>
          </div>
        )}
      </Button>

      {/* Progress Bar for Create Mode */}
      {mode === 'create' && isSubmitting && (
        <UploadProgressIndicator
          isUploading={isSubmitting}
          progress={uploadProgress}
          status="uploading"
          variant="standalone"
          size="sm"
          showIcon={false}
          showPercentage={false}
          className="mt-3"
        />
      )}

      {/* Action Buttons for Edit Mode */}
      {mode === 'edit' && (onDelete || onCancel) && (
        <div className="flex items-center justify-between mt-6">
          {onDelete && (
            <Button type="button" variant="destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Product
            </Button>
          )}
          
          {onCancel && (
            <div className="flex gap-3 ml-auto">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}