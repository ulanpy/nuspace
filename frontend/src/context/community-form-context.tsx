"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useUser } from "@/hooks/use-user";
import {
  CreateCommunityData,
  EditCommunityData,
  Community,
  CommunityCategory,
  CommunityType,
  CommunityRecruitmentStatus,
  CommunityEditableFields,
  CommunityPermissions,
} from "@/features/shared/campus/types";

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
  validateForm: () => { isValid: boolean; errors: string[] };
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
    recruitment_status: "closed" as CommunityRecruitmentStatus,
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
        recruitment_status: "closed" as CommunityRecruitmentStatus,
        recruitment_link: "",
        telegram_url: "",
        instagram_url: "",
        head: user?.user.sub || "",
        established: new Date().toISOString().split('T')[0],
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

    if (name === "recruitment_status" && value === CommunityRecruitmentStatus.closed) {
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
        recruitment_status: "closed" as CommunityRecruitmentStatus,
        head: user?.user.sub || "",
        recruitment_link: "",
        telegram_url: "",
        instagram_url: "",
        established: new Date().toISOString().split('T')[0],
      });
    }
  };

  const validateForm = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const ensureHttp = (val: string | undefined | null): string | undefined => {
      if (!val) return undefined;
      const trimmed = val.trim();
      if (!trimmed) return undefined;
      if (!/^https?:\/\//i.test(trimmed)) {
        return `https://${trimmed}`;
      }
      return trimmed;
    };
    
    // Name validation (required, 3-100 characters)
    if (!formData.name || formData.name.trim().length < 3) {
      errors.push("Community name must be at least 3 characters long");
    }
    if (formData.name && formData.name.length > 100) {
      errors.push("Community name must be no more than 100 characters long");
    }
    
    // Description validation (required, max 5000 characters)
    if (!formData.description || formData.description.trim().length === 0) {
      errors.push("Description is required");
    }
    if (formData.description && formData.description.length > 5000) {
      errors.push("Description must be no more than 5000 characters long");
    }

    // Email validation (optional field, but must be valid if provided)
    const emailValue = (formData as any).email?.trim?.() || "";
    if (emailValue.length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailValue)) {
        errors.push("Email must be a valid email address");
      }
    }
    
    // Type validation (required for create mode)
    if (!isEditMode && !(formData as CreateCommunityData).type) {
      errors.push("Community type is required");
    }
    
    // Category validation (required for create mode)
    if (!isEditMode && !(formData as CreateCommunityData).category) {
      errors.push("Community category is required");
    }
    
    // Recruitment status validation (required)
    if (!formData.recruitment_status) {
      errors.push("Recruitment status is required");
    }
    
    // Recruitment link validation (required when status is open)
    if (formData.recruitment_status === CommunityRecruitmentStatus.open) {
      const normalizedLink = ensureHttp((formData as any).recruitment_link as string);
      (formData as any).recruitment_link = normalizedLink || "";
      const link = normalizedLink;
      if (!link) {
        errors.push("Recruitment link is required when recruitment status is open");
      } else {
        try {
          const url = new URL(link);
          if (url.protocol !== "http:" && url.protocol !== "https:") {
            errors.push("Recruitment link must be a valid HTTP or HTTPS URL");
          }
        } catch {
          errors.push("Recruitment link must be a valid URL");
        }
      }
    }
    
    // Established date validation (required for create mode)
    if (!isEditMode && !(formData as CreateCommunityData).established) {
      errors.push("Established date is required");
    }
    
    // URL validation for social media links
    const validateOptionalUrl = (url: string | undefined, fieldName: string) => {
      const normalized = ensureHttp(url);
      if (normalized) {
        try {
          const validUrl = new URL(normalized);
          if (validUrl.protocol !== "http:" && validUrl.protocol !== "https:") {
            errors.push(`${fieldName} must be a valid HTTP or HTTPS URL`);
          }
        } catch {
          errors.push(`${fieldName} must be a valid URL`);
        }
      }
      // write back normalization so the submit uses it
      if (fieldName === "Telegram URL") {
        (formData as any).telegram_url = normalized as any;
      } else if (fieldName === "Instagram URL") {
        (formData as any).instagram_url = normalized as any;
      }
    };
    
    validateOptionalUrl(formData.telegram_url as any, "Telegram URL");
    validateOptionalUrl(formData.instagram_url as any, "Instagram URL");
    
    return {
      isValid: errors.length === 0,
      errors
    };
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
    validateForm,
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


