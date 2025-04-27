// src/contexts/ListingContext.tsx

import {
  defaultPage,
  defaultSize,
} from "@/modules/kupi-prodai/api/kupi-prodai-api";
import React, { createContext, useContext, useState } from "react";

type NewProductRequest = {
  name: string;
  description: string;
  price: number;
  category: string;
  condition: string;
  status: string;
};

type ListingContextType = {
  newListing: NewProductRequest;
  setNewListing: React.Dispatch<React.SetStateAction<NewProductRequest>>;
  uploadProgress: number;
  setUploadProgress: React.Dispatch<React.SetStateAction<number>>;
  editingListing: Types.Product | null;
  setEditingListing: React.Dispatch<React.SetStateAction<Types.Product | null>>;
  showEditModal: boolean;
  setShowEditModal: React.Dispatch<React.SetStateAction<boolean>>;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  itemsPerPage: number;
  activeTab: Types.ActiveTab;
  setActiveTab: React.Dispatch<React.SetStateAction<Types.ActiveTab>>;
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
  });
  const [editingListing, setEditingListing] = useState<Types.Product | null>(
    null
  );
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(defaultPage);
  const [itemsPerPage] = useState(defaultSize);
  const [activeTab, setActiveTab] = useState<Types.ActiveTab>("buy");
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
        searchQuery,
        setSearchQuery,
        currentPage,
        setCurrentPage,
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
