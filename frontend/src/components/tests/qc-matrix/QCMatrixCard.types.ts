import type { ApiPhoto } from "@/hooks/useTestDetailPhotos";
import type { Color } from "@/lib/types";

export interface QCMatrixCardProps {
  testId: string;
  colors: Color[];
  photos: ApiPhoto[];
  matrixColumns: string | null;
}

export type EffectiveCol =
  | {
      kind: "merged";
      ptKey: string;
      ptLabel: string;
      methodKeys: readonly string[];
    }
  | { kind: "method"; ptKey: string; methodKey: string; methodLabel: string }
  | {
      kind: "custom-merged";
      customKey: string;
      customLabel: string;
      methodKeys: readonly string[];
    }
  | {
      kind: "custom-method";
      customKey: string;
      methodKey: string;
      methodLabel: string;
    };

export type CustomColumnMethod = {
  key: string;
  label: string;
};

export type CustomColumnDef = {
  key: string;
  label: string;
  methods: CustomColumnMethod[];
};

export type ParsedColumns = {
  methods: Set<string>;
  merged: Set<string>;
  customColumns: CustomColumnDef[];
  customMethods: Set<string>;
  customMerged: Set<string>;
};

export type CellStatus = "approved" | "pending" | "rejected";
