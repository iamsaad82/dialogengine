export interface HandlerResponse {
  type: string;
  text: string;
  confidence: number;
  metadata?: Record<string, unknown>;
  suggestions?: string[];
  actions?: ResponseAction[];
}

export interface ResponseAction {
  type: 'link' | 'button' | 'form';
  label: string;
  value: string;
  metadata?: Record<string, unknown>;
}

export interface HandlerContext {
  query: string;
  templateId: string;
  metadata?: Record<string, unknown>;
  previousResponses?: HandlerResponse[];
} 