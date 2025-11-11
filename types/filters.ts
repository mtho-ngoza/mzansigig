export interface GigFilterOptions {
  searchTerm: string
  category: string
  budgetMin?: number
  budgetMax?: number
  durations: string[]
  workType: 'all' | 'remote' | 'physical'
  urgency: 'all' | 'urgent' | 'week' | 'month'
  skills: string[]
  showNearbyOnly: boolean
  radiusKm: number
}

export interface GigSortOptions {
  field: 'createdAt' | 'budget' | 'deadline' | 'applicationCount'
  direction: 'asc' | 'desc'
}

export const DEFAULT_FILTERS: GigFilterOptions = {
  searchTerm: '',
  category: '',
  durations: [],
  workType: 'all',
  urgency: 'all',
  skills: [],
  showNearbyOnly: false,
  radiusKm: 25
}

export const BUDGET_RANGES = [
  { label: 'Under R500', min: 0, max: 500 },
  { label: 'R500 - R1,000', min: 500, max: 1000 },
  { label: 'R1,000 - R5,000', min: 1000, max: 5000 },
  { label: 'R5,000+', min: 5000, max: undefined }
]

export const DURATION_OPTIONS = [
  '1-3 days',
  '1 week',
  '1 month',
  '1-3 months',
  '3-6 months',
  '6+ months',
  'Ongoing'
]
