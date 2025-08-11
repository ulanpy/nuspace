import { Link } from "react-router-dom";
import { ROUTES } from "@/data/routes";

export default function Footer(props) {
  return (
    <footer className="text-center text-sm text-muted-foreground mt-12 py-4 border-t">
      <Link to={ROUTES.APPS.ABOUT} className="hover:underline">
        {props.note}
      </Link>
    </footer>
  );
}
