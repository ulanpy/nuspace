import { useTheme } from "@/context/ThemeProviderContext";

const snowFlag = import.meta.env.VITE_ENABLE_SNOWFALL;

// Toggle for temporary New Year snow effect. Default on; set VITE_ENABLE_SNOWFALL=false to disable.
export const ENABLE_SNOWFALL =
  snowFlag === undefined ? true : snowFlag === "true";

export const useSnowEnabled = () => {
  const { theme } = useTheme();
  return ENABLE_SNOWFALL && theme === "dark";
};
