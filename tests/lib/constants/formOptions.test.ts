/**
 * Tests to ensure form options are consistent across the codebase.
 * These tests prevent mismatches like the availability bug where profile
 * stored "Full-time" but application form expected "immediately".
 */

import {
  EXPERIENCE_YEARS_OPTIONS,
  EQUIPMENT_OPTIONS,
  PROFILE_AVAILABILITY_OPTIONS,
  APPLICATION_AVAILABILITY_OPTIONS,
  EXPERIENCE_LEVELS,
  EDUCATION_LEVELS,
  isValidOptionValue,
  getLabelForValue,
  ExperienceYearsValue,
  EquipmentOwnershipValue,
  ProfileAvailabilityValue,
  ApplicationAvailabilityValue
} from '@/lib/constants/formOptions'

describe('Form Options Constants', () => {
  describe('EXPERIENCE_YEARS_OPTIONS', () => {
    it('should have all required experience year values', () => {
      const values = EXPERIENCE_YEARS_OPTIONS.map(o => o.value)
      expect(values).toContain('less-than-1')
      expect(values).toContain('1-3')
      expect(values).toContain('3-5')
      expect(values).toContain('5-10')
      expect(values).toContain('10-plus')
    })

    it('should have unique values', () => {
      const values = EXPERIENCE_YEARS_OPTIONS.map(o => o.value)
      const uniqueValues = [...new Set(values)]
      expect(values.length).toBe(uniqueValues.length)
    })

    it('should have non-empty labels', () => {
      EXPERIENCE_YEARS_OPTIONS.forEach(option => {
        expect(option.label.length).toBeGreaterThan(0)
      })
    })
  })

  describe('EQUIPMENT_OPTIONS', () => {
    it('should have all required equipment values', () => {
      const values = EQUIPMENT_OPTIONS.map(o => o.value)
      expect(values).toContain('fully-equipped')
      expect(values).toContain('partially-equipped')
      expect(values).toContain('no-equipment')
    })

    it('should have unique values', () => {
      const values = EQUIPMENT_OPTIONS.map(o => o.value)
      const uniqueValues = [...new Set(values)]
      expect(values.length).toBe(uniqueValues.length)
    })
  })

  describe('PROFILE_AVAILABILITY_OPTIONS vs APPLICATION_AVAILABILITY_OPTIONS', () => {
    it('should have different purposes (profile = work schedule, application = start date)', () => {
      const profileValues = PROFILE_AVAILABILITY_OPTIONS.map(o => o.value)
      const applicationValues = APPLICATION_AVAILABILITY_OPTIONS.map(o => o.value)

      // Profile should have work schedule options
      expect(profileValues).toContain('full-time')
      expect(profileValues).toContain('part-time')

      // Application should have start date options
      expect(applicationValues).toContain('immediately')
      expect(applicationValues).toContain('within-week')

      // They should NOT be interchangeable (except 'flexible' which is valid in both contexts)
      const onlyInProfile = profileValues.filter(v => v !== 'flexible' && !(applicationValues as string[]).includes(v))
      const onlyInApplication = applicationValues.filter(v => v !== 'flexible' && !(profileValues as string[]).includes(v))

      expect(onlyInProfile.length).toBeGreaterThan(0)
      expect(onlyInApplication.length).toBeGreaterThan(0)
    })

    it('profile availability should NOT be used to pre-fill application availability', () => {
      // This test documents the intentional separation between these two fields
      const profileValue: ProfileAvailabilityValue = 'full-time'
      const applicationValues = APPLICATION_AVAILABILITY_OPTIONS.map(o => o.value)

      // Profile values like 'full-time' should not be valid in application context
      expect(applicationValues).not.toContain(profileValue)
    })
  })

  describe('Helper functions', () => {
    describe('isValidOptionValue', () => {
      it('should return true for valid values', () => {
        expect(isValidOptionValue(EXPERIENCE_YEARS_OPTIONS, '1-3')).toBe(true)
        expect(isValidOptionValue(EQUIPMENT_OPTIONS, 'fully-equipped')).toBe(true)
      })

      it('should return false for invalid values', () => {
        expect(isValidOptionValue(EXPERIENCE_YEARS_OPTIONS, 'invalid')).toBe(false)
        expect(isValidOptionValue(EXPERIENCE_YEARS_OPTIONS, '')).toBe(false)
        expect(isValidOptionValue(EXPERIENCE_YEARS_OPTIONS, undefined)).toBe(false)
      })

      it('should catch mismatched availability values', () => {
        // Profile value should not be valid in application context
        expect(isValidOptionValue(APPLICATION_AVAILABILITY_OPTIONS, 'full-time')).toBe(false)
        // Application value should not be valid in profile context
        expect(isValidOptionValue(PROFILE_AVAILABILITY_OPTIONS, 'immediately')).toBe(false)
      })
    })

    describe('getLabelForValue', () => {
      it('should return correct label for valid value', () => {
        expect(getLabelForValue(EXPERIENCE_YEARS_OPTIONS, '1-3')).toBe('1-3 years')
        expect(getLabelForValue(EQUIPMENT_OPTIONS, 'fully-equipped')).toBe('Yes, I have all necessary tools')
      })

      it('should return undefined for invalid value', () => {
        expect(getLabelForValue(EXPERIENCE_YEARS_OPTIONS, 'invalid')).toBeUndefined()
        expect(getLabelForValue(EXPERIENCE_YEARS_OPTIONS, undefined)).toBeUndefined()
      })
    })
  })

  describe('Type Safety', () => {
    it('should enforce type safety for experience years', () => {
      // This is a compile-time check - if types are wrong, TypeScript will error
      const validValue: ExperienceYearsValue = '1-3'
      expect(EXPERIENCE_YEARS_OPTIONS.some(o => o.value === validValue)).toBe(true)
    })

    it('should enforce type safety for equipment ownership', () => {
      const validValue: EquipmentOwnershipValue = 'fully-equipped'
      expect(EQUIPMENT_OPTIONS.some(o => o.value === validValue)).toBe(true)
    })

    it('should distinguish between profile and application availability types', () => {
      const profileValue: ProfileAvailabilityValue = 'full-time'
      const applicationValue: ApplicationAvailabilityValue = 'immediately'

      // These should be different types (compile-time enforcement)
      expect(profileValue).not.toBe(applicationValue)
    })
  })
})

describe('Integration: Form Options Match Type Definitions', () => {
  // These tests ensure the constants match what the User type expects

  it('experienceYears options should match User type definition', () => {
    // The User type expects: 'less-than-1' | '1-3' | '3-5' | '5-10' | '10-plus'
    const expectedValues = ['less-than-1', '1-3', '3-5', '5-10', '10-plus']
    const actualValues = EXPERIENCE_YEARS_OPTIONS.map(o => o.value)

    expect(actualValues.sort()).toEqual(expectedValues.sort())
  })

  it('equipmentOwnership options should match User type definition', () => {
    // The User type expects: 'fully-equipped' | 'partially-equipped' | 'no-equipment'
    const expectedValues = ['fully-equipped', 'partially-equipped', 'no-equipment']
    const actualValues = EQUIPMENT_OPTIONS.map(o => o.value)

    expect(actualValues.sort()).toEqual(expectedValues.sort())
  })

  it('profile availability options should match User type definition', () => {
    // The User type expects ProfileAvailabilityValue from formOptions
    const expectedValues = ['full-time', 'part-time', 'weekends-only', 'evenings-only', 'flexible', 'project-based', 'on-demand']
    const actualValues = PROFILE_AVAILABILITY_OPTIONS.map(o => o.value)

    expect(actualValues.sort()).toEqual(expectedValues.sort())
  })
})
