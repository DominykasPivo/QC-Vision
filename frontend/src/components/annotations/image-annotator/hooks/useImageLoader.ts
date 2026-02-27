import { useEffect, useState } from "react";

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

  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImage(img);
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const aspectRatio = img.height / img.width;
        const width = Math.min(containerWidth, 1200);
        const height = width * aspectRatio;
        setDimensions({ width, height });
      }
      onLoad?.();
    };
    img.src = imageUrl;
  }, [imageUrl, containerRef, onLoad]);

  return { image, dimensions };
}
