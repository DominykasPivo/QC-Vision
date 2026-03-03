import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronUp } from "lucide-react";
import { MaterialIcon } from "./MaterialIcon";
import { PRINT_TYPES, ALL_METHODS } from "@/lib/constants/printTypes";
import type { ApiPhoto } from "@/hooks/useTestDetailPhotos";
import type { Color } from "@/lib/types";

interface QCMatrixCardProps {
  colors: Color[];
  photos: ApiPhoto[];
}

export function QCMatrixCard({ colors, photos }: QCMatrixCardProps) {
  const [isOpen, setIsOpen] = useState(true);

  if (colors.length === 0) return null;

  return (
    <Card className="overflow-hidden rounded-xl border-slate-200 bg-white shadow-sm">
      <CardHeader className="border-b border-slate-100 px-8 py-4">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 text-left"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
        >
          <div className="flex items-center gap-3">
            <CardTitle className="flex items-center gap-2 text-2xl font-bold">
              <MaterialIcon name="grid_on" className="text-[#2563eb]" />
              QC Matrix
            </CardTitle>
          </div>
          {isOpen ? (
            <ChevronUp className="h-5 w-5 text-slate-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-slate-500" />
          )}
        </button>
      </CardHeader>

      {isOpen && (
        <CardContent className="overflow-x-auto px-4 py-4 md:px-8 md:py-6">
          <table className="min-w-full border-collapse text-xs">
            <thead>
              {/* Row 1: print type group headers */}
              <tr>
                <th className="border border-slate-200 bg-slate-50 px-3 py-2 text-left text-slate-500 font-medium min-w-[100px]">
                  Color
                </th>
                {PRINT_TYPES.map((pt) => (
                  <th
                    key={pt.key}
                    colSpan={pt.methods.length}
                    className="border border-slate-200 bg-blue-50 px-2 py-2 text-center font-semibold text-blue-700"
                  >
                    {pt.label}
                  </th>
                ))}
              </tr>
              {/* Row 2: individual method headers */}
              <tr>
                <th className="border border-slate-200 bg-slate-50 px-3 py-2" />
                {ALL_METHODS.map((m) => (
                  <th
                    key={m.key}
                    className="border border-slate-200 bg-slate-50 px-2 py-2 text-center font-medium text-slate-600 whitespace-nowrap"
                  >
                    {m.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {colors.map((color) => (
                <tr key={color.id}>
                  <td className="border border-slate-200 px-3 py-2 font-medium text-slate-700 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 flex-shrink-0 rounded-full border border-slate-300"
                        style={{ backgroundColor: color.hexValue }}
                      />
                      {color.name}
                    </div>
                  </td>
                  {ALL_METHODS.map((m) => {
                    const cellPhotos = photos.filter(
                      (p) => p.color_id === color.id && p.method === m.key,
                    );
                    return (
                      <td
                        key={m.key}
                        className="border border-slate-200 px-1 py-1 text-center align-middle"
                      >
                        {cellPhotos.length === 0 ? (
                          <span className="text-slate-300">—</span>
                        ) : (
                          <div className="flex flex-col items-center gap-0.5">
                            <div className="flex gap-0.5">
                              {cellPhotos.slice(0, 2).map((p) => (
                                <Link
                                  key={p.id}
                                  to={`/photos/${p.id}`}
                                  className="block h-10 w-10 overflow-hidden rounded border border-slate-200 hover:opacity-80"
                                  title={`Photo ${p.id}`}
                                >
                                  {p.url ? (
                                    <img
                                      src={p.url}
                                      alt={`Photo ${p.id}`}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-full items-center justify-center bg-slate-100 text-slate-400 text-[10px]">
                                      {p.id}
                                    </div>
                                  )}
                                </Link>
                              ))}
                            </div>
                            {cellPhotos.length > 2 && (
                              <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                                +{cellPhotos.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      )}
    </Card>
  );
}
