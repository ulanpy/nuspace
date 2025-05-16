import { useListingState } from "@/context/listing-context";
import { productCategories} from "@/data/product";

export const useProduct = () => {
  const { setNewListing } = useListingState();
  const conditions = ["All Conditions", "new", "used"];
  const categories = productCategories
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    if (name === "price") {
      // Handle price input specially to avoid leading zeros and negative values
      const numValue =
        value === "" ? 0 : Math.max(0, Number.parseInt(value, 10));
      setNewListing((prev) => ({ ...prev, [name]: numValue }));
    } else {
      setNewListing((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handlePriceInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Clear the input when it's focused and the value is 0
    if (e.target.value === "0") {
      e.target.value = "";
    }
  };

  const handlePriceInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // If the input is empty when blurred, set it back to 0
    if (e.target.value === "") {
      setNewListing((prev) => ({ ...prev, price: 0 }));
    }
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewListing((prev) => ({ ...prev, [name]: value }));
  };

  return {
    conditions,
    categories,
    handleInputChange,
    handleSelectChange,
    handlePriceInputBlur,
    handlePriceInputFocus,
  };
};
