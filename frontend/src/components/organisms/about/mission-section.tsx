import { useTheme } from "@/context/ThemeProviderContext";

export const MessionSection = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  return (
    <div
      className={`rounded-2xl p-8 mb-16 ${
        isDark ? "bg-gray-800" : "bg-white"
      } shadow-md`}
    >
      <h2 className="text-2xl font-bold mb-6">Mission</h2>
      <p className={`mb-4 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
        Nuspace is a single platform for Nazarbayev University students. Our
        goal is to simplify the daily life of students and make campus life more
        comfortable.
      </p>
      <p className={`${isDark ? "text-gray-300" : "text-gray-600"}`}>
        We strive to create a reliable platform that will allow every student of
        Nazarbayev University to make the most of their time, easily find the
        necessary things and keep abreast of interesting events and
        opportunities within the university.
      </p>
    </div>
  );
};
