/**
 * Comprehensive South African Location Database
 * Includes major cities, townships, suburbs, and towns across all 9 provinces
 * Optimized for KasiGig's target users in informal sector
 */

import { Coordinates } from '@/types/location'

export type LocationType = 'City' | 'Township' | 'Suburb' | 'Town' | 'Remote'

export interface SALocation {
  id: string
  name: string
  type: LocationType
  province: string
  coordinates: Coordinates
  aliases?: string[] // Alternative names or common misspellings
  parentCity?: string // For suburbs/townships - which major city they belong to
}

/**
 * GAUTENG - Primary beta testing region
 * Focus: Johannesburg, Pretoria, Midrand areas
 */
const GAUTENG_LOCATIONS: SALocation[] = [
  // Major Cities
  {
    id: 'gauteng-johannesburg',
    name: 'Johannesburg',
    type: 'City',
    province: 'Gauteng',
    coordinates: { latitude: -26.2041, longitude: 28.0473 },
    aliases: ['Joburg', 'Jozi', 'JHB', 'eGoli']
  },
  {
    id: 'gauteng-pretoria',
    name: 'Pretoria',
    type: 'City',
    province: 'Gauteng',
    coordinates: { latitude: -25.7479, longitude: 28.2293 },
    aliases: ['Tshwane', 'PTA']
  },
  {
    id: 'gauteng-midrand',
    name: 'Midrand',
    type: 'Town',
    province: 'Gauteng',
    coordinates: { latitude: -25.9953, longitude: 28.1289 },
    aliases: ['Halfway House']
  },
  {
    id: 'gauteng-centurion',
    name: 'Centurion',
    type: 'Town',
    province: 'Gauteng',
    coordinates: { latitude: -25.8601, longitude: 28.1891 },
    aliases: ['Verwoerdburg']
  },

  // Major Townships - Johannesburg Area
  {
    id: 'gauteng-soweto',
    name: 'Soweto',
    type: 'Township',
    province: 'Gauteng',
    coordinates: { latitude: -26.2678, longitude: 27.8585 },
    parentCity: 'Johannesburg',
    aliases: ['South Western Townships']
  },
  {
    id: 'gauteng-alexandra',
    name: 'Alexandra',
    type: 'Township',
    province: 'Gauteng',
    coordinates: { latitude: -26.1023, longitude: 28.0933 },
    parentCity: 'Johannesburg',
    aliases: ['Alex']
  },
  {
    id: 'gauteng-diepsloot',
    name: 'Diepsloot',
    type: 'Township',
    province: 'Gauteng',
    coordinates: { latitude: -25.9326, longitude: 28.0068 },
    parentCity: 'Johannesburg'
  },
  {
    id: 'gauteng-tembisa',
    name: 'Tembisa',
    type: 'Township',
    province: 'Gauteng',
    coordinates: { latitude: -25.9969, longitude: 28.2286 },
    parentCity: 'Johannesburg'
  },
  {
    id: 'gauteng-katlehong',
    name: 'Katlehong',
    type: 'Township',
    province: 'Gauteng',
    coordinates: { latitude: -26.3358, longitude: 28.1577 },
    parentCity: 'Johannesburg'
  },
  {
    id: 'gauteng-thokoza',
    name: 'Thokoza',
    type: 'Township',
    province: 'Gauteng',
    coordinates: { latitude: -26.3658, longitude: 28.1391 },
    parentCity: 'Johannesburg'
  },
  {
    id: 'gauteng-vosloorus',
    name: 'Vosloorus',
    type: 'Township',
    province: 'Gauteng',
    coordinates: { latitude: -26.3467, longitude: 28.1808 },
    parentCity: 'Johannesburg'
  },
  {
    id: 'gauteng-orange-farm',
    name: 'Orange Farm',
    type: 'Township',
    province: 'Gauteng',
    coordinates: { latitude: -26.4824, longitude: 27.8551 },
    parentCity: 'Johannesburg'
  },

  // Major Townships - Pretoria Area
  {
    id: 'gauteng-mamelodi',
    name: 'Mamelodi',
    type: 'Township',
    province: 'Gauteng',
    coordinates: { latitude: -25.7059, longitude: 28.3574 },
    parentCity: 'Pretoria'
  },
  {
    id: 'gauteng-atteridgeville',
    name: 'Atteridgeville',
    type: 'Township',
    province: 'Gauteng',
    coordinates: { latitude: -25.7697, longitude: 28.0638 },
    parentCity: 'Pretoria',
    aliases: ['Attie']
  },
  {
    id: 'gauteng-soshanguve',
    name: 'Soshanguve',
    type: 'Township',
    province: 'Gauteng',
    coordinates: { latitude: -25.4986, longitude: 28.1058 },
    parentCity: 'Pretoria'
  },
  {
    id: 'gauteng-mabopane',
    name: 'Mabopane',
    type: 'Township',
    province: 'Gauteng',
    coordinates: { latitude: -25.4967, longitude: 28.1036 },
    parentCity: 'Pretoria'
  },

  // Northern Suburbs - Johannesburg
  {
    id: 'gauteng-sandton',
    name: 'Sandton',
    type: 'Suburb',
    province: 'Gauteng',
    coordinates: { latitude: -26.1076, longitude: 28.0567 },
    parentCity: 'Johannesburg'
  },
  {
    id: 'gauteng-fourways',
    name: 'Fourways',
    type: 'Suburb',
    province: 'Gauteng',
    coordinates: { latitude: -26.0121, longitude: 28.0084 },
    parentCity: 'Johannesburg'
  },
  {
    id: 'gauteng-randburg',
    name: 'Randburg',
    type: 'Suburb',
    province: 'Gauteng',
    coordinates: { latitude: -26.0936, longitude: 28.0071 },
    parentCity: 'Johannesburg'
  },
  {
    id: 'gauteng-rosebank',
    name: 'Rosebank',
    type: 'Suburb',
    province: 'Gauteng',
    coordinates: { latitude: -26.1473, longitude: 28.0416 },
    parentCity: 'Johannesburg'
  },
  {
    id: 'gauteng-bryanston',
    name: 'Bryanston',
    type: 'Suburb',
    province: 'Gauteng',
    coordinates: { latitude: -26.0556, longitude: 28.0251 },
    parentCity: 'Johannesburg'
  },

  // Eastern Suburbs - Johannesburg
  {
    id: 'gauteng-bedfordview',
    name: 'Bedfordview',
    type: 'Suburb',
    province: 'Gauteng',
    coordinates: { latitude: -26.1788, longitude: 28.1263 },
    parentCity: 'Johannesburg'
  },
  {
    id: 'gauteng-boksburg',
    name: 'Boksburg',
    type: 'Town',
    province: 'Gauteng',
    coordinates: { latitude: -26.2121, longitude: 28.2628 },
    parentCity: 'Johannesburg'
  },
  {
    id: 'gauteng-benoni',
    name: 'Benoni',
    type: 'Town',
    province: 'Gauteng',
    coordinates: { latitude: -26.1885, longitude: 28.3207 },
    parentCity: 'Johannesburg'
  },
  {
    id: 'gauteng-germiston',
    name: 'Germiston',
    type: 'Town',
    province: 'Gauteng',
    coordinates: { latitude: -26.2251, longitude: 28.1663 },
    parentCity: 'Johannesburg'
  },
  {
    id: 'gauteng-kempton-park',
    name: 'Kempton Park',
    type: 'Town',
    province: 'Gauteng',
    coordinates: { latitude: -26.1011, longitude: 28.2305 },
    parentCity: 'Johannesburg'
  },

  // Southern Suburbs
  {
    id: 'gauteng-alberton',
    name: 'Alberton',
    type: 'Town',
    province: 'Gauteng',
    coordinates: { latitude: -26.2673, longitude: 28.1218 },
    parentCity: 'Johannesburg'
  },
  {
    id: 'gauteng-roodepoort',
    name: 'Roodepoort',
    type: 'Town',
    province: 'Gauteng',
    coordinates: { latitude: -26.1624, longitude: 27.8724 },
    parentCity: 'Johannesburg'
  },
  {
    id: 'gauteng-krugersdorp',
    name: 'Krugersdorp',
    type: 'Town',
    province: 'Gauteng',
    coordinates: { latitude: -26.0854, longitude: 27.7676 },
    parentCity: 'Johannesburg'
  }
]

/**
 * KWAZULU-NATAL - Secondary beta testing region
 * Focus: Durban, Pietermaritzburg areas
 */
const KZN_LOCATIONS: SALocation[] = [
  // Major Cities
  {
    id: 'kzn-durban',
    name: 'Durban',
    type: 'City',
    province: 'KwaZulu-Natal',
    coordinates: { latitude: -29.8587, longitude: 31.0218 },
    aliases: ['eThekwini', 'DBN']
  },
  {
    id: 'kzn-pietermaritzburg',
    name: 'Pietermaritzburg',
    type: 'City',
    province: 'KwaZulu-Natal',
    coordinates: { latitude: -29.6017, longitude: 30.3794 },
    aliases: ['PMB', 'Maritzburg']
  },
  {
    id: 'kzn-richards-bay',
    name: 'Richards Bay',
    type: 'City',
    province: 'KwaZulu-Natal',
    coordinates: { latitude: -28.7830, longitude: 32.0378 }
  },
  {
    id: 'kzn-newcastle',
    name: 'Newcastle',
    type: 'City',
    province: 'KwaZulu-Natal',
    coordinates: { latitude: -27.7574, longitude: 29.9319 }
  },

  // Major Townships - Durban Area
  {
    id: 'kzn-umlazi',
    name: 'Umlazi',
    type: 'Township',
    province: 'KwaZulu-Natal',
    coordinates: { latitude: -29.9686, longitude: 30.8797 },
    parentCity: 'Durban'
  },
  {
    id: 'kzn-kwamashu',
    name: 'KwaMashu',
    type: 'Township',
    province: 'KwaZulu-Natal',
    coordinates: { latitude: -29.7478, longitude: 30.9809 },
    parentCity: 'Durban'
  },
  {
    id: 'kzn-inanda',
    name: 'Inanda',
    type: 'Township',
    province: 'KwaZulu-Natal',
    coordinates: { latitude: -29.7089, longitude: 30.8897 },
    parentCity: 'Durban'
  },
  {
    id: 'kzn-phoenix',
    name: 'Phoenix',
    type: 'Township',
    province: 'KwaZulu-Natal',
    coordinates: { latitude: -29.6974, longitude: 30.9807 },
    parentCity: 'Durban'
  },
  {
    id: 'kzn-chatsworth',
    name: 'Chatsworth',
    type: 'Township',
    province: 'KwaZulu-Natal',
    coordinates: { latitude: -29.9130, longitude: 30.8993 },
    parentCity: 'Durban'
  },
  {
    id: 'kzn-ntuzuma',
    name: 'Ntuzuma',
    type: 'Township',
    province: 'KwaZulu-Natal',
    coordinates: { latitude: -29.7574, longitude: 30.9319 },
    parentCity: 'Durban'
  },
  {
    id: 'kzn-lamontville',
    name: 'Lamontville',
    type: 'Township',
    province: 'KwaZulu-Natal',
    coordinates: { latitude: -29.9447, longitude: 30.9340 },
    parentCity: 'Durban'
  },

  // Suburbs - Durban Area
  {
    id: 'kzn-umhlanga',
    name: 'Umhlanga',
    type: 'Suburb',
    province: 'KwaZulu-Natal',
    coordinates: { latitude: -29.7283, longitude: 31.0819 },
    parentCity: 'Durban',
    aliases: ['Umhlanga Rocks']
  },
  {
    id: 'kzn-westville',
    name: 'Westville',
    type: 'Suburb',
    province: 'KwaZulu-Natal',
    coordinates: { latitude: -29.8313, longitude: 30.9287 },
    parentCity: 'Durban'
  },
  {
    id: 'kzn-pinetown',
    name: 'Pinetown',
    type: 'Town',
    province: 'KwaZulu-Natal',
    coordinates: { latitude: -29.8110, longitude: 30.8532 },
    parentCity: 'Durban'
  },
  {
    id: 'kzn-hillcrest',
    name: 'Hillcrest',
    type: 'Town',
    province: 'KwaZulu-Natal',
    coordinates: { latitude: -29.7729, longitude: 30.7686 },
    parentCity: 'Durban'
  },
  {
    id: 'kzn-amanzimtoti',
    name: 'Amanzimtoti',
    type: 'Town',
    province: 'KwaZulu-Natal',
    coordinates: { latitude: -30.0502, longitude: 30.8771 },
    parentCity: 'Durban',
    aliases: ['Toti']
  },

  // Pietermaritzburg Area
  {
    id: 'kzn-edendale',
    name: 'Edendale',
    type: 'Township',
    province: 'KwaZulu-Natal',
    coordinates: { latitude: -29.6481, longitude: 30.3428 },
    parentCity: 'Pietermaritzburg'
  },
  {
    id: 'kzn-scottsville',
    name: 'Scottsville',
    type: 'Suburb',
    province: 'KwaZulu-Natal',
    coordinates: { latitude: -29.6228, longitude: 30.3644 },
    parentCity: 'Pietermaritzburg'
  }
]

/**
 * WESTERN CAPE
 */
const WESTERN_CAPE_LOCATIONS: SALocation[] = [
  {
    id: 'wc-cape-town',
    name: 'Cape Town',
    type: 'City',
    province: 'Western Cape',
    coordinates: { latitude: -33.9249, longitude: 18.4241 },
    aliases: ['CPT', 'Mother City', 'iKapa']
  },
  {
    id: 'wc-khayelitsha',
    name: 'Khayelitsha',
    type: 'Township',
    province: 'Western Cape',
    coordinates: { latitude: -34.0364, longitude: 18.6627 },
    parentCity: 'Cape Town'
  },
  {
    id: 'wc-mitchells-plain',
    name: "Mitchells Plain",
    type: 'Township',
    province: 'Western Cape',
    coordinates: { latitude: -34.0530, longitude: 18.6286 },
    parentCity: 'Cape Town'
  },
  {
    id: 'wc-gugulethu',
    name: 'Gugulethu',
    type: 'Township',
    province: 'Western Cape',
    coordinates: { latitude: -33.9816, longitude: 18.5833 },
    parentCity: 'Cape Town'
  },
  {
    id: 'wc-langa',
    name: 'Langa',
    type: 'Township',
    province: 'Western Cape',
    coordinates: { latitude: -33.9821, longitude: 18.5209 },
    parentCity: 'Cape Town'
  },
  {
    id: 'wc-stellenbosch',
    name: 'Stellenbosch',
    type: 'Town',
    province: 'Western Cape',
    coordinates: { latitude: -33.9321, longitude: 18.8602 }
  },
  {
    id: 'wc-paarl',
    name: 'Paarl',
    type: 'Town',
    province: 'Western Cape',
    coordinates: { latitude: -33.7340, longitude: 18.9645 }
  },
  {
    id: 'wc-somerset-west',
    name: 'Somerset West',
    type: 'Town',
    province: 'Western Cape',
    coordinates: { latitude: -34.0783, longitude: 18.8431 }
  },
  {
    id: 'wc-george',
    name: 'George',
    type: 'City',
    province: 'Western Cape',
    coordinates: { latitude: -33.9630, longitude: 22.4617 }
  }
]

/**
 * EASTERN CAPE
 */
const EASTERN_CAPE_LOCATIONS: SALocation[] = [
  {
    id: 'ec-port-elizabeth',
    name: 'Port Elizabeth',
    type: 'City',
    province: 'Eastern Cape',
    coordinates: { latitude: -33.9608, longitude: 25.6022 },
    aliases: ['PE', 'Gqeberha']
  },
  {
    id: 'ec-east-london',
    name: 'East London',
    type: 'City',
    province: 'Eastern Cape',
    coordinates: { latitude: -33.0153, longitude: 27.9116 },
    aliases: ['EL']
  },
  {
    id: 'ec-mthatha',
    name: 'Mthatha',
    type: 'City',
    province: 'Eastern Cape',
    coordinates: { latitude: -31.5894, longitude: 28.7845 },
    aliases: ['Umtata']
  },
  {
    id: 'ec-kwazakhele',
    name: 'KwaZakhele',
    type: 'Township',
    province: 'Eastern Cape',
    coordinates: { latitude: -33.9269, longitude: 25.5667 },
    parentCity: 'Port Elizabeth'
  },
  {
    id: 'ec-mdantsane',
    name: 'Mdantsane',
    type: 'Township',
    province: 'Eastern Cape',
    coordinates: { latitude: -32.9833, longitude: 27.7333 },
    parentCity: 'East London'
  }
]

/**
 * FREE STATE
 */
const FREE_STATE_LOCATIONS: SALocation[] = [
  {
    id: 'fs-bloemfontein',
    name: 'Bloemfontein',
    type: 'City',
    province: 'Free State',
    coordinates: { latitude: -29.0852, longitude: 26.1596 },
    aliases: ['Bloem', 'Mangaung']
  },
  {
    id: 'fs-welkom',
    name: 'Welkom',
    type: 'City',
    province: 'Free State',
    coordinates: { latitude: -27.9772, longitude: 26.7319 }
  },
  {
    id: 'fs-mangaung',
    name: 'Mangaung',
    type: 'Township',
    province: 'Free State',
    coordinates: { latitude: -29.1211, longitude: 26.2142 },
    parentCity: 'Bloemfontein'
  }
]

/**
 * LIMPOPO
 */
const LIMPOPO_LOCATIONS: SALocation[] = [
  {
    id: 'lp-polokwane',
    name: 'Polokwane',
    type: 'City',
    province: 'Limpopo',
    coordinates: { latitude: -23.9045, longitude: 29.4689 },
    aliases: ['Pietersburg']
  },
  {
    id: 'lp-thohoyandou',
    name: 'Thohoyandou',
    type: 'Town',
    province: 'Limpopo',
    coordinates: { latitude: -22.9486, longitude: 30.4839 }
  },
  {
    id: 'lp-lebowakgomo',
    name: 'Lebowakgomo',
    type: 'Town',
    province: 'Limpopo',
    coordinates: { latitude: -24.3167, longitude: 29.5000 }
  }
]

/**
 * MPUMALANGA
 */
const MPUMALANGA_LOCATIONS: SALocation[] = [
  {
    id: 'mp-nelspruit',
    name: 'Nelspruit',
    type: 'City',
    province: 'Mpumalanga',
    coordinates: { latitude: -25.4753, longitude: 30.9700 },
    aliases: ['Mbombela']
  },
  {
    id: 'mp-witbank',
    name: 'Witbank',
    type: 'City',
    province: 'Mpumalanga',
    coordinates: { latitude: -25.8740, longitude: 29.2321 },
    aliases: ['eMalahleni']
  },
  {
    id: 'mp-middelburg',
    name: 'Middelburg',
    type: 'Town',
    province: 'Mpumalanga',
    coordinates: { latitude: -25.7753, longitude: 29.4651 }
  }
]

/**
 * NORTHERN CAPE
 */
const NORTHERN_CAPE_LOCATIONS: SALocation[] = [
  {
    id: 'nc-kimberley',
    name: 'Kimberley',
    type: 'City',
    province: 'Northern Cape',
    coordinates: { latitude: -28.7282, longitude: 24.7499 }
  },
  {
    id: 'nc-upington',
    name: 'Upington',
    type: 'Town',
    province: 'Northern Cape',
    coordinates: { latitude: -28.4478, longitude: 21.2561 }
  }
]

/**
 * NORTH WEST
 */
const NORTH_WEST_LOCATIONS: SALocation[] = [
  {
    id: 'nw-rustenburg',
    name: 'Rustenburg',
    type: 'City',
    province: 'North West',
    coordinates: { latitude: -25.6670, longitude: 27.2502 }
  },
  {
    id: 'nw-mahikeng',
    name: 'Mahikeng',
    type: 'City',
    province: 'North West',
    coordinates: { latitude: -25.8645, longitude: 25.6443 },
    aliases: ['Mafikeng']
  },
  {
    id: 'nw-klerksdorp',
    name: 'Klerksdorp',
    type: 'City',
    province: 'North West',
    coordinates: { latitude: -26.8524, longitude: 26.6669 }
  }
]

/**
 * REMOTE/ONLINE option
 */
const REMOTE_LOCATION: SALocation = {
  id: 'remote-online',
  name: 'Remote/Online',
  type: 'Remote',
  province: 'All Provinces',
  coordinates: { latitude: -28.4793, longitude: 24.6727 }, // Geographic center of SA
  aliases: ['Remote', 'Online', 'Work from home', 'WFH']
}

/**
 * Combined location database
 */
export const SA_LOCATIONS_DATABASE: SALocation[] = [
  ...GAUTENG_LOCATIONS,
  ...KZN_LOCATIONS,
  ...WESTERN_CAPE_LOCATIONS,
  ...EASTERN_CAPE_LOCATIONS,
  ...FREE_STATE_LOCATIONS,
  ...LIMPOPO_LOCATIONS,
  ...MPUMALANGA_LOCATIONS,
  ...NORTHERN_CAPE_LOCATIONS,
  ...NORTH_WEST_LOCATIONS,
  REMOTE_LOCATION
]

/**
 * Get all unique provinces
 */
export const SA_PROVINCES = [
  'Gauteng',
  'KwaZulu-Natal',
  'Western Cape',
  'Eastern Cape',
  'Free State',
  'Limpopo',
  'Mpumalanga',
  'Northern Cape',
  'North West',
  'All Provinces'
] as const

/**
 * Get locations by province
 */
export function getLocationsByProvince(province: string): SALocation[] {
  if (province === 'All Provinces') {
    return [REMOTE_LOCATION]
  }
  return SA_LOCATIONS_DATABASE.filter(loc => loc.province === province)
}

/**
 * Get locations by type
 */
export function getLocationsByType(type: LocationType): SALocation[] {
  return SA_LOCATIONS_DATABASE.filter(loc => loc.type === type)
}

/**
 * Search locations by name or alias
 */
export function searchLocations(query: string): SALocation[] {
  const lowerQuery = query.toLowerCase().trim()

  if (!lowerQuery) {
    return SA_LOCATIONS_DATABASE
  }

  return SA_LOCATIONS_DATABASE.filter(location => {
    // Match name
    if (location.name.toLowerCase().includes(lowerQuery)) {
      return true
    }

    // Match aliases
    if (location.aliases?.some(alias => alias.toLowerCase().includes(lowerQuery))) {
      return true
    }

    // Match parent city
    if (location.parentCity?.toLowerCase().includes(lowerQuery)) {
      return true
    }

    // Match province
    if (location.province.toLowerCase().includes(lowerQuery)) {
      return true
    }

    return false
  })
}

/**
 * Get location by ID
 */
export function getLocationById(id: string): SALocation | undefined {
  return SA_LOCATIONS_DATABASE.find(loc => loc.id === id)
}

/**
 * Get location by name (exact match)
 */
export function getLocationByName(name: string): SALocation | undefined {
  const lowerName = name.toLowerCase().trim()
  return SA_LOCATIONS_DATABASE.find(
    loc => loc.name.toLowerCase() === lowerName ||
    loc.aliases?.some(alias => alias.toLowerCase() === lowerName)
  )
}
