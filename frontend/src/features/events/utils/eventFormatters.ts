import { format } from "date-fns";
import type { EventPolicy } from "@/features/shared/campus/types";

export const formatEventDate = (dateString: string) => {
  const date = new Date(dateString);
  return format(date, "d MMMM");
};

export const formatEventTime = (dateString: string) => {
  const date = new Date(dateString);
  return format(date, "p");
};

export const getPolicyDisplay = (policy: EventPolicy | string) => {
  switch (policy) {
    case "open":
      return "Open Entry";
    case "registration":
      return "Registration";
    default:
      return policy;
  }
};

export const getPolicyColor = (policy: EventPolicy | string) => {
  switch (policy) {
    case "open":
      return "bg-green-100 text-green-900 border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800";
    case "registration":
      return "bg-blue-100 text-blue-900 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800";
    default:
      return "bg-gray-100 text-gray-900 border-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700";
  }
};

