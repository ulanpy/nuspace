// src/contexts/ListingContext.tsx

import {
  defaultSize,
} from "@/features/kupi-prodai/api/kupiProdaiApi";
import React, { createContext, useContext, useState } from "react";
import { Product } from "@/features/kupi-prodai/types";
import { NewProductRequest } from "@/features/kupi-prodai/types";
import { ActiveTab } from "@/features/kupi-prodai/types";

type ListingContextType = {
  newListing: NewProductRequest;
  setNewListing: React.Dispatch<React.SetStateAction<NewProductRequest>>;
  uploadProgress: number;
  setUploadProgress: React.Dispatch<React.SetStateAction<number>>;
  editingListing: Product | null;
  setEditingListing: React.Dispatch<React.SetStateAction<Product | null>>;
  showEditModal: boolean;
  setShowEditModal: React.Dispatch<React.SetStateAction<boolean>>;
  itemsPerPage: number;
  activeTab: ActiveTab;
  setActiveTab: React.Dispatch<React.SetStateAction<ActiveTab>>;
};

const ListingContext = createContext<ListingContextType | undefined>(undefined);

export const ListingProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [newListing, setNewListing] = useState<NewProductRequest>({
    name: "",
    description: "",
    price: 0,
    category: "books",
    condition: "new",
    status: "active",
    user_sub: "",
  });
  const [editingListing, setEditingListing] = useState<Product | null>(
    null,
  );

  const [uploadProgress, setUploadProgress] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);

  const [itemsPerPage] = useState(defaultSize);
  const [activeTab, setActiveTab] = useState<ActiveTab>("buy");
  return (
    <ListingContext.Provider
      value={{
        newListing,
        setNewListing,
        uploadProgress,
        setUploadProgress,
        editingListing,
        setEditingListing,
        showEditModal,
        setShowEditModal,
        itemsPerPage,
        activeTab,
        setActiveTab,
      }}
    >
      {children}
    </ListingContext.Provider>
  );
};

// Hook to use in components
export const useListingState = () => {
  const context = useContext(ListingContext);
  if (!context) {
    throw new Error("useListingState must be used within a ListingProvider");
  }
  return context;
};
