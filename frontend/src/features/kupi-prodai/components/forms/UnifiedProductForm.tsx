import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/card";
import { FormSkeleton } from "@/components/atoms/skeleton";
import { BasicInfoSection } from "./sections/BasicInfoSection";
import { UnifiedProductMediaUpload } from "./UnifiedProductMediaUpload";
import { FormActionsSection } from "./sections/FormActionsSection";
import { formVariants, sectionVariants } from "@/utils/animationVariants";

export interface ProductFormData {
  id?: number;
  name: string;
  description: string;
  price: number | string;
  category: string;
  condition: string;
  status?: string;
  quantity?: number;
  seller?: string;
  images?: { id: number; url: string; main: boolean }[];
}

interface UnifiedProductFormProps {
  mode: 'create' | 'edit';
  initialData?: ProductFormData;
  onSubmit: (data: ProductFormData, e: React.FormEvent) => void;
  onCancel?: () => void;
  onDelete?: () => void;
  
  // Form configuration
  categories: Types.DisplayCategory[];
  conditions: string[];
  
  // State management
  isSubmitting?: boolean;
  uploadProgress?: number;
  
  // Price handling
  onPriceFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onPriceBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  
  // UI options
  showLoadingSkeleton?: boolean;
  loadingDuration?: number;
  title?: string;
}

const defaultFormData: ProductFormData = {
  name: '',
  description: '',
  price: 0,
  category: '',
  condition: '',
  status: 'Active',
  quantity: 1,
  seller: '',
  images: []
};

export function UnifiedProductForm({
  mode,
  initialData,
  onSubmit,
  onCancel,
  onDelete,
  categories,
  conditions,
  isSubmitting = false,
  uploadProgress = 0,
  onPriceFocus,
  onPriceBlur,
  showLoadingSkeleton = false,
  loadingDuration = 1500,
  title
}: UnifiedProductFormProps) {
  const [formData, setFormData] = useState<ProductFormData>(() => ({
    ...defaultFormData,
    ...initialData
  }));
  const [isFormLoading, setIsFormLoading] = useState(showLoadingSkeleton);

  // Simulate initial loading for demonstration (create mode)
  useEffect(() => {
    if (showLoadingSkeleton && mode === 'create') {
      const timer = setTimeout(() => {
        setIsFormLoading(false);
      }, loadingDuration);
      return () => clearTimeout(timer);
    }
  }, [showLoadingSkeleton, mode, loadingDuration]);

  const handleFieldChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData, e);
  };

  const getTitle = () => {
    if (title) return title;
    return mode === 'create' ? 'Create Your Listing' : 'Edit Product';
  };

  const cardClassName = mode === 'create' 
    ? "relative z-[1] shadow-lg border-0 bg-gradient-to-br from-background to-background/50 overflow-hidden"
    : "relative z-[1] shadow-lg border overflow-hidden";

  return (
    <Card className={cardClassName}>
      {/* Animated background elements for create mode */}
      {mode === 'create' && (
        <div className="absolute inset-0 pointer-events-none">
          <motion.div
            className="absolute top-10 right-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="absolute bottom-10 left-10 w-24 h-24 bg-secondary/10 rounded-full blur-2xl"
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.2, 0.4, 0.2]
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2
            }}
          />
        </div>
      )}

      <CardHeader className="pb-6 relative z-10">
        <motion.div
          animate={mode === 'create' ? {
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
          } : {}}
          transition={mode === 'create' ? {
            duration: 5,
            repeat: Infinity,
            ease: "linear"
          } : {}}
        >
          <CardTitle className={mode === 'create' 
            ? "text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent"
            : "text-2xl font-bold"
          }>
            {getTitle()}
          </CardTitle>
        </motion.div>
      </CardHeader>
      
      <CardContent className="relative z-10">
        {isFormLoading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <FormSkeleton />
          </motion.div>
        ) : (
          <motion.form 
            onSubmit={handleSubmit} 
            className="space-y-8"
            variants={formVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Basic Product Information */}
            <motion.div variants={sectionVariants}>
              <BasicInfoSection
                data={formData}
                onChange={handleFieldChange}
                onPriceFocus={onPriceFocus}
                onPriceBlur={onPriceBlur}
                categories={categories}
                conditions={conditions}
                mode={mode}
              />
            </motion.div>

            {/* Media Upload Section */}
            <UnifiedProductMediaUpload />

            {/* Form Actions */}
            <FormActionsSection
              mode={mode}
              isSubmitting={isSubmitting}
              uploadProgress={uploadProgress}
              onDelete={onDelete}
              onCancel={onCancel}
            />
          </motion.form>
        )}
      </CardContent>
    </Card>
  );
}