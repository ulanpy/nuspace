import { FaGithub, FaLinkedin, FaTelegram, FaGlobe } from "react-icons/fa";
import team1 from "@/assets/images/teams/ulan.jpg";
import team2 from "@/assets/images/teams/yelnur.jpg";
import team3 from "@/assets/images/teams/alan.jpg";
import team4 from "@/assets/images/teams/bakhtiyar.jpg";
import team5 from "@/assets/images/teams/aisana.jpg";
import team6 from "@/assets/images/teams/adil.jpg";

export const teamMembers: Types.Team[] = [
  {
    name: "Ulan",
    imgLink: team1,
    role: "Head",
    contacts: [
      {
        icon: <FaGithub size={20} />,
        link: "https://github.com/ulanpy/",
      },
      // {
      //   icon: <FaLinkedin size={20} />,
      //   link: "",
      // },
      {
        icon: <FaTelegram size={20} />,
        link: "https://t.me/kamikadze24",
      },
    ],
  },
  {
    name: "Turdaly Yelnur",
    imgLink: team2,
    role: "Frontend Developer",
    contacts: [
      {
        icon: <FaGithub size={20} />,
        link: "https://github.com/Turdaly/",
      },
      // {
      //   icon: <FaLinkedin size={20} />,
      //   link: "",
      // },
      {
        icon: <FaTelegram size={20} />,
        link: "https://t.me/yelnurturdaly",
      },
    ],
  },
  {
    name: "Alan",
    imgLink: team3,
    role: "Backend Developer",
    contacts: [
      {
        icon: <FaGithub size={20} />,
        link: "https://github.com/queshee",
      },
      // {
      //   icon: <FaLinkedin size={20} />,
      //   link: "",
      // },
      {
        icon: <FaTelegram size={20} />,
        link: "https://t.me/quesheee",
      },
    ],
  },
  {
    name: "Bakhtiyar",
    imgLink: team4,
    role: "Developer & Product Manager",
    contacts: [
      {
        icon: <FaGithub size={20} />,
        link: "https://github.com/sagyzdop",
      },
      {
        icon: <FaLinkedin size={20} />,
        link: "https://www.linkedin.com/in/sagyzdop/",
      },
      {
        icon: <FaGlobe size={20} />,
        link: "https://sagyzdop.com",
      },
    ],
  },
  {
    name: "Aisana",
    imgLink: team5,
    role: "Frontend developer",
    contacts: [
      {
        icon: <FaGithub size={20} />,
        link: "https://github.com/aisana-abdrayeva/",
      },
      {
        icon: <FaLinkedin size={20} />,
        link: "https://www.linkedin.com/in/aisana-abdrayeva",
      },
      {
        icon: <FaTelegram size={20} />,
        link: "https://t.me/aisana_abdrayeva",
      },
    ],
  },
  {
    name: "Adil",
    imgLink: team6,
    role: "Supervisor",
    contacts: [
      {
        icon: <FaGithub size={20} />,
        link: "https://github.com/weeebdev",
      },
      {
        icon: <FaLinkedin size={20} />,
        link: "https://www.linkedin.com/in/adildev/",
      },
      {
        icon: <FaTelegram size={20} />,
        link: "https://t.me/weeebdev",
      },
    ],
  },
  {
    name: "Myrza Arslan",
    // imgLink: "../../images/teams/myrza.jpg",
    role: "Frontend Developer",
    contacts: [
      {
        icon: <FaGithub size={20} />,
        link: "https://github.com/myrzaarslan",
      },
      {
        icon: <FaLinkedin size={20} />,
        link: "",
      },
      {
        icon: <FaTelegram size={20} />,
        link: "https://t.me/myrzaarslan",
      },
    ],
  },
  {
    name: "Asqar",
    // imgLink: "../../images/teams/askar.jpg",
    role: "Backend Developer",
    contacts: [
      {
        icon: <FaGithub size={20} />,
        link: "https://github.com/Ioonchik",
      },
      {
        icon: <FaLinkedin size={20} />,
        link: "https://www.linkedin.com/in/askar-ivan/",
      },
      {
        icon: <FaTelegram size={20} />,
        link: "https://t.me/askarikoo",
      },
    ],
  },
  {
    name: "Ibrahim",
    // imgLink: "../../images/teams/someone.jpg",
    role: "Backend Developer",
    contacts: [
      {
        icon: <FaGithub size={20} />,
        link: "https://github.com/tolbra",
      },
      {
        icon: <FaLinkedin size={20} />,
        link: "https://www.linkedin.com/in/tolbra/",
      },
      {
        icon: <FaTelegram size={20} />,
        link: "https://t.me/tolbra",
      },
    ],
  },
  {
    name: "Nurdaulet Zhalmuratov",
    // imgLink: "../../images/teams/nurdaulet.jpg",
    role: "Backend Developer",
    contacts: [
      {
        icon: <FaGithub size={20} />,
        link: "https://github.com/tolbra",
      },
      {
        icon: <FaLinkedin size={20} />,
        link: "https://linkedin.com/in/nurdaulet-zhalmuratov",
      },
      {
        icon: <FaTelegram size={20} />,
        link: "https://t.me/nurdauletzhalmuratov",
      },
    ],
  },
  {
    name: "Bekarys Maksutbek",
    // imgLink: "../../images/teams/bekarys.jpg",
    role: "Backend Developer",
    contacts: [
      {
        icon: <FaGithub size={20} />,
        link: "https://github.com/b2k4rys",
      },
      {
        icon: <FaLinkedin size={20} />,
        link: "https://kz.linkedin.com/in/bekarys-maksutbek",
      },
      {
        icon: <FaTelegram size={20} />,
        link: "https://t.me/b2k4rys",
      },
    ],
  },
];
