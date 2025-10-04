import { Input } from "@/components/atoms/input";
import { DollarSign } from "lucide-react";
import { AnimatedFormField } from "@/components/organisms/animations/AnimatedFormField";
import { useFormAnimations } from "@/hooks/useFormAnimations";

interface ProductPriceFieldProps {
  value: number | string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  currency?: string;
  placeholder?: string;
  required?: boolean;
}

export function ProductPriceField({ 
  value, 
  onChange, 
  onFocus,
  onBlur,
  currency = "KZT",
  placeholder = "0",
  required = true
}: ProductPriceFieldProps) {
  const { handleFieldFocus, handleFieldBlur, isFieldFocused } = useFormAnimations();

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    handleFieldFocus('price');
    onFocus?.(e);
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    handleFieldBlur();
    onBlur?.(e);
  };

  return (
    <div className="relative z-[2]">
      <AnimatedFormField
        label={`Price (${currency === "KZT" ? "₸" : currency})`}
        icon={<DollarSign className="h-4 w-4 text-green-500" />}
        fieldName="price"
        isFocused={isFieldFocused('price')}
        onFocus={() => handleFieldFocus('price')}
        onBlur={handleFieldBlur}
        focusColor="green-500"
      >
        <Input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          id="price"
          name="price"
          value={value === 0 ? "" : value}
          onChange={onChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          required={required}
          className="transition-colors duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
          placeholder={placeholder}
        />
      </AnimatedFormField>
    </div>
  );
}