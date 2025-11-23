import { useEffect, useState } from "react";

export function useIsMacSafari() {
  const [isMacSafari, setIsMacSafari] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const ua = navigator.userAgent;
    const detected =
      /Macintosh/.test(ua) && /Safari/.test(ua) && !/(Chrome|Chromium|Edg)/.test(ua);
    setIsMacSafari(detected);
  }, []);

  return isMacSafari;
}

