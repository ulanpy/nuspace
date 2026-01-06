import Link from "next/link";
import { ROUTES } from "@/data/routes";

interface FooterProps {
  note: string;
}

export function Footer({ note }: FooterProps) {
  return (
    <footer className="text-center text-sm text-muted-foreground mt-12 py-4 border-t">
      <Link href={ROUTES.ABOUT} className="hover:underline">
        {note}
      </Link>
    </footer>
  );
}