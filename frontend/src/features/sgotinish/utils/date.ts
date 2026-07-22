/** Parse API datetime (ISO with offset / Z) to a Date for local display. */
export const toLocalDate = (value: Date | string): Date => {
  return value instanceof Date ? value : new Date(value);
};
