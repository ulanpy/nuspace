import { FaTelegram } from "react-icons/fa";
export function ReportButton({
  className,
  text = "Report Bug",
}: {
  className?: string;
  text?: string;
}) {
  return (
    <a
      href="https://t.me/kamikadze24"
      target="_blank"
      rel="noopener noreferrer"
      className={
        className ? className : `flex items-center rounded-full hover:text-slate-300 px-2 bg-slate-700`
      }
    >

      {text}
    </a>
  );
}
