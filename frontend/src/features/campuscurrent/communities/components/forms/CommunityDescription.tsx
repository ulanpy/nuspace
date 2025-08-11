import { useCommunityForm } from "@/context/CommunityFormContext";
import { Label } from "@/components/atoms/label";
import { Textarea } from "@/components/atoms/textarea";

export function CommunityDescription() {
  const { formData, handleInputChange, isFieldEditable } = useCommunityForm();

  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <Label htmlFor="description">Description</Label>
        <span className="text-xs text-gray-500">
          {(formData.description || "").length} / 1000
        </span>
      </div>
      <Textarea
        id="description"
        name="description"
        value={formData.description}
        onChange={handleInputChange}
        disabled={!isFieldEditable("description")}
        rows={4}
        maxLength={1000}
        placeholder="Enter community description"
      />
    </div>
  );
}

