import { useTheme } from "@/context/theme-provider";

export const MessionSection = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  return (
    <div
      className={`rounded-2xl p-8 mb-16 ${
        isDark ? "bg-gray-800" : "bg-white"
      } shadow-xl`}
    >
      <h2 className="text-2xl font-bold mb-6">Our Mission</h2>
      <p className={`mb-4 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
        NU Space is a single platform for Nazarbayev University students. Our
        goal is to simplify the daily life of students and make campus life more
        comfortable.
      </p>
      <p className={`${isDark ? "text-gray-300" : "text-gray-600"}`}>
        We strive to create a reliable platform that will allow Every Student of
        Nazarbayev University to make the most of their time, easily find the
        necessary things and keep abreast of interesting events and
        opportunities within the University.
      </p>
    </div>
  );
};
