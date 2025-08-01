"use client";

import { Input } from "@/components/atoms/input";

interface EditListingFormProps {
    newListing: Types.NewProductRequest;
    categories: Types.DisplayCategory[];
    conditions: string[];
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    handlePriceInputFocus: (e: React.FocusEvent<HTMLInputElement>) => void;
    handlePriceInputBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
    handleSelectChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    displayConditions: string[];
}

export function EditListingForm({
    newListing,
    categories,
    conditions,
    handleInputChange,
    handlePriceInputFocus,
    handlePriceInputBlur,
    handleSelectChange,
    displayConditions
}: EditListingFormProps) {
    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <label
                    htmlFor="edit-name"
                    className="block text-sm font-medium"
                >
                    Name
                </label>
                <Input
                    type="text"
                    id="edit-name"
                    name="name"
                    value={newListing.name}
                    onChange={handleInputChange}
                    required
                    className="bg-background text-foreground"
                />
            </div>
            <div className="space-y-2">
                <label
                    htmlFor="edit-description"
                    className="block text-sm font-medium"
                >
                    Description
                </label>
                <textarea
                    id="edit-description"
                    name="description"
                    value={newListing.description}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full p-2 border rounded-md bg-background text-foreground"
                />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <label
                        htmlFor="edit-price"
                        className="block text-sm font-medium"
                    >
                        Price (₸)
                    </label>
                    <Input
                        type="number"
                        id="edit-price"
                        name="price"
                        value={newListing.price === 0 ? "" : newListing.price}
                        onChange={handleInputChange}
                        onFocus={handlePriceInputFocus}
                        onBlur={handlePriceInputBlur}
                        min="0"
                        step="1"
                        required
                        className="bg-background text-foreground"
                    />
                </div>
                <div className="space-y-2">
                    <label
                        htmlFor="edit-category"
                        className="block text-sm font-medium"
                    >
                        Category
                    </label>
                    <select
                        id="edit-category"
                        name="category"
                        value={newListing.category}
                        onChange={handleSelectChange}
                        className="w-full p-2 border rounded-md bg-background text-foreground"
                    >
                        {categories.slice(1).map((category, index) => (
                            <option key={category.title} value={category.title}>
                                {categories[index + 1].title}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="space-y-2">
                    <label
                        htmlFor="edit-condition"
                        className="block text-sm font-medium"
                    >
                        Condition
                    </label>
                    <select
                        id="edit-condition"
                        name="condition"
                        value={newListing.condition}
                        onChange={handleSelectChange}
                        className="w-full p-2 border rounded-md bg-background text-foreground"
                    >
                        {conditions.slice(1).map((condition, index) => (
                            <option key={condition} value={condition}>
                                {displayConditions[index + 1]}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
} 