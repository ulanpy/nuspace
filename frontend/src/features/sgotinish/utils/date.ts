const ensureUtcString = (value: string): string => {
  // If the string already has timezone info (Z or +/-HH:MM), keep it
  if (/([zZ]|[+-]\d{2}:?\d{2})$/.test(value)) {
    return value;
  }

  // Otherwise assume backend sent UTC without suffix, so append Z
  return `${value}Z`;
};

export const toLocalDate = (value: Date | string): Date => {
  if (value instanceof Date) {
    return value;
  }

  return new Date(ensureUtcString(value));
};

export const toLocalISOString = (value: Date | string): string => {
  return toLocalDate(value).toLocaleString();
};


