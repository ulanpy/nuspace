import { refreshAccessToken } from "./RefreshToken";
import { useEffect } from 'react';

export function TokenRefresher() {
    useEffect(() => {
        const interval = setInterval(() => {
            refreshAccessToken();
        }, 5 * 1000);  // 5 seconds in milliseconds


        return () => clearInterval(interval);  // Clear interval on unmount
    }, []);

    return null;  // This component doesn’t render anything
}