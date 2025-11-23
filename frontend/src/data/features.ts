import { MdSell, MdEvent, MdRestaurantMenu } from "react-icons/md";
import { ROUTES } from "./routes";
export const features = [
  {
    title: "Marketplace",
    description:
      "Here students have the opportunity to sell, buy or exchange their belongings.",
    icon: MdSell,
    link: ROUTES.APPS.MARKETPLACE.ROOT,
  },
  {
    title: "Events",
    description:
      "Information about holidays, meetings and events that take place on the territory of the University. Students will be able to find activities that are interesting to them.",
    icon: MdEvent,
    link: ROUTES.APPS.CAMPUS_CURRENT.ROOT,
  },
  {
    title: "Dorm Eats",
    description:
      "Daily menu in the university canteen. What dishes are available, what dishes are being prepared - all this students have the opportunity to find out in advance.",
    icon: MdRestaurantMenu,
    link: ROUTES.APPS.DORM_EATS.ROOT,
  },
];
