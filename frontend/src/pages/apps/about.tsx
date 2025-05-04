import { FaGithub, FaTwitter, FaLinkedin, FaTelegram } from "react-icons/fa";
import { MdSell, MdEvent, MdRestaurantMenu } from "react-icons/md";
import { useTheme } from "@/components/theme-provider";

export function About() {
  const { theme } = useTheme();
  const isDarkTheme = theme === "dark";

  return (
    <div
      className={`min-h-screen ${
        isDarkTheme ? "bg-gray-900 text-gray-100" : "bg-gray-50 text-gray-800"
      }`}
    >
      <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            About <span className="text-indigo-500">Nuspace</span>
          </h1>
          <p
            className={`mt-6 text-xl leading-8 ${
              isDarkTheme ? "text-gray-300" : "text-gray-600"
            }`}
          >
            Unified platform for Nazarbayev University students
          </p>
        </div>

        {/* Mission Section */}
        <div
          className={`rounded-2xl p-8 mb-16 ${
            isDarkTheme ? "bg-gray-800" : "bg-white"
          } shadow-xl`}
        >
          <h2 className="text-2xl font-bold mb-6">Our Mission</h2>
          <p
            className={`mb-4 ${
              isDarkTheme ? "text-gray-300" : "text-gray-600"
            }`}
          >
            Nuspace is a single platform for Nazarbayev University students. Our
            goal is to simplify the daily life of students and make campus life
            more comfortable.
          </p>
          <p className={`${isDarkTheme ? "text-gray-300" : "text-gray-600"}`}>
            We strive to create a reliable platform that will allow Every
            Student of Nazarbayev University to make the most of their time,
            easily find the necessary things and keep abreast of interesting
            events and opportunities within the University.
          </p>
        </div>

        {/* Features Section */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-8 text-center">Main sections</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div
              className={`p-6 rounded-lg ${
                isDarkTheme ? "bg-gray-800" : "bg-white"
              } shadow-md`}
            >
              <div className="flex justify-center mb-4">
                <MdSell className="text-indigo-500" size={36} />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-center">
                Kupi-Prodai
              </h3>
              <p
                className={`${isDarkTheme ? "text-gray-300" : "text-gray-600"}`}
              >
                Here students have the opportunity to sell, buy or exchange
                their belongings.
              </p>
            </div>

            <div
              className={`p-6 rounded-lg ${
                isDarkTheme ? "bg-gray-800" : "bg-white"
              } shadow-md`}
            >
              <div className="flex justify-center mb-4">
                <MdEvent className="text-indigo-500" size={36} />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-center">
                NU Events
              </h3>
              <p
                className={`${isDarkTheme ? "text-gray-300" : "text-gray-600"}`}
              >
                Information about holidays, meetings and events that take place
                on the territory of the University. Students will be able to
                find activities that are interesting to them.
              </p>
            </div>

            <div
              className={`p-6 rounded-lg ${
                isDarkTheme ? "bg-gray-800" : "bg-white"
              } shadow-md`}
            >
              <div className="flex justify-center mb-4">
                <MdRestaurantMenu className="text-indigo-500" size={36} />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-center">
                Dorm Eats
              </h3>
              <p
                className={`${isDarkTheme ? "text-gray-300" : "text-gray-600"}`}
              >
                Daily menu in the university canteen. What dishes are available,
                what dishes are being prepared - all this students have the
                opportunity to find out in advance.
              </p>
            </div>
          </div>
        </div>
        {/* Team Section */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-8 text-center">Our Team</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Team Member 1 - Replace with actual team members */}
            <div
              className={`text-center p-6 rounded-lg ${
                isDarkTheme ? "bg-gray-800" : "bg-white"
              } shadow-md`}
            >
              <div className="inline-flex rounded-full overflow-hidden h-20 w-20 mb-4">
                <div
                  className={`${
                    isDarkTheme ? "bg-gray-700" : "bg-gray-200"
                  } h-full w-full flex items-center justify-center text-2xl font-bold`}
                >
                  A
                </div>
              </div>
              <h3 className="text-lg font-semibold">Alex Developer</h3>
              <p
                className={`text-sm mb-3 ${
                  isDarkTheme ? "text-gray-400" : "text-gray-500"
                }`}
              >
                Frontend Developer
              </p>
              <div className="flex justify-center space-x-3">
                <a
                  href="https://github.com/username"
                  className={`hover:text-indigo-500 ${
                    isDarkTheme ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  <FaGithub size={20} />
                </a>
                <a
                  href="https://linkedin.com/in/username"
                  className={`hover:text-indigo-500 ${
                    isDarkTheme ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  <FaLinkedin size={20} />
                </a>
              </div>
            </div>

            {/* Team Member 2 */}
            <div
              className={`text-center p-6 rounded-lg ${
                isDarkTheme ? "bg-gray-800" : "bg-white"
              } shadow-md`}
            >
              <div className="inline-flex rounded-full overflow-hidden h-20 w-20 mb-4">
                <div
                  className={`${
                    isDarkTheme ? "bg-gray-700" : "bg-gray-200"
                  } h-full w-full flex items-center justify-center text-2xl font-bold`}
                >
                  B
                </div>
              </div>
              <h3 className="text-lg font-semibold">Bob Designer</h3>
              <p
                className={`text-sm mb-3 ${
                  isDarkTheme ? "text-gray-400" : "text-gray-500"
                }`}
              >
                UI/UX Designer
              </p>
              <div className="flex justify-center space-x-3">
                <a
                  href="https://github.com/username"
                  className={`hover:text-indigo-500 ${
                    isDarkTheme ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  <FaGithub size={20} />
                </a>
                <a
                  href="https://twitter.com/username"
                  className={`hover:text-indigo-500 ${
                    isDarkTheme ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  <FaTwitter size={20} />
                </a>
              </div>
            </div>

            {/* Team Member 3 */}
            <div
              className={`text-center p-6 rounded-lg ${
                isDarkTheme ? "bg-gray-800" : "bg-white"
              } shadow-md`}
            >
              <div className="inline-flex rounded-full overflow-hidden h-20 w-20 mb-4">
                <div
                  className={`${
                    isDarkTheme ? "bg-gray-700" : "bg-gray-200"
                  } h-full w-full flex items-center justify-center text-2xl font-bold`}
                >
                  C
                </div>
              </div>
              <h3 className="text-lg font-semibold">Carol Engineer</h3>
              <p
                className={`text-sm mb-3 ${
                  isDarkTheme ? "text-gray-400" : "text-gray-500"
                }`}
              >
                Backend Developer
              </p>
              <div className="flex justify-center space-x-3">
                <a
                  href="https://github.com/username"
                  className={`hover:text-indigo-500 ${
                    isDarkTheme ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  <FaGithub size={20} />
                </a>
                <a
                  href="https://linkedin.com/in/username"
                  className={`hover:text-indigo-500 ${
                    isDarkTheme ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  <FaLinkedin size={20} />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Report a Problem Section */}
        <div
          className={`rounded-2xl p-8 ${
            isDarkTheme ? "bg-gray-800" : "bg-white"
          } shadow-xl text-center`}
        >
          <h2 className="text-2xl font-bold mb-4">Report a Problem</h2>
          <p
            className={`mb-6 ${
              isDarkTheme ? "text-gray-300" : "text-gray-600"
            }`}
          >
            Found a bug or having issues? We're here to help. Reach out directly
            for quick assistance.
          </p>
          <a
            href="https://t.me/kamikadze24"
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center px-6 py-3 rounded-lg text-white bg-indigo-600 hover:bg-indigo-700
              transition duration-300 ease-in-out transform hover:-translate-y-1`}
          >
            <FaTelegram size={20} className="mr-2" />
            Contact via Telegram
          </a>
          <p
            className={`mt-4 text-sm ${
              isDarkTheme ? "text-gray-400" : "text-gray-500"
            }`}
          >
            We appreciate your feedback and work quickly to resolve any issues.
          </p>
        </div>
      </div>
    </div>
  );
}
