import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useTheme } from "../../../context/theme-provider";

interface AppButtonProps {
  icon: React.ReactNode;
  title: string;
  href: string;
  gradient: string;
  iconColor: string;
  delay?: number;
  comingSoon?: boolean;
}

export const AppButton = ({
  icon,
  title,
  href,
  gradient,
  iconColor,
  delay = 0,
  comingSoon = false,
}: AppButtonProps) => {
  const { theme } = useTheme();
  const isDarkTheme = theme === "dark";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: delay,
        duration: 0.5,
        type: "spring",
        stiffness: 100,
        damping: 15,
      }}
      whileHover="hover"
      className="flex flex-col items-center gap-1 sm:gap-2 relative group"
    >
      <div>
        <Link
          to={href}
          onClick={(e) => comingSoon && e.preventDefault()}
          className={`block ${
            comingSoon
              ? "pointer-events-none cursor-not-allowed opacity-60"
              : ""
          }`}
        >
          <motion.div
            className="relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-b from-background/80 to-background/40 backdrop-blur-lg border border-border/40 shadow-lg flex items-center justify-center"
            whileHover={
              comingSoon
                ? {}
                : {
                    scale: 1.05,
                    y: -5,
                    transition: { type: "spring", stiffness: 400, damping: 10 },
                  }
            }
            whileTap={!comingSoon ? { scale: 0.95 } : undefined}
          >
            <motion.div
              className="absolute inset-0 rounded-2xl opacity-0"
              style={{ background: gradient }}
              variants={{
                hover: {
                  opacity: isDarkTheme ? 0.15 : 0.1,
                  transition: { duration: 0.3 },
                },
              }}
            />
            <motion.div
              className={`absolute -inset-2 bg-gradient-radial from-transparent ${
                isDarkTheme
                  ? "via-blue-400/10 via-30% via-purple-400/10 via-60% via-red-400/10 via-90%"
                  : "via-blue-400/5 via-30% via-purple-400/5 via-60% via-red-400/5 via-90%"
              } to-transparent rounded-3xl z-0 pointer-events-none opacity-0`}
              variants={{
                hover: {
                  opacity: 1,
                  scale: 1.2,
                  transition: { duration: 0.3 },
                },
              }}
            />
            <span className={`text-xl sm:text-2xl ${iconColor}`}>{icon}</span>
          </motion.div>
        </Link>
        {comingSoon && (
          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 px-2 py-1 text-xs rounded bg-muted text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
            Coming Soon :)
          </div>
        )}
      </div>
      <span className="text-xs sm:text-sm font-medium text-foreground">
        {title}
      </span>
    </motion.div>
  );
};
