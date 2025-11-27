import { Link } from "react-router-dom";
import { ROUTES } from "@/data/routes";

interface FooterProps {
  note: string;
}

export function Footer({ note }: FooterProps) {
  return (
    <footer className="text-center text-sm text-muted-foreground mt-12 py-4 border-t">
      <Link to={ROUTES.ABOUT} className="hover:underline">
        {note}
      </Link>
    </footer>
  );
}