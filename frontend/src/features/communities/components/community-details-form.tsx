"use client";

import { useCommunityForm } from '@/context/community-form-context';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CommunityType, CommunityCategory } from "@/features/shared/campus/types";
import { useState, useEffect } from "react";
import { DatePicker } from "@/components/shared/date-picker";
import {
  getInstagramUrlError,
  getTelegramUrlError,
  normalizeHttpUrl,
} from "@/features/communities/utils/url-validation";

export function CommunityDetailsForm() {
  const {
    formData,
    handleInputChange,
    handleSelectChange,
    isFieldEditable,
  } = useCommunityForm();
  const [date, setDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    if ('established' in formData && formData.established) {
      const establishedDate = new Date(formData.established);
      if (!isNaN(establishedDate.getTime())) {
        setDate(establishedDate);
      } else {
        setDate(undefined);
      }
    } else {
      setDate(undefined);
    }
  }, [formData]);

  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    if (selectedDate) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      handleSelectChange("established", `${year}-${month}-${day}`);
    } else {
      handleSelectChange("established", "");
    }
  };

  const normalizedTelegramUrl = normalizeHttpUrl(formData.telegram_url);
  const telegramUrlError = normalizedTelegramUrl
    ? getTelegramUrlError(normalizedTelegramUrl)
    : undefined;
  const normalizedInstagramUrl = normalizeHttpUrl(formData.instagram_url);
  const instagramUrlError = normalizedInstagramUrl
    ? getInstagramUrlError(normalizedInstagramUrl)
    : undefined;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="flex justify-between">
          <Label htmlFor="name">Club Name <span className="text-red-500">*</span></Label>
          <span className="text-xs text-gray-500">
            {(formData.name || "").length} / 100
          </span>
        </div>
        <Input
          id="name"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          disabled={!isFieldEditable("name")}
          required
          minLength={3}
          maxLength={100}
          placeholder="Enter club name (3-100 characters)"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="type">Club Type <span className="text-red-500">*</span></Label>
          <select
            name="type"
            value={(formData as any).type || ""}
            onChange={(e) => handleSelectChange("type", e.target.value)}
            disabled={!isFieldEditable("type")}
            required
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
              {Object.values(CommunityType).map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
          </select>
        </div>
        <div>
          <Label htmlFor="category">Club Category <span className="text-red-500">*</span></Label>
          <select
            name="category"
            value={(formData as any).category || ""}
            onChange={(e) => handleSelectChange("category", e.target.value)}
            disabled={!isFieldEditable("category")}
            required
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
              {Object.values(CommunityCategory).map((category) => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
          </select>
        </div>
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          value={(formData as any).email || ""}
          onChange={handleInputChange}
          placeholder="nuspace@nu.edu.kz"
          disabled={!isFieldEditable("email")}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="telegram_url">Telegram URL</Label>
          <Input
            id="telegram_url"
            name="telegram_url"
            value={formData.telegram_url}
            onChange={handleInputChange}
            disabled={!isFieldEditable("telegram_url")}
            aria-invalid={Boolean(telegramUrlError)}
            aria-describedby={telegramUrlError ? "telegram_url-error" : undefined}
          />
          {telegramUrlError && (
            <p id="telegram_url-error" role="alert" className="mt-1 text-xs text-destructive">
              {telegramUrlError}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="instagram_url">Instagram URL</Label>
          <Input
            id="instagram_url"
            name="instagram_url"
            value={formData.instagram_url} 
            onChange={handleInputChange}
            disabled={!isFieldEditable("instagram_url")}
            aria-invalid={Boolean(instagramUrlError)}
            aria-describedby={instagramUrlError ? "instagram_url-error" : undefined}
          />
          {instagramUrlError && (
            <p id="instagram_url-error" role="alert" className="mt-1 text-xs text-destructive">
              {instagramUrlError}
            </p>
          )}
        </div>
      </div>
      {isFieldEditable("established") && (
        <div>
          <Label htmlFor="established">Established <span className="text-red-500">*</span></Label>
          <DatePicker
            id="established"
            value={date}
            onChange={handleDateSelect}
            fromDate={new Date(1900, 0, 1)}
            toDate={new Date(2030, 11, 31)}
          />
        </div>
      )}
    </div>
  );
}
