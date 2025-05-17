import { useTheme } from "@/context/theme-provider";
import { FaTelegram } from "react-icons/fa";
export function ReportButton({
  className,
  text = "Report Bug",
}: {
  className?: string;
  text?: string;
}) {
  const { theme } = useTheme();
    const isDarkTheme = theme === "dark";
  return (
    <a
      href="https://t.me/kamikadze24"
      target="_blank"
      rel="noopener noreferrer"
      className={
        className ? className : `flex items-center rounded-full first-letter px-2 duration-200 ${isDarkTheme ? 'bg-slate-700 hover:text-slate-300' : 'bg-slate-400 text-slate-100 hover:text-slate-200'}`
      }
    >

      {text}
    </a>
  );
}
