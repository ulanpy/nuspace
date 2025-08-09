import React, { createContext, useContext, useState, useEffect } from "react";
import { useUser } from "@/hooks/use-user";
import {
  CreateCommunityData,
  EditCommunityData,
  Community,
  CommunityCategory,
  CommunityType,
  RecruitmentStatus,
  CommunityEditableFields,
  CommunityPermissions,
} from "@/features/campuscurrent/types/types";

interface CommunityFormContextType {
  formData: CreateCommunityData | EditCommunityData;
  setFormData: (data: CreateCommunityData | EditCommunityData) => void;
  isEditMode: boolean;
  community?: Community;
  permissions?: CommunityPermissions;
  handleInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  handleSelectChange: (name: string, value: string) => void;
  isFieldEditable: (fieldName: string) => boolean;
  resetForm: () => void;
}

const CommunityFormContext = createContext<
  CommunityFormContextType | undefined
>(undefined);

interface CommunityFormProviderProps {
  children: React.ReactNode;
  isEditMode: boolean;
  community?: Community;
  permissions?: CommunityPermissions;
}

export function CommunityFormProvider({
  children,
  isEditMode,
  community,
  permissions,
}: CommunityFormProviderProps) {
  const { user } = useUser();

  const [formData, setFormData] = useState<
    CreateCommunityData | EditCommunityData
  >({
    name: "",
    description: "",
    category: "academic" as CommunityCategory,
    type: "club" as CommunityType,
    email: "",
    recruitment_status: "open" as RecruitmentStatus,
    recruitment_link: "",
    telegram_url: "",
    instagram_url: "",
    head: user?.user.sub || "",
    established: "",
  });

  useEffect(() => {
    if (isEditMode && community) {
      setFormData({
        name: community.name,
        description: community.description,
        category: community.category,
        type: community.type,
        email: community.email || "",
        recruitment_status: community.recruitment_status,
        recruitment_link: community.recruitment_link || "",
        telegram_url: community.telegram_url,
        instagram_url: community.instagram_url,
        head: community.head,
        established: community.established,
      });
    } else if (!isEditMode) {
      setFormData({
        name: "",
        description: "",
        category: "academic" as CommunityCategory,
        type: "club" as CommunityType,
        email: "",
        recruitment_status: "open" as RecruitmentStatus,
        recruitment_link: "",
        telegram_url: "",
        instagram_url: "",
        head: user?.user.sub || "",
        established: new Date().toISOString(),
      });
    }
  }, [isEditMode, community, user]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (
      isEditMode &&
      permissions &&
      !permissions.editable_fields.includes(name as CommunityEditableFields)
    ) {
      return;
    }
    setFormData({ ...formData, [name]: value });
  };

  const handleSelectChange = (name: string, value: string) => {
    if (
      isEditMode &&
      permissions &&
      !permissions.editable_fields.includes(name as CommunityEditableFields)
    ) {
      return;
    }
    const updatedData: CreateCommunityData | EditCommunityData = {
      ...formData,
      [name]: value,
    } as CreateCommunityData | EditCommunityData;

    if (name === "recruitment_status" && value === RecruitmentStatus.closed) {
      (updatedData as any).recruitment_link = "";
    }

    setFormData(updatedData);
  };

  const isFieldEditable = (fieldName: string): boolean => {
    if (!isEditMode) return true;
    if (!permissions) return false;
    return permissions.editable_fields.includes(fieldName as CommunityEditableFields);
  };

  const resetForm = () => {
    if (!isEditMode) {
      setFormData({
        name: "",
        description: "",
        category: "academic" as CommunityCategory,
        type: "club" as CommunityType,
        email: "",
        recruitment_status: "open" as RecruitmentStatus,
        head: user?.user.sub || "",
        recruitment_link: "",
        telegram_url: "",
        instagram_url: "",
        established: new Date().toISOString(),
      });
    }
  };

  const contextValue: CommunityFormContextType = {
    formData,
    setFormData,
    isEditMode,
    community,
    permissions,
    handleInputChange,
    handleSelectChange,
    isFieldEditable,
    resetForm,
  };

  return (
    <CommunityFormContext.Provider value={contextValue}>
      {children}
    </CommunityFormContext.Provider>
  );
}

export function useCommunityForm() {
  const context = useContext(CommunityFormContext);
  if (context === undefined) {
    throw new Error(
      "useCommunityForm must be used within a CommunityFormProvider"
    );
  }
  return context;
}


