import { useEffect, useState } from "react";

/**
 * Hook to detect whether the app is in the mobile shell layout.
 */
export function useDeviceDetection() {
  const [isMobile, setIsMobile] = useState(
    () => window.innerWidth < 1024,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1023px)");
    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return { isMobile };
}
