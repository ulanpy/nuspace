import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/atoms/select";
import { motion } from "framer-motion";
import { Package } from "lucide-react";
import { AnimatedFormField } from "@/components/organisms/animations/AnimatedFormField";
import { useFormAnimations } from "@/hooks/useFormAnimations";

interface ProductConditionFieldProps {
  value: string;
  onChange: (value: string) => void;
  conditions: string[];
  placeholder?: string;
}

export function ProductConditionField({ 
  value, 
  onChange, 
  conditions,
  placeholder = "Select condition"
}: ProductConditionFieldProps) {
  const { handleFieldFocus, handleFieldBlur, isFieldFocused } = useFormAnimations();
  const displayConditions = ["All Conditions", "New", "Like New", "Used"];

  const handleValueChange = (newValue: string) => {
    onChange(newValue);
  };

  return (
    <div className="relative z-[2]">
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
          value={value} 
          onValueChange={handleValueChange}
        >
          <SelectTrigger 
            className="transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
            onFocus={() => handleFieldFocus('condition')}
            onBlur={handleFieldBlur}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent className="z-[50]">
            {conditions.slice(1).map((condition, index) => (
              <SelectItem key={condition} value={condition}>
                {displayConditions[index + 1]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* Hidden input to ensure condition is included in FormData */}
        <input type="hidden" name="condition" value={value} />
      </motion.div>
    </AnimatedFormField>
    </div>
  );
}