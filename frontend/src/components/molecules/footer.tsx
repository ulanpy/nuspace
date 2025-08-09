"use client";

import { Link } from "react-router-dom";
import { ROUTES } from "@/data/routes";


const Footer = () => {
  return (
      <footer className="text-center text-sm text-muted-foreground mt-12 py-4 border-t">
        <Link to={ROUTES.APPS.ABOUT} className="hover:underline">
          About Us
        </Link>
      </footer>
  );
};

export default Footer;