import { useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "./theme-provider";

export interface PaginationProps {
  length: number;
  currentPage: number;
  onChange: (page: number) => void;
  className?: string;
}

export const Pagination = ({
  length,
  currentPage,
  onChange,
}: PaginationProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  const isDarkTheme = theme === "dark";
  const getPages = () => {
    const pages = [];

    if (length <= 10) {
      for (let i = 1; i <= length; i++) {
        pages.push(i);
      }
    } else {
      // Алғашқы беттер
      if (currentPage <= 6) {
        for (let i = 1; i <= 10; i++) pages.push(i);
        pages.push("...", length);
      }
      // Соңғы беттер
      else if (currentPage >= length - 5) {
        pages.push(1, "...");
        for (let i = length - 9; i <= length; i++) pages.push(i);
      }
      // Ортаңғы беттер
      else {
        pages.push(1, "...");
        for (let i = currentPage - 4; i <= currentPage + 4; i++) {
          pages.push(i);
        }
        pages.push("...", length);
      }
    }

    return pages;
  };

  const handleChange = (page: number) => {
    if (page !== currentPage) {
      const currentParams = new URLSearchParams(location.search);
      currentParams.set("page", page.toString());
      onChange(page);
      navigate(`${location.pathname}?${currentParams.toString()}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
      {getPages().map((page, index) => (
        <button
          key={index}
          onClick={() => typeof page === "number" && handleChange(page)}
          disabled={page === "..."}
          className={`px-3 py-1 rounded border
            ${
              page === currentPage
                ? isDarkTheme
                  ? "bg-slate-800 text-white border-slate-700"
                  : "bg-slate-100 text-slate-900 border-slate-200"
                : isDarkTheme
                ? "text-slate-400 hover:bg-slate-800/70 hover:text-slate-200"
                : "text-slate-500 hover:bg-slate-200/70 hover:text-slate-800"
            }
            ${page === "..." ? "cursor-default opacity-50" : ""}
            `}
        >
          {page}
        </button>
      ))}
    </div>
  );
};
