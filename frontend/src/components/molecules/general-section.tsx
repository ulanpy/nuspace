import { useNavigate } from "react-router-dom";
import { Button } from "../atoms/button";

export function GeneralSection({
  title,
  link,
  children,
}: {
  title: string;
  link: string;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-base font-bold">{title}</h2>
        <Button
          variant="link"
          className="text-xs p-0 h-auto"
          onClick={() => navigate(link)}
        >
          See All
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {children}
      </div>
    </div>
  );
}
