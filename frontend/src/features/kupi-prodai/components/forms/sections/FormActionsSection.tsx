import { Button } from "@/components/atoms/button";
import { Progress } from "@/components/atoms/progress";
import { Plus, Save, Trash2, RefreshCw } from "lucide-react";

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
    <div>
      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isSubmitting || disabled}
        className="w-full h-12 text-base font-medium shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
        size="lg"
      >
        {isSubmitting ? (
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>{mode === 'create' ? 'Publishing...' : 'Saving...'}</span>
            {mode === 'create' && <span className="text-sm">{uploadProgress}%</span>}
          </div>
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
        <div className="mt-3 space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Publishing product...</span>
            <span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
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
    </div>
  );
}