'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function SessionTimeoutHandler() {
    const router = useRouter();
    const pathname = usePathname();
    const [timeoutMinutes, setTimeoutMinutes] = useState(0); // 0 = disabled

    // Fetch preferences on mount
    useEffect(() => {
        const fetchPreferences = async () => {
            try {
                const res = await fetch('/api/app-settings/preferences');
                if (res.ok) {
                    const data = await res.json();
                    // Check if security.sessionTimeout exists
                    if (data.security && data.security.sessionTimeout) {
                        setTimeoutMinutes(parseInt(data.security.sessionTimeout));
                    }
                }
            } catch (error) {
                console.error('Failed to fetch session timeout preference', error);
            }
        };

        if (pathname !== '/login') {
            fetchPreferences();
        }
    }, [pathname]);

    // Session Logic
    useEffect(() => {
        if (timeoutMinutes <= 0 || pathname === '/login') return;

        let logoutTimer;

        const logout = async () => {
            try {
                await fetch('/api/auth/logout', { method: 'POST' });
                router.push('/login?timeout=true');
            } catch (error) {
                console.error('Logout failed', error);
            }
        };

        const resetTimer = () => {
            if (logoutTimer) clearTimeout(logoutTimer);
            logoutTimer = setTimeout(logout, timeoutMinutes * 60 * 1000);
        };

        // Initialize timer
        resetTimer();

        // Listeners
        const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

        const handleActivity = () => {
            resetTimer();
        };

        // Throttled handler to prevent excessive function calls
        let isThrottled = false;
        const throttledHandler = () => {
            if (!isThrottled) {
                handleActivity();
                isThrottled = true;
                setTimeout(() => { isThrottled = false; }, 1000);
            }
        };

        events.forEach(event => window.addEventListener(event, throttledHandler));

        return () => {
            if (logoutTimer) clearTimeout(logoutTimer);
            events.forEach(event => window.removeEventListener(event, throttledHandler));
        };
    }, [timeoutMinutes, pathname, router]);

    return null; // Renderless component
}
