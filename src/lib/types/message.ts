export interface MessageMetadata {
  type?: string;
  icon?: string;
  title?: string;
  url?: string;
  mainTitle?: string;
  subtitle?: string;
  primaryCategory?: string;
  secondaryCategories?: string[];
  keywords?: string[];
  relatedTopics?: string[];
  interactiveElements?: {
    suggestedQuestions: string[];
    actions: {
      type: 'button' | 'link';
      text: string;
      action: string;
      url?: string;
    }[];
    contact: string;
  };
} 