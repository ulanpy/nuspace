import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/context/ThemeProviderContext";
import { Button } from "@/components/atoms/button";
import { cn } from "@/utils/utils";
import { motion, AnimatePresence } from "framer-motion";

interface IconThemeToggleProps {
    className?: string;
    collapsed?: boolean;
    size?: number;
}

export function IconThemeToggle({ className, collapsed = false, size }: IconThemeToggleProps) {
    const { theme, setTheme } = useTheme();

    const toggleTheme = () => {
        setTheme(theme === "dark" ? "light" : "dark");
    };

    const iconSize = size || (collapsed ? 16 : 18);

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className={cn(
                "h-8 w-8 text-muted-foreground hover:text-foreground transition-colors overflow-hidden",
                collapsed && "h-7 w-7",
                className
            )}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
            <AnimatePresence mode="wait" initial={false}>
                <motion.div
                    key={theme}
                    initial={{ y: -20, opacity: 0, rotate: -90 }}
                    animate={{ y: 0, opacity: 1, rotate: 0 }}
                    exit={{ y: 20, opacity: 0, rotate: 90 }}
                    transition={{ duration: 0.2 }}
                >
                    {theme === "dark" ? (
                        <Moon size={iconSize} />
                    ) : (
                        <Sun size={iconSize} />
                    )}
                </motion.div>
            </AnimatePresence>
        </Button>
    );
}
