import type { CleaningOptions } from "./cleaning-options";
export type Status = "VALID" | "CORRECTED" | "REMOVED" | "REVIEW";
export interface ResultRecord {
  original_email: string;
  normalized_email: string;
  final_email: string;
  status: Status;
  category: string;
  reason: string;
  domain: string;
  was_corrected: boolean;
  correction_type: string;
  row_number: number;
}
export interface Summary {
  total: number;
  VALID: number;
  CORRECTED: number;
  REMOVED: number;
  REVIEW: number;
  clean: number;
  repaired: number;
  categories: Record<string, number>;
}
export interface Job {
  id: string;
  filename: string;
  created_at: number;
  updated_at: number;
  state: "ready" | "processing" | "complete" | "failed";
  stage: string;
  processed: number;
  total: number;
  counts: Partial<Record<Status, number>>;
  summary: Summary | null;
  error: string | null;
  options: CleaningOptions | null;
  metadata: {
    filename: string;
    columns: string[];
    row_count: number;
    suggested_column: number | null;
    has_header: boolean;
    sample: string[][];
    sheet: string | null;
  };
}
export interface ResultPage {
  items: ResultRecord[];
  total: number;
  offset: number;
  limit: number;
}
