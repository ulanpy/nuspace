import { Input } from "@/components/atoms/input";
import { Textarea } from "@/components/atoms/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/atoms/select";
import { NewProductRequest } from "@/features/kupi-prodai/types";
import { motion, AnimatePresence } from "framer-motion";
import { Tag, DollarSign, Package, Zap, FileText } from "lucide-react";
import { AnimatedFormField } from "@/components/animations/AnimatedFormField";
import { useFormAnimations } from "@/hooks/useFormAnimations";
import { containerVariants, fieldVariants } from "@/utils/animationVariants";

interface ProductDetailsFormProps {
  newListing: NewProductRequest;
  categories: Types.DisplayCategory[];
  conditions: string[];
  handleInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  handlePriceInputFocus: (e: React.FocusEvent<HTMLInputElement>) => void;
  handlePriceInputBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
  handleSelectChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}
export function ProductDetailsForm({
  newListing,
  categories,
  conditions,
  handleInputChange,
  handlePriceInputFocus,
  handlePriceInputBlur,
  handleSelectChange,
}: ProductDetailsFormProps) {
  const displayConditions = ["All Conditions", "New", "Like New", "Used"];
  const { handleFieldFocus, handleFieldBlur, isFieldFocused } = useFormAnimations();

  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Name */}
      <motion.div variants={fieldVariants}>
        <AnimatedFormField
          label="Product Name"
          icon={<Tag className="h-4 w-4 text-primary" />}
          fieldName="name"
          isFocused={isFieldFocused('name')}
          onFocus={() => handleFieldFocus('name')}
          onBlur={handleFieldBlur}
        >
          <Textarea
            id="name"
            name="name"
            value={newListing.name}
            onChange={handleInputChange}
            onFocus={() => handleFieldFocus('name')}
            onBlur={handleFieldBlur}
            required
            className="resize-none min-h-[60px] transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
            placeholder="What are you selling?"
          />
        </AnimatedFormField>
      </motion.div>

      {/* Description */}
      <motion.div className="relative" variants={fieldVariants}>
        <AnimatedFormField
          label="Description"
          icon={<FileText className="h-4 w-4 text-primary" />}
          fieldName="description"
          isFocused={isFieldFocused('description')}
          onFocus={() => handleFieldFocus('description')}
          onBlur={handleFieldBlur}
        >
          <Textarea
            id="description"
            name="description"
            value={newListing.description}
            onChange={handleInputChange}
            onFocus={() => handleFieldFocus('description')}
            onBlur={handleFieldBlur}
            rows={4}
            className="resize-none transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
            placeholder="Describe your item in detail..."
          />
        </AnimatedFormField>
        
        {/* Character count animation */}
        <AnimatePresence>
          {isFieldFocused('description') && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute -bottom-6 right-0 text-xs text-muted-foreground"
            >
              {newListing.description.length} characters
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      
      {/* Price, Category, and Condition */}
      <motion.div 
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        variants={fieldVariants}
      >
        <div className="relative">
          <AnimatedFormField
            label="Price (₸)"
            icon={<DollarSign className="h-4 w-4 text-green-500" />}
            fieldName="price"
            isFocused={isFieldFocused('price')}
            onFocus={() => handleFieldFocus('price')}
            onBlur={handleFieldBlur}
            focusColor="green-500"
          >
            <Input
              type="number"
              id="price"
              name="price"
              value={newListing.price === 0 ? "" : newListing.price}
              onChange={handleInputChange}
              onFocus={(e) => {
                handleFieldFocus('price');
                handlePriceInputFocus(e);
              }}
              onBlur={(e) => {
                handleFieldBlur();
                handlePriceInputBlur(e);
              }}
              min="0"
              step="1"
              required
              className="transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="0"
            />
          </AnimatedFormField>
          
          {/* Animated currency indicator */}
          <AnimatePresence>
            {isFieldFocused('price') && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
              >
                KZT
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <AnimatedFormField
          label="Category"
          icon={<Zap className="h-4 w-4 text-blue-500" />}
          fieldName="category"
          isFocused={isFieldFocused('category')}
          onFocus={() => handleFieldFocus('category')}
          onBlur={handleFieldBlur}
          showFocusIndicator={false}
        >
          <motion.div whileHover={{ scale: 1.01 }}>
            <Select 
              value={newListing.category} 
              onValueChange={(value) => {
                const event = {
                  target: { name: 'category', value }
                } as React.ChangeEvent<HTMLSelectElement>;
                handleSelectChange(event);
              }}
            >
              <SelectTrigger 
                className="transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                onFocus={() => handleFieldFocus('category')}
                onBlur={handleFieldBlur}
              >
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.slice(1).map((category, index) => (
                  <SelectItem key={category.title} value={category.title}>
                    {categories[index + 1].title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Hidden input to ensure category is included in FormData */}
            <input type="hidden" name="category" value={newListing.category} />
          </motion.div>
        </AnimatedFormField>
        
        <AnimatedFormField
          label="Condition"
          icon={<Package className="h-4 w-4 text-purple-500" />}
          fieldName="condition"
          isFocused={isFieldFocused('condition')}
          onFocus={() => handleFieldFocus('condition')}
          onBlur={handleFieldBlur}
          showFocusIndicator={false}
        >
          <motion.div whileHover={{ scale: 1.01 }}>
            <Select 
              value={newListing.condition} 
              onValueChange={(value) => {
                const event = {
                  target: { name: 'condition', value }
                } as React.ChangeEvent<HTMLSelectElement>;
                handleSelectChange(event);
              }}
            >
              <SelectTrigger 
                className="transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                onFocus={() => handleFieldFocus('condition')}
                onBlur={handleFieldBlur}
              >
                <SelectValue placeholder="Select condition" />
              </SelectTrigger>
              <SelectContent>
                {conditions.slice(1).map((condition, index) => (
                  <SelectItem key={condition} value={condition}>
                    {displayConditions[index + 1]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Hidden input to ensure condition is included in FormData */}
            <input type="hidden" name="condition" value={newListing.condition} />
          </motion.div>
        </AnimatedFormField>
      </motion.div>
    </motion.div>
  );
}
