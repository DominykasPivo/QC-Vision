import { Circle, Square, ArrowRight, Pencil, MousePointer2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DrawingTool } from '@/lib/annotation-types';

type AnnotationToolbarProps = {
  currentTool: DrawingTool;
  onToolChange: (tool: DrawingTool) => void;
  disabled?: boolean;
};

const tools: { id: DrawingTool; label: string; icon: React.ReactNode }[] = [
  { id: 'select', label: 'Select', icon: <MousePointer2 className="h-4 w-4" /> },
  { id: 'circle', label: 'Circle', icon: <Circle className="h-4 w-4" /> },
  { id: 'rect', label: 'Rectangle', icon: <Square className="h-4 w-4" /> },
  { id: 'arrow', label: 'Arrow', icon: <ArrowRight className="h-4 w-4" /> },
  { id: 'freehand', label: 'Freehand', icon: <Pencil className="h-4 w-4" /> },
];

export function AnnotationToolbar({
  currentTool,
  onToolChange,
  disabled = false,
}: AnnotationToolbarProps) {
  return (
    <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
      <span className="text-sm font-medium text-gray-700 mr-2">Drawing Tools:</span>
      <div className="flex gap-1">
        {tools.map((tool) => (
          <Button
            key={tool.id}
            variant={currentTool === tool.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => onToolChange(tool.id)}
            disabled={disabled}
            title={tool.label}
            className="gap-2"
          >
            {tool.icon}
            <span className="hidden sm:inline">{tool.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
