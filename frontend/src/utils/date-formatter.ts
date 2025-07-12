/**
 * Formats a date in a user-friendly way based on how recent it is
 * @param dateString ISO date string to format
 * @returns Formatted date string
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);

  date.setHours(date.getHours() + 5);

  const now = new Date();

  // Convert to local time
  const localDate = new Date(date.getTime());

  // Calculate time difference in milliseconds
  const diffMs = now.getTime() - localDate.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  // Format time for display (e.g., "3:45 PM")
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  // Format date for display (e.g., "Apr 16")
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  // Check if the date is from the same day
  const isSameDay = (date1: Date, date2: Date): boolean => {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  };

  // Check if the date is from yesterday
  const isYesterday = (date: Date): boolean => {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    return isSameDay(date, yesterday);
  };

  // Format based on how recent the date is
  if (diffSeconds < 60) {
    return "just now";
  } else if (diffMinutes < 60) {
    return `${diffMinutes} ${diffMinutes === 1 ? "minute" : "minutes"} ago`;
  } else if (isSameDay(localDate, now)) {
    return `today at ${formatTime(localDate)}`;
  } else if (isYesterday(localDate)) {
    return `yesterday at ${formatTime(localDate)}`;
  } else if (diffDays < 7) {
    return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} ${months === 1 ? "month" : "months"} ago`;
  } else {
    const years = Math.floor(diffDays / 365);
    return `${years} ${years === 1 ? "year" : "years"} ago`;
  }
}

/**
 * Formats a date with additional context based on how recent it is
 * @param dateString ISO date string to format
 * @returns Formatted date string with context
 */
export function formatDateWithContext(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();

  date.setHours(date.getHours() + 5);

  // Convert to local time
  const localDate = new Date(date.getTime());

  // Calculate time difference in milliseconds
  const diffMs = now.getTime() - localDate.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  // Format time for display (e.g., "3:45 PM")
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  // Format date for display (e.g., "Apr 16, 2025")
  const formatFullDate = (date: Date): string => {
    return date.toLocaleDateString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Check if the date is from the same day
  const isSameDay = (date1: Date, date2: Date): boolean => {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  };

  // Check if the date is from yesterday
  const isYesterday = (date: Date): boolean => {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    return isSameDay(date, yesterday);
  };

  // Format based on how recent the date is
  if (diffSeconds < 60) {
    return "Listed just now";
  } else if (diffMinutes < 60) {
    return `Listed ${diffMinutes} ${diffMinutes === 1 ? "minute" : "minutes"} ago`;
  } else if (isSameDay(localDate, now)) {
    return `Listed today at ${formatTime(localDate)}`;
  } else if (isYesterday(localDate)) {
    return `Listed yesterday at ${formatTime(localDate)}`;
  } else if (diffDays < 7) {
    return `Listed ${diffDays} ${diffDays === 1 ? "day" : "days"} ago on ${formatFullDate(localDate)}`;
  } else {
    return `Listed on ${formatFullDate(localDate)}`;
  }
}
