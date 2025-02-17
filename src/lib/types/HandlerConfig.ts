export interface HandlerConfig {
  type: string;
  template?: string;
  searchFields: string[];
  responseTemplate: string;
  lastUpdated?: string;
  validationRules: {
    required: string[];
    type: string;
    template?: string;
    validation: {
      [key: string]: {
        minLength?: number;
        maxLength?: number;
        pattern?: string;
        custom?: (value: any) => boolean;
      };
    };
    customRules?: {
      [fieldName: string]: Array<{
        type: 'string' | 'number' | 'boolean';
        validation: string;
        errorMessage: string;
      }>;
    };
  };
} 