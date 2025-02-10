export interface ScanStatus {
  totalFiles: number;
  processedFiles: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ERROR';
  errors: string[];
} 