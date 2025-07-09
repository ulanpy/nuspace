import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/atoms/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select";
import { Label } from "@/components/atoms/label";
import { Input } from "@/components/atoms/input";
import { Button } from "@/components/atoms/button";
import { ImageIcon, Save, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Textarea } from "@/components/atoms/textarea";
interface ProductFormProps {
  product: {
    id?: number;
    name: string;
    description: string;
    price: number;
    category: string;
    seller: string;
    status: string;
    quantity: number;
    images: { id: number; url: string; main: boolean }[];
  };
  handleSave: (e: React.FormEvent) => void;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  handleSelectChange: (name: string, value: string) => void;
  setMainImage: (imageId: number) => void;
  removeImage: (imageId: number) => void;
  simulateImageUpload: () => void;
  isUploading: boolean;
  isNewProduct: boolean;
  handleDelete: () => void;
}

export const ProductForm = ({
  product,
  handleSave,
  handleInputChange,
  handleSelectChange,
  setMainImage,
  removeImage,
  simulateImageUpload,
  isUploading,
  isNewProduct,
  handleDelete,
}: ProductFormProps) => {
  const navigate = useNavigate();
  return (
    <form onSubmit={handleSave}>
      <Tabs defaultValue="details" className="space-y-6">
        <TabsList>
          <TabsTrigger value="details">Product Details</TabsTrigger>
          <TabsTrigger value="images">Images</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Enter the basic details about the product.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={product.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    step="0.01"
                    value={product.price}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  rows={4}
                  value={product.description}
                  onChange={handleInputChange}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={product.category}
                    onValueChange={(value) =>
                      handleSelectChange("category", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Electronics">Electronics</SelectItem>
                      <SelectItem value="Furniture">Furniture</SelectItem>
                      <SelectItem value="Fashion">Fashion</SelectItem>
                      <SelectItem value="Sports">Sports</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={product.status}
                    onValueChange={(value) =>
                      handleSelectChange("status", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                      <SelectItem value="Draft">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity in Stock</Label>
                  <Input
                    id="quantity"
                    name="quantity"
                    type="number"
                    value={product.quantity}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="seller">Seller</Label>
                <Input
                  id="seller"
                  name="seller"
                  value={product.seller}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="images">
          <Card>
            <CardHeader>
              <CardTitle>Product Images</CardTitle>
              <CardDescription>
                Upload and manage product images. The first image will be used
                as the main product image.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {product.images.map((image) => (
                  <div
                    key={image.id}
                    className={`relative rounded-md overflow-hidden border ${
                      image.main ? "ring-2 ring-blue-500" : ""
                    }`}
                  >
                    <img
                      src={image.url}
                      alt="Product"
                      className="h-40 w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all flex items-center justify-center opacity-0 hover:opacity-100">
                      <div className="flex gap-2">
                        {!image.main && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setMainImage(image.id)}
                          >
                            Set Main
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => removeImage(image.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {image.main && (
                      <div className="absolute top-2 left-2 rounded-full bg-blue-500 text-white px-2 py-1 text-xs">
                        Main
                      </div>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={simulateImageUpload}
                  disabled={isUploading}
                  className="h-40 rounded-md border-2 border-dashed flex flex-col items-center justify-center hover:bg-gray-50 transition-colors"
                >
                  {isUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
                      <p className="text-sm text-gray-500 mt-2">Uploading...</p>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="h-10 w-10 text-gray-400" />
                      <p className="text-sm text-gray-500 mt-2">Upload Image</p>
                    </>
                  )}
                </button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex items-center justify-between mt-6">
        {!isNewProduct && (
          <Button type="button" variant="destructive" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Product
          </Button>
        )}
        <div className="flex gap-3 ml-auto">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/admin/products")}
          >
            Cancel
          </Button>
          <Button type="submit">
            <Save className="h-4 w-4 mr-2" />
            {isNewProduct ? "Create Product" : "Save Changes"}
          </Button>
        </div>
      </div>
    </form>
  );
};
