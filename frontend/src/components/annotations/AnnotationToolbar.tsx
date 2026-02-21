import {
  Circle,
  Square,
  ArrowRight,
  Pencil,
  MousePointer2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DrawingTool } from "@/lib/annotation-types";

type AnnotationToolbarProps = {
  currentTool: DrawingTool;
  onToolChange: (tool: DrawingTool) => void;
  disabled?: boolean;
};

const tools: { id: DrawingTool; label: string; icon: React.ReactNode }[] = [
  {
    id: "select",
    label: "Select",
    icon: <MousePointer2 className="h-4 w-4" />,
  },
  { id: "circle", label: "Circle", icon: <Circle className="h-4 w-4" /> },
  { id: "rect", label: "Rectangle", icon: <Square className="h-4 w-4" /> },
  { id: "arrow", label: "Arrow", icon: <ArrowRight className="h-4 w-4" /> },
  { id: "freehand", label: "Freehand", icon: <Pencil className="h-4 w-4" /> },
];

export function AnnotationToolbar({
  currentTool,
  onToolChange,
  disabled = false,
}: AnnotationToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 md:p-4">
      <span className="mr-2 text-sm font-medium text-slate-700">
        Drawing Tools:
      </span>
      <div className="flex flex-wrap gap-2">
        {tools.map((tool) => (
          <Button
            key={tool.id}
            variant={currentTool === tool.id ? "default" : "outline"}
            size="sm"
            density="compact"
            onClick={() => onToolChange(tool.id)}
            disabled={disabled}
            title={tool.label}
            className="gap-1.5"
          >
            {tool.icon}
            <span className="hidden sm:inline">{tool.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
