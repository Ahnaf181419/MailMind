import type {
  Category,
  Urgency,
} from '@mailmind/shared/types';

export interface ClassificationInput {
  externalThreadId: string;
  subject: string;
  participants: string[];
  messages: Message[];
  vipSenders: string[];
  facultyContext: string;
}

export interface ClassificationOutput {
  externalThreadId: string;
  category: Category;
  urgency: Urgency;
  actionNeeded: boolean;
  deadline: string | null;
  aiExplanation: string;
}

import type { Message } from '@mailmind/shared/types';

export interface ClassifierService {
  classify(input: ClassificationInput): Promise<ClassificationOutput>;
}
