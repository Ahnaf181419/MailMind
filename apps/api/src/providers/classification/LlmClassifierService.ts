import OpenAI from 'openai';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import type {
  ClassifierService,
  ClassificationInput,
  ClassificationOutput,
} from './ClassifierService.js';
import type { Category, Urgency, Message } from '@mailmind/shared/types';

const CATEGORIES = [
  'Meeting',
  'Class/Schedule',
  'Student Issue',
  'Examination',
  'Re-evaluation',
  'Committee/Admin',
  'Research',
  'Other',
] as const;

const URGENCIES = ['Low', 'Medium', 'High', 'Critical'] as const;

const ClassificationSchema = z.object({
  externalThreadId: z.string(),
  category: z.enum(CATEGORIES),
  urgency: z.enum(URGENCIES),
  actionNeeded: z.boolean(),
  deadline: z.string().nullable(),
  aiExplanation: z.string(),
});

const SYSTEM_PROMPT = `You are MailMind, an AI that triages Gmail for a university faculty member at AUST (Department of Computer Science).

For each email thread, return a JSON object with EXACTLY these fields:
- externalThreadId: string (echo back)
- category: one of ["Meeting","Class/Schedule","Student Issue","Examination","Re-evaluation","Committee/Admin","Research","Other"]
- urgency: "Low" | "Medium" | "High" | "Critical"
  - Critical: explicit same-day deadline, exam incident, moderation today, or VIP sender on urgent matter
  - High: explicit deadline within 3 days, re-evaluation/moderation/scripts
  - Medium: routine academic correspondence requiring action within a week
  - Low: informational, newsletters, no action needed
- actionNeeded: boolean
- deadline: ISO8601 date string or null
- aiExplanation: one sentence explaining the category and urgency choice

Return JSON only. No prose outside the JSON. No markdown fences.`;

function buildUserPrompt(input: ClassificationInput): string {
  const lastMessages = input.messages.slice(-3);
  return `VIP senders (always flag as urgent): ${JSON.stringify(input.vipSenders)}

Faculty context: ${input.facultyContext}

Today's date: ${new Date().toISOString().slice(0, 10)}

Thread: ${input.subject}
Participants: ${input.participants.join(', ')}

Last messages:
${lastMessages
  .map(
    (m) =>
      `[${m.sentAt}] ${m.sender}${m.senderIsFaculty ? ' (faculty)' : ''}: ${m.body.slice(0, 600)}`,
  )
  .join('\n\n')}

externalThreadId: ${input.externalThreadId}

Classify this thread.`;
}

function applyVipPromotion(
  out: ClassificationOutput,
  vipSenders: string[],
): ClassificationOutput {
  const isVip = out.aiExplanation
    ? vipSenders.some((v) =>
        out.aiExplanation.toLowerCase().includes(v.toLowerCase()),
      )
    : false;
  if (isVip && (out.urgency === 'Low' || out.urgency === 'Medium')) {
    return { ...out, urgency: 'High' };
  }
  return out;
}

export class LlmClassifierService implements ClassifierService {
  private client: OpenAI | null;

  constructor() {
    this.client = env.LLM_API_KEY
      ? new OpenAI({
          apiKey: env.LLM_API_KEY,
          baseURL: env.LLM_BASE_URL,
          timeout: env.LLM_TIMEOUT_MS,
        })
      : null;
  }

  async classify(input: ClassificationInput): Promise<ClassificationOutput> {
    if (!this.client) {
      return keywordFallback(input);
    }

    let lastError: unknown;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await this.client.chat.completions.create({
          model: env.LLM_MODEL,
          temperature: 0,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: buildUserPrompt(input) },
          ],
        });
        const content = res.choices[0]?.message?.content ?? '{}';
        const json = extractJson(content);
        const parsed = ClassificationSchema.parse(json);
        return applyVipPromotion(parsed, input.vipSenders);
      } catch (err) {
        lastError = err;
        logger.warn(
          { attempt, err: (err as Error).message },
          'LLM classify failed; retrying',
        );
      }
    }
    logger.error(
      { err: (lastError as Error)?.message },
      'LLM classify failed after retries; using keyword fallback',
    );
    return keywordFallback(input);
  }
}

function extractJson(content: string): unknown {
  const trimmed = content.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return JSON.parse(trimmed);
  }
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON object found in LLM response');
  return JSON.parse(match[0]);
}

export function keywordFallback(
  input: ClassificationInput,
): ClassificationOutput {
  const text = `${input.subject}\n${input.messages.map((m: Message) => m.body).join('\n')}`.toLowerCase();
  const participantsLc = input.participants.map((p) => p.toLowerCase());
  const vipHit = input.vipSenders.some((v) =>
    participantsLc.some((p) => p.includes(v.toLowerCase())),
  );

  let category: Category = 'Other';
  let urgency: Urgency = 'Low';

  if (/re-?evaluation|appeal|grievance/.test(text)) {
    category = 'Re-evaluation';
    urgency = 'Critical';
  } else if (/moderation|paper[ -]set|script|grading|exam/.test(text)) {
    category = 'Examination';
    urgency = 'High';
  } else if (/meeting|mom|minutes|agenda|committee|board/.test(text)) {
    category = 'Meeting';
    urgency = vipHit ? 'High' : 'Medium';
  } else if (/class[ -]cancel|room[ -]change|makeup|lab[ -]reschedule/.test(text)) {
    category = 'Class/Schedule';
    urgency = 'High';
  } else if (/circular|notice|accounts|hr|registrar|dean|chair/.test(text)) {
    category = 'Committee/Admin';
    urgency = vipHit ? 'High' : 'Medium';
  } else if (/conference|journal|review|paper[ -]sub|collaboration|research/.test(text)) {
    category = 'Research';
    urgency = 'Medium';
  } else if (/student|project|extension|attendance/.test(text)) {
    category = 'Student Issue';
    urgency = vipHit ? 'High' : 'Medium';
  }

  if (vipHit && urgency !== 'Critical') urgency = 'High';

  const explanation = buildFallbackExplanation(category, urgency, vipHit);

  return {
    externalThreadId: input.externalThreadId,
    category,
    urgency,
    actionNeeded: urgency === 'High' || urgency === 'Critical',
    deadline: extractDeadline(text),
    aiExplanation: explanation,
  };
}

function buildFallbackExplanation(
  category: Category,
  urgency: Urgency,
  vipHit: boolean,
): string {
  const vipNote = vipHit ? ' (VIP sender detected)' : '';
  return `Keyword match placed this in ${category} at ${urgency} urgency${vipNote}.`;
}

function extractDeadline(text: string): string | null {
  const byMatch = text.match(/\bby\s+([a-z]+day|\d{1,2}[\/\-]\d{1,2}|\d{1,2}\s*(?:am|pm))/i);
  if (byMatch) {
    const d = new Date(byMatch[1]);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return null;
}
