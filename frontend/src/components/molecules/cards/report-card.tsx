import { Card, CardContent } from "@/components/atoms/card";
import { useTheme } from "@/context/theme-provider";
import { FaHeadset, FaTelegram } from "react-icons/fa";

export function ReportCard() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  return (
    <Card
      className={`transform transition-transform text-center ${
        isDark
          ? "bg-gray-800 border-gray-700 "
          : "bg-white hover:bg-gray-50"
      }`}
    >
      <CardContent className="py-8 px-6 flex flex-col items-center">
        <div className="rounded-full overflow-hidden h-24 w-24 mb-5 bg-purple-600/20 flex items-center justify-center">
          <FaHeadset className="text-purple-500" size={42} />
        </div>
        <h3 className="text-xl font-semibold mb-2">Need Help?</h3>
        <p className={(`text-sm mb-4 ${isDark ? "text-gray-400" : "text-gray-500"}`)}>
          Found a bug or having issues? We're here to help. Reach out directly
          for quick assistance.
        </p>
        <a
          href="https://t.me/kamikadze24"
          className="mt-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors inline-flex items-center gap-2"
        >
          <FaTelegram size={18} />
          Contact via Telegram
        </a>
      </CardContent>
    </Card>
  );
}
