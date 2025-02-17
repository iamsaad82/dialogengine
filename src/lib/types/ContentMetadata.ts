export interface ContentMetadata {
  type: string;
  template?: string;
  title: string;
  description: string;
  requirements?: string;
  source?: string;
  lastUpdated?: string;
  additionalFields?: Record<string, any>;
} 