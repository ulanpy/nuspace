import { ProductNameField } from "@/features/marketplace/components/forms/fields/ProductNameField";
import { ProductDescriptionField } from "@/features/marketplace/components/forms/fields/ProductDescriptionField";
import { ProductPriceField } from "@/features/marketplace/components/forms/fields/ProductPriceField";
import { ProductCategoryField } from "@/features/marketplace/components/forms/fields/ProductCategoryField";
import { ProductConditionField } from "@/features/marketplace/components/forms/fields/ProductConditionField";

interface BasicInfoSectionProps {
  data: {
    name: string;
    description: string;
    price: number | string;
    category: string;
    condition: string;
  };
  onChange: (field: string, value: string | number) => void;
  onPriceFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onPriceBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  categories: Types.DisplayCategory[];
  conditions: string[];
  mode?: 'create' | 'edit';
}

export function BasicInfoSection({
  data,
  onChange,
  onPriceFocus,
  onPriceBlur,
  categories,
  conditions,
  mode = 'create'
}: BasicInfoSectionProps) {
  const handleFieldChange = (field: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
    onChange(field, value);
  };

  const handleSelectChange = (field: string) => (value: string) => {
    onChange(field, value);
  };

  return (
    <div className="space-y-6">
      {/* Name */}
      <ProductNameField
        value={data.name}
        onChange={handleFieldChange('name')}
        placeholder={mode === 'create' ? "What are you selling?" : "Product name"}
      />

      {/* Description */}
      <ProductDescriptionField
        value={data.description}
        onChange={handleFieldChange('description')}
        placeholder={mode === 'create' ? "Describe your item in detail..." : "Product description"}
      />
      
      {/* Price, Category, and Condition */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ProductPriceField
          value={data.price}
          onChange={handleFieldChange('price')}
          onFocus={onPriceFocus}
          onBlur={onPriceBlur}
        />
        
        <ProductCategoryField
          value={data.category}
          onChange={handleSelectChange('category')}
          categories={categories}
        />
        
        <ProductConditionField
          value={data.condition}
          onChange={handleSelectChange('condition')}
          conditions={conditions}
        />
      </div>
    </div>
  );
}