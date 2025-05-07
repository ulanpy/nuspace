import { ReportButton } from "@/components/molecules/report-button";
import { useTheme } from "@/context/theme-provider";
export const ContactSection = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  return (
    <div
      className={`rounded-2xl p-8 ${
        isDark ? "bg-gray-800" : "bg-white"
      } shadow-xl text-center`}
    >
      <h2 className="text-2xl font-bold mb-4">Report a Problem</h2>
      <p className={`mb-6 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
        Found a bug or having issues? We're here to help. Reach out directly for
        quick assistance.
      </p>
      <ReportButton
        text="Contact via Telegram"
        className="inline-flex items-center px-6 py-3 rounded-lg text-white bg-indigo-600 hover:bg-indigo-700
                  transition duration-300 ease-in-out transform"
      />
      <p
        className={`mt-4 text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}
      >
        We appreciate your feedback and work quickly to resolve any issues.
      </p>
    </div>
  );
};
