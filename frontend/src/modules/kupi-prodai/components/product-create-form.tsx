import { Progress } from "@/components/atoms/progress";
import { ProductDetailsForm } from "./ProductDetailsForm";
import { ImageGalery } from "./image-galery";
import { ImageIcon, RefreshCw, Upload, Plus } from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/card";
import { FormSkeleton } from "@/components/atoms/skeleton";
import { useRef, useState, useEffect } from "react";
import { useListingState } from "@/context/ListingContext";
import { useMediaUpload } from "@/modules/media/hooks/useMediaUpload";
import { useMediaSelection } from "@/modules/media/hooks/useMediaSelection";
import { useProductForm } from "@/modules/kupi-prodai/hooks/useProductForm";
import { motion } from "framer-motion";
import { formVariants, sectionVariants } from "@/utils/animationVariants";


interface ProductCreateFormProps {
  isTelegramLinked: boolean;
  uploadProgress: number;
  handleCreate: (e: React.FormEvent<HTMLFormElement>) => void;
}


export const ProductCreateForm = ({
  isTelegramLinked,
  uploadProgress,
  handleCreate,
}: ProductCreateFormProps) => {
  const {
    isUploading,
  } = useMediaUpload();

  const {
    previewMedia,
    isDragging,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileSelect,
    removeNewMedia,
  } = useMediaSelection();

  const {
    categories,
    conditions,
    handleInputChange,
    handlePriceInputBlur,
    handlePriceInputFocus,
    handleSelectChange,
  } = useProductForm();
  const { newListing } = useListingState();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [isFormLoading, setIsFormLoading] = useState(true);

  // Simulate initial loading for demonstration
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsFormLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);



  return (
    <Card className="relative shadow-lg border-0 bg-gradient-to-br from-background to-background/50 overflow-hidden">
      {/* Animated background elements */}
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

      <CardHeader className="pb-6 relative z-10">
        <motion.div
          animate={{
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "linear"
          }}
        >
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Create Your Listing
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
            onSubmit={handleCreate} 
            className="space-y-8"
            variants={formVariants}
            initial="hidden"
            animate="visible"
          >
          {/* Product Details */}
          <motion.div variants={sectionVariants}>
            <ProductDetailsForm
              newListing={newListing}
              categories={categories}
              conditions={conditions}
              handleInputChange={(e) => handleInputChange(e)}
              handlePriceInputBlur={handlePriceInputBlur}
              handlePriceInputFocus={handlePriceInputFocus}
              handleSelectChange={handleSelectChange}
            />
          </motion.div>

          {/* Image Upload Section */}
          <motion.div className="space-y-3" variants={sectionVariants}>
            <label className="block text-sm font-medium text-foreground">
              Product Images
            </label>
            <motion.div
              ref={dropZoneRef}
              className={`relative border-2 rounded-lg p-8 cursor-pointer transition-all duration-300 overflow-hidden group ${
                isDragging 
                  ? "border-primary bg-primary/5 scale-[1.02]" 
                  : "border-dashed border-muted-foreground/25 hover:border-primary/50 hover:bg-primary/5"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              whileHover={{ scale: 1.005 }}
              whileTap={{ scale: 0.995 }}
            >

              
              <div className="flex flex-col items-center justify-center text-center space-y-4 relative z-10">
                <motion.div 
                  className={`relative p-4 rounded-full transition-colors duration-300 ${
                    isDragging ? "bg-primary/10" : "bg-muted/50"
                  }`}
                  animate={{ 
                    scale: isDragging ? [1, 1.1, 1] : 1,
                    rotate: isDragging ? [0, 5, -5, 0] : 0
                  }}
                  transition={{ duration: 0.5 }}
                >
                  <ImageIcon className={`h-8 w-8 transition-colors duration-300 ${
                    isDragging ? "text-primary" : "text-muted-foreground"
                  }`} />
                </motion.div>
                
                <div>
                  <p className="text-base font-medium mb-2">
                    {isDragging ? "Drop your images here" : "Upload product images"}
                  </p>
                  
                  <p className="text-sm text-muted-foreground mb-4">
                    Drag and drop or click to browse • PNG, JPG, GIF up to 10MB
                  </p>
                  
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      className="relative transition-all duration-200 hover:bg-primary hover:text-primary-foreground group/btn overflow-hidden"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Choose Files
                    </Button>
                  </motion.div>
                </div>
              </div>
              <input
                type="file"
                name="images"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
              />
            </motion.div>
            
            {previewMedia.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ duration: 0.3 }}
              >
                <ImageGalery
                  previewImages={previewMedia}
                  removeImage={removeNewMedia}
                />
              </motion.div>
            )}
          </motion.div>

          {/* Submit Button */}
          <motion.div variants={sectionVariants}>
            <Button
              type="submit"
              disabled={isUploading || !isTelegramLinked}
              className="w-full h-12 text-base font-medium shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
              size="lg"
            >
              {isUploading ? (
                <div className="flex items-center justify-center gap-3">
                  <RefreshCw className="animate-spin h-5 w-5" />
                  <span>Publishing... {uploadProgress}%</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Plus className="h-5 w-5" />
                  <span>Create Listing</span>
                </div>
              )}
            </Button>

            {/* Progress Bar */}
            {isUploading && (
              <motion.div
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                className="mt-3"
              >
                <Progress value={uploadProgress} className="h-2" />
              </motion.div>
            )}
          </motion.div>
        </motion.form>
        )}
      </CardContent>
    </Card>
  );
};
