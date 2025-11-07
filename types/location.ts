export interface Coordinates {
  latitude: number
  longitude: number
}

export interface LocationData {
  name: string
  coordinates?: Coordinates
  address?: string
  city: string
  province?: string
  country: string
}

export interface UserLocation {
  current?: Coordinates
  preferred?: LocationData
  allowLocationAccess: boolean
  lastUpdated?: Date
}

export interface LocationFilter {
  radius: number // in kilometers
  center: Coordinates
}

export interface LocationPreferences {
  maxTravelDistance: number // in kilometers
  preferredAreas: string[]
  excludedAreas: string[]
}

export interface DistanceInfo {
  distance: number // in kilometers
  unit: 'km' | 'miles'
  travelTime?: number // estimated minutes
}

export interface LocationSearchOptions {
  coordinates?: Coordinates
  radius?: number
  city?: string
  sortByDistance?: boolean
  maxResults?: number
}

// South African major cities with coordinates
export interface SACity {
  name: string
  coordinates: Coordinates
  province: string
}

export const SA_CITIES: SACity[] = [
  {
    name: 'Cape Town',
    coordinates: { latitude: -33.9249, longitude: 18.4241 },
    province: 'Western Cape'
  },
  {
    name: 'Johannesburg',
    coordinates: { latitude: -26.2041, longitude: 28.0473 },
    province: 'Gauteng'
  },
  {
    name: 'Durban',
    coordinates: { latitude: -29.8587, longitude: 31.0218 },
    province: 'KwaZulu-Natal'
  },
  {
    name: 'Pretoria',
    coordinates: { latitude: -25.7479, longitude: 28.2293 },
    province: 'Gauteng'
  },
  {
    name: 'Port Elizabeth',
    coordinates: { latitude: -33.9608, longitude: 25.6022 },
    province: 'Eastern Cape'
  },
  {
    name: 'Bloemfontein',
    coordinates: { latitude: -29.0852, longitude: 26.1596 },
    province: 'Free State'
  },
  {
    name: 'East London',
    coordinates: { latitude: -33.0153, longitude: 27.9116 },
    province: 'Eastern Cape'
  },
  {
    name: 'Pietermaritzburg',
    coordinates: { latitude: -29.6017, longitude: 30.3794 },
    province: 'KwaZulu-Natal'
  },
  {
    name: 'Kimberley',
    coordinates: { latitude: -28.7282, longitude: 24.7499 },
    province: 'Northern Cape'
  },
  {
    name: 'Polokwane',
    coordinates: { latitude: -23.9045, longitude: 29.4689 },
    province: 'Limpopo'
  },
  {
    name: 'Nelspruit',
    coordinates: { latitude: -25.4753, longitude: 30.9700 },
    province: 'Mpumalanga'
  },
  {
    name: 'Rustenburg',
    coordinates: { latitude: -25.6670, longitude: 27.2502 },
    province: 'North West'
  }
]

// Common radius options for filtering
export const RADIUS_OPTIONS = [
  { value: 5, label: '5 km' },
  { value: 10, label: '10 km' },
  { value: 25, label: '25 km' },
  { value: 50, label: '50 km' },
  { value: 100, label: '100 km' },
  { value: 500, label: 'Anywhere in SA' }
]

// Location options for dropdowns (used in forms)
export const SA_LOCATIONS = [
  'Cape Town',
  'Johannesburg',
  'Durban',
  'Pretoria',
  'Port Elizabeth',
  'Bloemfontein',
  'East London',
  'Pietermaritzburg',
  'Kimberley',
  'Polokwane',
  'Nelspruit',
  'Rustenburg',
  'Remote/Online',
  'Other'
] as const