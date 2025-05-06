import { useTheme } from "@/context/theme-provider";
import { Card, CardContent } from "@/components/atoms/card";

export function TeamCard({ team }: Types.TeamCardProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { name, role, contacts, imgLink } = team;

  const cardWidth = () => {
    const charWidth = 4;
    const baseWidth = 160;
    const calculatedWidth = baseWidth + name.length * charWidth;
    return Math.max(baseWidth, calculatedWidth);
  };
  return (
    <Card
      className={`text-center h-64 ${
        isDark ? "bg-gray-800 border-gray-700" : "bg-white"
      }`}
      style={{ width: cardWidth() }}
    >
      <CardContent className="pt-6 pb-6 flex flex-col justify-between items-center h-full">
        <div className="w-full">
          <div className="inline-flex rounded-full overflow-hidden h-20 w-20 mb-4">
            <img src={imgLink} loading="lazy" className="object-cover"></img>
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
              href={contact.link}
              target="_blank"
              rel="noopener noreferrer"
              key={index}
              className={`hover:text-indigo-500 transition-colors ${
                isDark ? "text-gray-400" : "text-gray-600"
              }`}
              aria-label={`${name}'s GitHub profile`}
            >
              {contact.icon}
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
