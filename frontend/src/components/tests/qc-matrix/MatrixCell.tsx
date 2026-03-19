import { useState } from "react";
import { Link } from "react-router-dom";
import type { ApiPhoto } from "@/hooks/useTestDetailPhotos";
import { getCellStatus } from "./QCMatrixCard.helpers";

interface MatrixCellProps {
  cellPhotos: ApiPhoto[];
  cellId: string;
}

export function MatrixCell({ cellPhotos, cellId }: MatrixCellProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const status = getCellStatus(cellPhotos);

  return (
    <td
      key={cellId}
      className={`border border-slate-200 px-1 py-1 text-center align-middle ${
        status === "rejected"
          ? "bg-red-50"
          : status === "pending"
            ? "bg-yellow-50"
            : status === "approved"
              ? "bg-emerald-50"
              : ""
      }`}
    >
      {cellPhotos.length === 0 ? (
        <span className="text-emerald-400 text-base font-bold">✓</span>
      ) : (
        <div className="flex flex-col items-center gap-1.5 w-full">
          <div className="flex gap-0.5 flex-wrap justify-center">
            {cellPhotos.slice(0, 2).map((p) => (
              <Link
                key={p.id}
                to={`/photos/${p.id}`}
                className="relative block h-10 w-10 overflow-hidden rounded border border-slate-200 hover:opacity-80"
                title={`Photo ${p.id} - ${p.verification_status || "pending"}`}
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
                <span
                  className={`absolute bottom-0.5 right-0.5 h-2 w-2 rounded-full border border-white ${
                    p.verification_status === "approved"
                      ? "bg-emerald-500"
                      : p.verification_status === "rejected"
                        ? "bg-red-500"
                        : "bg-yellow-500"
                  }`}
                  title={p.verification_status || "pending"}
                />
              </Link>
            ))}
          </div>
          {cellPhotos.length > 2 && (
            <>
              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                className="rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-blue-700 active:bg-blue-800 transition-colors touch-manipulation shadow-sm min-w-[44px] min-h-[28px]"
                title={isExpanded ? "Hide photos" : "Show all photos"}
              >
                {isExpanded ? "−" : "+"}
                {cellPhotos.length - 2}
              </button>
              {isExpanded && (
                <div className="mt-1.5 p-2 bg-white rounded-md border border-slate-300 shadow-sm w-full max-w-full">
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {cellPhotos.slice(2).map((p) => (
                      <Link
                        key={p.id}
                        to={`/photos/${p.id}`}
                        className="relative block h-10 w-10 overflow-hidden rounded border border-slate-200 hover:opacity-80"
                        title={`Photo ${p.id} - ${p.verification_status || "pending"}`}
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
                        <span
                          className={`absolute bottom-0.5 right-0.5 h-2 w-2 rounded-full border border-white ${
                            p.verification_status === "approved"
                              ? "bg-emerald-500"
                              : p.verification_status === "rejected"
                                ? "bg-red-500"
                                : "bg-yellow-500"
                          }`}
                        />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </td>
  );
}
