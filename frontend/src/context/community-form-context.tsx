"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useUser } from "@/hooks/use-user";
import {
  CreateCommunityData,
  EditCommunityData,
  Community,
  CommunityCategory,
  CommunityType,
  CommunityEditableFields,
  CommunityPermissions,
} from "@/features/shared/campus/types";
import {
  getInstagramUrlError,
  getTelegramUrlError,
  normalizeHttpUrl,
} from "@/features/communities/utils/url-validation";
import { formatLocalDate } from "@/components/shared/date-picker";

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
        telegram_url: "",
        instagram_url: "",
        head: user?.user.sub || "",
        established: formatLocalDate(new Date()),
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
    setFormData((currentFormData) => ({ ...currentFormData, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    if (
      isEditMode &&
      permissions &&
      !permissions.editable_fields.includes(name as CommunityEditableFields)
    ) {
      return;
    }
    setFormData({
      ...formData,
      [name]: value,
    } as CreateCommunityData | EditCommunityData);
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
        head: user?.user.sub || "",
        telegram_url: "",
        instagram_url: "",
        established: formatLocalDate(new Date()),
      });
    }
  };

  const validateForm = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    if (!formData.name || formData.name.trim().length < 3) {
      errors.push("Community name must be at least 3 characters long");
    }
    if (formData.name && formData.name.length > 100) {
      errors.push("Community name must be no more than 100 characters long");
    }

    if (!formData.description || formData.description.trim().length === 0) {
      errors.push("Description is required");
    }
    if (formData.description && formData.description.length > 5000) {
      errors.push("Description must be no more than 5000 characters long");
    }

    const emailValue = (formData as any).email?.trim?.() || "";
    if (emailValue.length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailValue)) {
        errors.push("Email must be a valid email address");
      }
    }

    if (!isEditMode && !(formData as CreateCommunityData).type) {
      errors.push("Community type is required");
    }

    if (!isEditMode && !(formData as CreateCommunityData).category) {
      errors.push("Community category is required");
    }

    if (!isEditMode && !(formData as CreateCommunityData).established) {
      errors.push("Established date is required");
    }

    const validateOptionalUrl = (
      url: string | undefined,
      fieldName: string,
      getUrlError: (value: string) => string | undefined,
    ) => {
      const normalized = normalizeHttpUrl(url);
      const urlError = normalized ? getUrlError(normalized) : undefined;
      if (urlError) {
        errors.push(`${fieldName}: ${urlError}`);
      }
    };

    validateOptionalUrl(formData.telegram_url, "Telegram URL", getTelegramUrlError);
    validateOptionalUrl(formData.instagram_url, "Instagram URL", getInstagramUrlError);

    return {
      isValid: errors.length === 0,
      errors,
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
