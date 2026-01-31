/**
 * Centralized form options for consistent use across profile and application forms.
 *
 * IMPORTANT: When adding or modifying options here, also update the corresponding
 * TypeScript types in types/auth.ts to maintain type safety.
 */

// Experience years - used in both profile and application forms
export const EXPERIENCE_YEARS_OPTIONS = [
  { value: 'less-than-1', label: 'Less than 1 year' },
  { value: '1-3', label: '1-3 years' },
  { value: '3-5', label: '3-5 years' },
  { value: '5-10', label: '5-10 years' },
  { value: '10-plus', label: '10+ years' }
] as const

export type ExperienceYearsValue = typeof EXPERIENCE_YEARS_OPTIONS[number]['value']

// Equipment ownership - used in both profile and application forms
export const EQUIPMENT_OPTIONS = [
  { value: 'fully-equipped', label: 'Yes, I have all necessary tools' },
  { value: 'partially-equipped', label: 'I have some tools' },
  { value: 'no-equipment', label: 'No, I need tools provided' }
] as const

export type EquipmentOwnershipValue = typeof EQUIPMENT_OPTIONS[number]['value']

// Profile availability - work schedule preference (stored in user profile)
// NOTE: This is DIFFERENT from application availability (when can you start)
export const PROFILE_AVAILABILITY_OPTIONS = [
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'weekends-only', label: 'Weekends only' },
  { value: 'evenings-only', label: 'Evenings only' },
  { value: 'flexible', label: 'Flexible' },
  { value: 'project-based', label: 'Project-based' },
  { value: 'on-demand', label: 'On-demand' }
] as const

export type ProfileAvailabilityValue = typeof PROFILE_AVAILABILITY_OPTIONS[number]['value']

// Application availability - when can you start this gig (used only in application form)
// NOTE: This is DIFFERENT from profile availability (work schedule preference)
export const APPLICATION_AVAILABILITY_OPTIONS = [
  { value: 'immediately', label: 'Immediately' },
  { value: 'within-week', label: 'Within a week' },
  { value: 'within-month', label: 'Within a month' },
  { value: 'flexible', label: 'Flexible' }
] as const

export type ApplicationAvailabilityValue = typeof APPLICATION_AVAILABILITY_OPTIONS[number]['value']

// Experience levels for professional workers
export const EXPERIENCE_LEVELS = [
  { value: 'entry-level', label: 'Entry Level (0-1 years)' },
  { value: 'junior', label: 'Junior (1-3 years)' },
  { value: 'mid-level', label: 'Mid-level (3-5 years)' },
  { value: 'senior', label: 'Senior (5-10 years)' },
  { value: 'expert', label: 'Expert (10+ years)' }
] as const

export type ExperienceLevelValue = typeof EXPERIENCE_LEVELS[number]['value']

// Education levels
export const EDUCATION_LEVELS = [
  { value: 'high-school', label: 'High School' },
  { value: 'certificate', label: 'Certificate/Diploma' },
  { value: 'bachelors', label: "Bachelor's Degree" },
  { value: 'masters', label: "Master's Degree" },
  { value: 'phd', label: 'PhD/Doctorate' },
  { value: 'other', label: 'Other' }
] as const

export type EducationLevelValue = typeof EDUCATION_LEVELS[number]['value']

// Helper to get label from value
export function getLabelForValue<T extends { value: string; label: string }>(
  options: readonly T[],
  value: string | undefined
): string | undefined {
  if (!value) return undefined
  return options.find(opt => opt.value === value)?.label
}

// Helper to check if a value is valid for given options
export function isValidOptionValue<T extends { value: string }>(
  options: readonly T[],
  value: string | undefined
): boolean {
  if (!value) return false
  return options.some(opt => opt.value === value)
}
