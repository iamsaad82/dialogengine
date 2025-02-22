import { BaseContentTypes } from '../contentTypes';

export interface TopicMetadata {
  domain: string;
  subDomain: string;
  keywords: string[];
  coverage: string[];
  relationships: {
    relatedTopics: string[];
  };
}

export interface ContentPattern {
  title?: string;
  description?: string;
  regex: string;
  confidence: number;
  matches?: string[];
}

export interface ContentField {
  name: string;
  type: string;
  required?: boolean;
  description?: string;
  value?: string;
}

export interface ContentSection {
  title: string;
  content: string;
  type?: string;
}

export interface ContentMetadata {
  domain: string;
  subDomain: string;
  provider?: string;
  serviceType?: string;
  requirements?: string[];
  coverage?: string[];
  nextSteps?: string[];
  relatedTopics?: string[];
  deadlines?: string[];
  contactPoints?: Array<{
    type: string;
    value: string;
    description?: string;
  }>;
  media?: {
    images?: Array<{
      url: string;
      alt?: string;
      caption?: string;
    }>;
    videos?: Array<{
      url: string;
      title?: string;
      description?: string;
    }>;
    files?: Array<{
      url: string;
      name: string;
      type: string;
      size?: number;
    }>;
    links?: Array<{
      url: string;
      title?: string;
      type?: string;
    }>;
  };
  interactive?: {
    forms?: Array<{
      id: string;
      type: string;
      fields: Array<{
        name: string;
        type: string;
        required: boolean;
      }>;
    }>;
    buttons?: Array<{
      text: string;
      action?: string;
      type?: string;
    }>;
    calculators?: Array<{
      id: string;
      type: string;
      inputs: string[];
      outputs: string[];
    }>;
  };
}

export interface ContentAnalysis {
  type: string;
  confidence: number;
  patterns: ContentPattern[];
  fields: ContentField[];
  sections: ContentSection[];
  metadata: ContentMetadata;
}

export interface TopicSection {
  id: string;
  type: typeof BaseContentTypes[keyof typeof BaseContentTypes];
  title: string;
  content: string;
  confidence: number;
  metadata: {
    domain: string;
    subDomain: string;
    keywords: string[];
    coverage: string[];
    relationships: {
      relatedTopics: string[];
    };
  };
}

export interface TopicCluster {
  mainTopic: TopicSection;
  relatedTopics: TopicSection[];
  confidence: number;
  metadata: {
    domain: string;
    subDomain: string;
    keywords: string[];
    coverage: string[];
    relationships: {
      relatedTopics: string[];
    };
  };
} 