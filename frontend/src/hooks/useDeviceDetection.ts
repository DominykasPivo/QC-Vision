import { useMemo } from "react";

/**
 * Hook to detect if the device is mobile based on user agent or viewport width
 */
export function useDeviceDetection() {
  const isMobile = useMemo(
    () =>
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      ) || window.innerWidth < 768,
    [],
  );

  return { isMobile };
}
