export interface PropertyDefinition {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required?: boolean;
  description?: string;
  enum?: string[];
  items?: PropertyDefinition; // Für Arrays
  properties?: Record<string, PropertyDefinition>; // Für Objects
}

export interface SchemaDefinition {
  type: string;
  properties: Record<string, PropertyDefinition>;
  required: string[];
  validators?: Record<string, ValidatorFunction>;
}

export type ValidatorFunction = (value: unknown) => boolean | Promise<boolean>;

export interface SchemaValidationResult {
  isValid: boolean;
  errors?: string[];
  metadata?: Record<string, unknown>;
} 