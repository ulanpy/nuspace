import { Input } from "@/components/atoms/input";

interface ProductInfoProps {
  newListing: Types.NewProductRequest;
  categories: Types.DisplayCategory[];
  conditions: string[];
  handleInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  handlePriceInputFocus: (e: React.FocusEvent<HTMLInputElement>) => void;
  handlePriceInputBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
  handleSelectChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}
export function ProductInfo({
  newListing,
  categories,
  conditions,
  handleInputChange,
  handlePriceInputFocus,
  handlePriceInputBlur,
  handleSelectChange,
}: ProductInfoProps) {
  const displayConditions = ["All Conditions", "New", "Used"];
  return (
    <>
      {/* Name */}
      <div className="space-y-2">
        <label htmlFor="name" className="block text-sm font-medium">
          Name
        </label>
        <Input
          type="text"
          id="name"
          name="name"
          value={newListing.name}
          onChange={handleInputChange}
          required
          className="bg-background text-foreground"
          placeholder="What are you selling?"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label htmlFor="description" className="block text-sm font-medium">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={newListing.description}
          onChange={handleInputChange}
          rows={3}
          className="w-full p-2 border rounded-md bg-background text-foreground"
          placeholder="Describe your item..."
        />
      </div>
      {/* Price, Category, and Condition */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label htmlFor="price" className="block text-sm font-medium">
            Price (₸)
          </label>
          <Input
            type="number"
            id="price"
            name="price"
            value={newListing.price === 0 ? "" : newListing.price}
            onChange={handleInputChange}
            onFocus={handlePriceInputFocus}
            onBlur={handlePriceInputBlur}
            min="0"
            step="1"
            required
            className="bg-background text-foreground"
            placeholder="0"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="category" className="block text-sm font-medium">
            Category
          </label>
          <select
            id="category"
            name="category"
            value={newListing.category}
            onChange={handleSelectChange}
            className="w-full p-2 border rounded-md bg-background text-foreground"
            required
          >
            {categories.slice(1).map((category, index) => (
              <option key={category.title} value={category.title}>
                {categories[index + 1].title}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label htmlFor="condition" className="block text-sm font-medium">
            Condition
          </label>
          <select
            id="condition"
            name="condition"
            value={newListing.condition}
            onChange={handleSelectChange}
            className="w-full p-2 border rounded-md bg-background text-foreground"
            required
          >
            {conditions.slice(1).map((condition, index) => (
              <option key={condition} value={condition}>
                {displayConditions[index + 1]}
              </option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
}
