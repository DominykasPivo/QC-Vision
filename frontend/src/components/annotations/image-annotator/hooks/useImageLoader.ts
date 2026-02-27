import { useEffect, useRef, useState } from "react";

type UseImageLoaderParams = {
  imageUrl: string;
  containerRef: React.RefObject<HTMLDivElement>;
  onLoad?: () => void;
};

type UseImageLoaderReturn = {
  image: HTMLImageElement | null;
  dimensions: { width: number; height: number };
};

/**
 * Hook to load an image and calculate its display dimensions
 * based on container width while maintaining aspect ratio.
 */
export function useImageLoader({
  imageUrl,
  containerRef,
  onLoad,
}: UseImageLoaderParams): UseImageLoaderReturn {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  const onLoadRef = useRef<UseImageLoaderParams["onLoad"]>(onLoad);

  // Keep the latest onLoad in a ref, but update it in an effect (not during render)
  useEffect(() => {
    onLoadRef.current = onLoad;
  }, [onLoad]);

  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      setImage(img);

      const el = containerRef.current;
      if (el) {
        const containerWidth = el.clientWidth;
        const aspectRatio = img.height / img.width;

        const width = Math.min(containerWidth, 1200);
        const height = width * aspectRatio;

        setDimensions({ width, height });
      }

      onLoadRef.current?.();
    };

    img.src = imageUrl;

    // Cleanup in case imageUrl changes quickly
    return () => {
      img.onload = null;
    };
  }, [imageUrl, containerRef]);

  return { image, dimensions };
}
