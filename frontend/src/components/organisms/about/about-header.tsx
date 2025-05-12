import { useTheme } from "@/context/theme-provider";

export const AboutHeader = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  return (
    <div className="text-center mb-16">
      <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
        About <span className="text-indigo-500">Nuspace</span>
      </h1>
      <p
        className={`mt-6 text-xl leading-8 ${
          isDark ? "text-gray-300" : "text-gray-600"
        }`}
      >
        Unified platform for Nazarbayev University students
      </p>
    </div>
  );
};
