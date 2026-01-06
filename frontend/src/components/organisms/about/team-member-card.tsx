import { Card, CardContent } from "@/components/atoms/card";
import { useTheme } from '@/context/theme-provider-context';

export function TeamMemberCard({ name, role, imgLink, contacts }: Types.Team) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  return (
    <Card
      className={`text-center h-full ${
        isDark ? "bg-gray-800 border-gray-700" : "bg-white"
      }`}
    >
      <CardContent className="pt-6 px-6 pb-6 flex flex-col justify-between items-center h-full">
        <div>
          <div className="inline-flex rounded-full overflow-hidden h-20 w-20 mb-4">
            <img
              src={imgLink}
              alt={name}
              className="object-cover w-full h-full"
              loading="lazy"
            />
          </div>

          <h3 className="text-lg font-semibold">{name}</h3>
          <p
            className={`text-sm mb-3 ${
              isDark ? "text-gray-400" : "text-gray-500"
            }`}
          >
            {role}
          </p>
        </div>

        <div className="flex justify-center space-x-3">
          {contacts.map((contact, index) => (
            <a
              href={contact.link || "#"}
              target="_blank"
              rel="noopener noreferrer"
              key={index}
              className={`hover:text-indigo-500 transition-colors ${
                !contact.link ? "opacity-50 pointer-events-none" : ""
              } ${isDark ? "text-gray-400" : "text-gray-600"}`}
              aria-label={`${name}'s social profile`}
            >
              {contact.icon}
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
