import { useCommunityForm } from "@/context/CommunityFormContext";
import { Label } from "@/components/atoms/label";
import { Textarea } from "@/components/atoms/textarea";

export function CommunityDescription() {
  const { formData, handleInputChange, isFieldEditable } = useCommunityForm();

  return (
    <div>
      <Label htmlFor="description">Description</Label>
      <Textarea
        id="description"
        name="description"
        value={formData.description}
        onChange={handleInputChange}
        disabled={!isFieldEditable("description")}
        rows={4}
      />
    </div>
  );
}

