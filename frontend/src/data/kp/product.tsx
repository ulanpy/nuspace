import { BiSolidCategory } from "react-icons/bi";
import { BsPencilFill } from "react-icons/bs";
import { FaBook, FaLaptop, FaTshirt, FaCouch, FaBlender } from "react-icons/fa";
import { GiKnifeFork } from "react-icons/gi";
import { IoCarSport, IoTicket } from "react-icons/io5";
import { MdBrush, MdLocalOffer, MdSports } from "react-icons/md";
export const productCategories: Types.DisplayCategory[] = [
  {
    title: "All",
    icon: <BiSolidCategory />,
  },
  {
    title: "Books",
    icon: <FaBook />,
  },
  {
    title: "Electronics",
    icon: <FaLaptop />,
  },
  {
    title: "Clothing",
    icon: <FaTshirt />,
  },
  {
    title: "Furniture",
    icon: <FaCouch />,
  },
  {
    title: "Appliances",
    icon: <FaBlender />,
  },
  {
    title: "Sports",
    icon: <MdSports />,
  },
  {
    title: "Stationery",
    icon: <BsPencilFill />,
  },
  {
    title: "Art Supplies",
    icon: <MdBrush />,
  },
  {
    title: "Beauty",
    icon: <MdLocalOffer />,
  },
  {
    title: "Food",
    icon: <GiKnifeFork />,
  },
  {
    title: "Tickets",
    icon: <IoTicket />,
  },
  {
    title: "Transport",
    icon: <IoCarSport />,
  },
  {
    title: "Others",
    icon: <BiSolidCategory />,
  },
];
