import type { Category, Urgency } from './types.js';

export type CategorySlug =
  | 'meetings'
  | 'classes'
  | 'students'
  | 'examinations'
  | 'reevaluation'
  | 'committee'
  | 'research'
  | 'other';

export interface CategoryMapping {
  slug: CategorySlug;
  label: string;
  enums: Category[];
}

export const CATEGORY_MAP: CategoryMapping[] = [
  {
    slug: 'meetings',
    label: 'Meetings',
    enums: ['Meeting'],
  },
  {
    slug: 'classes',
    label: 'Classes',
    enums: ['Class/Schedule'],
  },
  {
    slug: 'students',
    label: 'Students',
    enums: ['Student Issue', 'Re-evaluation'],
  },
  {
    slug: 'examinations',
    label: 'Examinations',
    enums: ['Examination'],
  },
  {
    slug: 'committee',
    label: 'Committee/Admin',
    enums: ['Committee/Admin'],
  },
  {
    slug: 'research',
    label: 'Research',
    enums: ['Research'],
  },
  {
    slug: 'other',
    label: 'Personal',
    enums: ['Other'],
  },
];

export function slugFromCategory(category: Category): CategorySlug {
  const match = CATEGORY_MAP.find((m) => m.enums.includes(category));
  return match?.slug ?? 'other';
}

export function categoryFromSlug(slug: string): Category[] {
  const match = CATEGORY_MAP.find((m) => m.slug === slug);
  return match?.enums ?? ['Other'];
}

export function labelFromSlug(slug: string): string {
  const match = CATEGORY_MAP.find((m) => m.slug === slug);
  return match?.label ?? 'Personal';
}

export function effectiveUrgencyToPriority(
  urgency: Urgency,
): 'urgent' | 'routine' {
  return urgency === 'Critical' || urgency === 'High' ? 'urgent' : 'routine';
}

export function urgencyColor(urgency: Urgency): string {
  switch (urgency) {
    case 'Critical':
      return '#dc2626';
    case 'High':
      return '#dc2626';
    case 'Medium':
      return '#f59e0b';
    case 'Low':
    default:
      return '#94a3b8';
  }
}
