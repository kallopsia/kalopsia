import type { ProductRow } from "./product";

export type ImportLogRow = {
  id: string;
  created_at: string;
  filename: string;
  source: string;
  added_count: number;
  changed_count: number;
  deactivated_count: number;
  deleted_count: number;
  error_count: number;
  errors: unknown;
  actor_id: string | null;
  actor_email: string | null;
};

export type ImportLogInsert = Omit<ImportLogRow, "id" | "created_at">;

export type ProductRowInsert = Partial<ProductRow>;
