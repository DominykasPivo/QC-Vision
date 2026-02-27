import type Konva from "konva";
import type {
  Annotation,
  AnnotationGeometry,
  CircleGeometry,
  RectGeometry,
  ArrowGeometry,
  FreehandGeometry,
  PolygonGeometry,
} from "@/lib/annotation-types";

/**
 * Handles drag end event for annotations and returns updated geometry.
 * Converts node position back to normalized coordinates.
 */
export function handleAnnotationDrag(
  annotation: Annotation,
  node: Konva.Node,
  dimensions: { width: number; height: number },
): AnnotationGeometry | null {
  const { geometry } = annotation;
  const nodeX = node.x();
  const nodeY = node.y();

  switch (geometry.type) {
    case "circle": {
      const g = geometry as CircleGeometry;
      return {
        ...g,
        center: {
          x: nodeX / dimensions.width,
          y: nodeY / dimensions.height,
        },
      };
    }

    case "rect": {
      const g = geometry as RectGeometry;
      return {
        ...g,
        x: nodeX / dimensions.width,
        y: nodeY / dimensions.height,
      };
    }

    case "arrow": {
      const g = geometry as ArrowGeometry;
      const dragDeltaX = nodeX / dimensions.width;
      const dragDeltaY = nodeY / dimensions.height;
      // Reset node position after applying delta
      node.position({ x: 0, y: 0 });
      return {
        ...g,
        from: {
          x: g.from.x + dragDeltaX,
          y: g.from.y + dragDeltaY,
        },
        to: {
          x: g.to.x + dragDeltaX,
          y: g.to.y + dragDeltaY,
        },
      };
    }

    case "freehand":
    case "polygon": {
      const g = geometry as FreehandGeometry | PolygonGeometry;
      const dragDeltaX = nodeX / dimensions.width;
      const dragDeltaY = nodeY / dimensions.height;
      // Reset node position after applying delta
      node.position({ x: 0, y: 0 });
      return {
        ...g,
        points: g.points.map((p) => ({
          x: p.x + dragDeltaX,
          y: p.y + dragDeltaY,
        })),
      };
    }

    default:
      return null;
  }
}
