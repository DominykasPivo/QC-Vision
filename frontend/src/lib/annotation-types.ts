/**
 * Annotation geometry types for defect marking on images.
 * All coordinates are normalized (0.0 to 1.0) relative to image dimensions.
 */

/** Normalized point (0.0 to 1.0) */
export type Point = {
  x: number;
  y: number;
};

/** Circle annotation */
export type CircleGeometry = {
  type: 'circle';
  center: Point;
  radius: number; // normalized relative to image width
};

/** Rectangle annotation */
export type RectGeometry = {
  type: 'rect';
  x: number; // top-left x (normalized)
  y: number; // top-left y (normalized)
  width: number; // normalized
  height: number; // normalized
};

/** Polygon annotation (closed shape) */
export type PolygonGeometry = {
  type: 'polygon';
  points: Point[];
};

/** Arrow annotation */
export type ArrowGeometry = {
  type: 'arrow';
  from: Point;
  to: Point;
};

/** Freehand drawing annotation */
export type FreehandGeometry = {
  type: 'freehand';
  points: Point[];
};

/** Union of all supported geometry types */
export type AnnotationGeometry =
  | CircleGeometry
  | RectGeometry
  | PolygonGeometry
  | ArrowGeometry
  | FreehandGeometry;

/** Tool types for drawing */
export type DrawingTool = 'circle' | 'rect' | 'polygon' | 'arrow' | 'freehand' | 'select';

/** Annotation from API (matches backend schema) */
export type Annotation = {
  id: number;
  defect_id: number;
  category_id: number;
  geometry: AnnotationGeometry;
  created_at: string;
};

/** Annotation creation payload */
export type AnnotationCreate = {
  category_id: number;
  geometry: AnnotationGeometry;
};

/**
 * Convert normalized coordinates to pixel coordinates
 */
export function normalizedToPixel(
  normalized: number,
  dimension: number
): number {
  return normalized * dimension;
}

/**
 * Convert pixel coordinates to normalized coordinates
 */
export function pixelToNormalized(
  pixel: number,
  dimension: number
): number {
  return pixel / dimension;
}

/**
 * Convert normalized point to pixel point
 */
export function pointToPixel(
  point: Point,
  imageWidth: number,
  imageHeight: number
): { x: number; y: number } {
  return {
    x: normalizedToPixel(point.x, imageWidth),
    y: normalizedToPixel(point.y, imageHeight),
  };
}

/**
 * Convert pixel point to normalized point
 */
export function pointToNormalized(
  x: number,
  y: number,
  imageWidth: number,
  imageHeight: number
): Point {
  return {
    x: pixelToNormalized(x, imageWidth),
    y: pixelToNormalized(y, imageHeight),
  };
}
