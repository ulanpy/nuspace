/**
 * Maps backend role names to display names
 */
export const mapRoleToDisplayName = (role: string): string => {
  switch (role) {
    case "boss":
      return "head";
    case "capo":
      return "executive";
    case "soldier":
      return "member";
    default:
      return role;
  }
};
