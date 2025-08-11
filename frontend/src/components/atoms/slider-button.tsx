import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTheme } from "../../context/ThemeProviderContext";

interface SliderButtonProps {
  direction: "left" | "right";
  onClick: () => void;
}

export const SliderButton = ({ direction, onClick }: SliderButtonProps) => {
  const { theme } = useTheme();
  const isDarkTheme = theme === "dark";

  return (
    <button
      onClick={onClick}
      className={`absolute ${
        direction === "left" ? "left-0" : "right-0"
      } top-1/2 -translate-y-1/2 z-10 p-2 rounded-full ${
        isDarkTheme
          ? "bg-black/50 text-white hover:bg-black/70"
          : "bg-white/70 text-black hover:bg-white/90 shadow-md"
      }`}
    >
      {direction === "left" ? <ChevronLeft /> : <ChevronRight />}
    </button>
  );
};
