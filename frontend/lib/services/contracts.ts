import type { Job, ResultRecord, ResultPage, Summary } from "../types";
import type { CleaningOptions } from "../cleaning-options";
export type { CleaningOptions, ResultRecord };
export type FileMetadata = Job["metadata"];
export type ProcessingJob = Job;
export type JobSummary = Summary;
export type ExportType =
  "clean" | "valid" | "corrected" | "removed" | "review" | "full";
export type ExportFormat = "csv" | "xlsx";
export interface ProcessingProgress {
  jobId: string;
  processedRows: number;
  totalRows: number;
  percent: number;
  currentStage: string;
  validCount: number;
  correctedCount: number;
  removedCount: number;
  reviewCount: number;
}
export interface ProcessingResult {
  jobId: string;
  summary: Summary;
}
export interface ProcessingService {
  start(id: string, column: number, options: CleaningOptions): Promise<Job>;
  get(id: string): Promise<Job>;
}
export interface FileService {
  read(file: File, header?: boolean): Promise<Job>;
  paste(text: string): Promise<Job>;
  discard(id: string): Promise<void>;
}
export interface ResultService {
  page(id: string, query: string, signal?: AbortSignal): Promise<ResultPage>;
}
export interface HistoryService {
  list(): Promise<{ items: Job[]; total: number }>;
}
export interface ExportService {
  download(id: string, kind: ExportType, format: ExportFormat): Promise<void>;
}
