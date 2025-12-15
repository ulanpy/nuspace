
import { useEffect, useRef } from "react";
import { useTheme } from "../../../context/ThemeProviderContext";

interface TelegramWidgetProps {
    postId: string;
}

export function TelegramWidget({ postId }: TelegramWidgetProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const { theme } = useTheme();

    useEffect(() => {
        if (!containerRef.current) return;

        const script = document.createElement("script");
        script.src = "https://telegram.org/js/telegram-widget.js?22";

        // Handle postId being either "123" or "channelname/123"
        const postAttribute = postId.includes("/") ? postId : `nuspacechannel/${postId}`;
        script.setAttribute("data-telegram-post", postAttribute);

        script.setAttribute("data-width", "100%");
        script.setAttribute("data-userpic", "false");

        let isDark = theme === "dark";
        if (theme === "system") {
            isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        }

        if (isDark) {
            script.setAttribute("data-dark", "1");
        }

        script.async = true;

        containerRef.current.appendChild(script);

        return () => {
            if (containerRef.current) {
                containerRef.current.innerHTML = "";
            }
        };
    }, [postId, theme]);

    return <div ref={containerRef} className="w-full" />;
}
