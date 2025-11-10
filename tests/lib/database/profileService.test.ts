import { ProfileService } from '@/lib/database/profileService'
import { User } from '@/types/auth'

describe('ProfileService', () => {
  describe('calculateProfileCompleteness', () => {
    const baseUser: User = {
      id: 'test-user-id',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      phone: '+27123456789',
      location: 'Johannesburg',
      userType: 'job-seeker',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    describe('given a user with no optional fields filled', () => {
      describe('when calculating profile completeness', () => {
        it('then returns 0 percent', () => {
          // Given
          const user: User = { ...baseUser }

          // When
          const completeness = ProfileService.calculateProfileCompleteness(user)

          // Then
          expect(completeness).toBe(0)
        })
      })
    })

    describe('given a job seeker with all optional fields filled', () => {
      describe('when calculating profile completeness', () => {
        it('then returns 100 percent', () => {
          // Given
          const user: User = {
            ...baseUser,
            userType: 'job-seeker', // Note: hyphen, not underscore
            bio: 'This is my bio',
            profilePhoto: 'https://example.com/photo.jpg',
            skills: ['JavaScript', 'React'],
            experience: 'Senior Developer with 5 years experience',
            hourlyRate: 500,
            availability: 'full-time',
            education: 'BSc Computer Science',
            languages: ['English', 'Afrikaans'],
            portfolio: [
              {
                id: 'port-1',
                title: 'Project 1',
                description: 'A great project',
                imageUrl: 'https://example.com/project.jpg',
                category: 'web-development',
                completedAt: new Date('2024-01-01'),
              },
            ],
          }

          // When
          const completeness = ProfileService.calculateProfileCompleteness(user)

          // Then
          expect(completeness).toBe(100)
        })
      })
    })

    describe('given an employer with all optional fields filled', () => {
      describe('when calculating profile completeness', () => {
        it('then returns 100 percent', () => {
          // Given
          const user: User = {
            ...baseUser,
            userType: 'employer',
            bio: 'This is my company bio',
            profilePhoto: 'https://example.com/photo.jpg',
            skills: ['Management', 'Leadership'],
            experience: '10 years in the industry',
            hourlyRate: 1000,
            availability: 'full-time',
            education: 'MBA',
            languages: ['English'],
            certifications: ['Certified Project Manager'],
          }

          // When
          const completeness = ProfileService.calculateProfileCompleteness(user)

          // Then
          expect(completeness).toBe(100)
        })
      })
    })

    describe('given a job seeker with half of optional fields filled', () => {
      describe('when calculating profile completeness', () => {
        it('then returns approximately 44 percent', () => {
          // Given
          const user: User = {
            ...baseUser,
            userType: 'job-seeker', // Note: hyphen, not underscore
            bio: 'This is my bio',
            profilePhoto: 'https://example.com/photo.jpg',
            skills: ['JavaScript', 'React'],
            experience: 'Senior Developer',
            // Missing: hourlyRate, availability, education, languages, portfolio
            // 4 out of 9 fields = 44%
          }

          // When
          const completeness = ProfileService.calculateProfileCompleteness(user)

          // Then
          expect(completeness).toBe(44)
        })
      })
    })

    describe('given a user with empty string values', () => {
      describe('when calculating profile completeness', () => {
        it('then treats empty strings as incomplete', () => {
          // Given
          const user: User = {
            ...baseUser,
            bio: '',
            experience: '',
            education: '',
          }

          // When
          const completeness = ProfileService.calculateProfileCompleteness(user)

          // Then
          expect(completeness).toBe(0)
        })
      })
    })

    describe('given a user with empty arrays', () => {
      describe('when calculating profile completeness', () => {
        it('then treats empty arrays as incomplete', () => {
          // Given
          const user: User = {
            ...baseUser,
            userType: 'job-seeker',
            skills: [],
            languages: [],
            portfolio: [],
          }

          // When
          const completeness = ProfileService.calculateProfileCompleteness(user)

          // Then
          expect(completeness).toBe(0)
        })
      })
    })

    describe('given a user with populated arrays', () => {
      describe('when calculating profile completeness', () => {
        it('then treats populated arrays as complete', () => {
          // Given
          const user: User = {
            ...baseUser,
            userType: 'job-seeker', // Note: hyphen, not underscore
            skills: ['JavaScript'],
            languages: ['English'],
            portfolio: [
              {
                id: 'port-1',
                title: 'Project 1',
                description: 'Description',
                imageUrl: 'https://example.com/img.jpg',
                category: 'web-development',
                completedAt: new Date('2024-01-01'),
              },
            ],
            // 3 out of 9 fields = 33%
          }

          // When
          const completeness = ProfileService.calculateProfileCompleteness(user)

          // Then
          expect(completeness).toBe(33)
        })
      })
    })

    describe('given a job seeker with portfolio vs employer with certifications', () => {
      describe('when calculating profile completeness', () => {
        it('then uses userType-specific fields correctly', () => {
          // Given
          const jobSeeker: User = {
            ...baseUser,
            userType: 'job-seeker', // Note: hyphen, not underscore
            bio: 'Bio',
            portfolio: [
              {
                id: 'port-1',
                title: 'Project',
                description: 'Desc',
                imageUrl: 'url',
                category: 'web-development',
                completedAt: new Date('2024-01-01'),
              },
            ],
            // 2 out of 9 fields = 22%
          }

          const employer: User = {
            ...baseUser,
            userType: 'employer',
            bio: 'Bio',
            certifications: ['Cert'],
            // 2 out of 9 fields = 22%
          }

          // When
          const jobSeekerCompleteness = ProfileService.calculateProfileCompleteness(jobSeeker)
          const employerCompleteness = ProfileService.calculateProfileCompleteness(employer)

          // Then
          expect(jobSeekerCompleteness).toBe(22)
          expect(employerCompleteness).toBe(22)
          // Both should have the same completeness since they filled the same relative fields
          expect(jobSeekerCompleteness).toBe(employerCompleteness)
        })
      })
    })

    describe('given a user with null values', () => {
      describe('when calculating profile completeness', () => {
        it('then treats null values as incomplete', () => {
          // Given
          const user: User = {
            ...baseUser,
            bio: null as any,
            profilePhoto: null as any,
            skills: null as any,
          }

          // When
          const completeness = ProfileService.calculateProfileCompleteness(user)

          // Then
          expect(completeness).toBe(0)
        })
      })
    })

    describe('given a user with undefined values', () => {
      describe('when calculating profile completeness', () => {
        it('then treats undefined values as incomplete', () => {
          // Given
          const user: User = {
            ...baseUser,
            bio: undefined,
            profilePhoto: undefined,
            skills: undefined,
          }

          // When
          const completeness = ProfileService.calculateProfileCompleteness(user)

          // Then
          expect(completeness).toBe(0)
        })
      })
    })

    describe('given a user with mixed complete and incomplete fields', () => {
      describe('when calculating profile completeness', () => {
        it('then returns correct percentage', () => {
          // Given
          const user: User = {
            ...baseUser,
            userType: 'job-seeker', // Note: hyphen, not underscore
            bio: 'My bio',
            profilePhoto: 'https://example.com/photo.jpg',
            skills: ['JavaScript'],
            // Missing: experience, hourlyRate, availability, education, languages, portfolio
            // 3 fields filled out of 9 total = 33%
          }

          // When
          const completeness = ProfileService.calculateProfileCompleteness(user)

          // Then
          expect(completeness).toBe(33)
        })
      })
    })

    describe('given a user with zero hourlyRate', () => {
      describe('when calculating profile completeness', () => {
        it('then treats zero as a valid value since it passes !== checks', () => {
          // Given
          const user: User = {
            ...baseUser,
            hourlyRate: 0,
            // 0 passes the filter (field !== null && field !== undefined && field !== '')
            // 1 out of 9 fields = 11%
          }

          // When
          const completeness = ProfileService.calculateProfileCompleteness(user)

          // Then
          // hourlyRate: 0 does count as filled (passes !== null, undefined, '')
          expect(completeness).toBe(11)
        })
      })
    })

    describe('given completeness calculation', () => {
      describe('when result has decimals', () => {
        it('then rounds to nearest integer', () => {
          // Given
          const user: User = {
            ...baseUser,
            userType: 'job-seeker', // Note: hyphen, not underscore
            bio: 'Bio',
            profilePhoto: 'Photo',
            // 2 out of 9 fields = 22.22% rounded to 22
          }

          // When
          const completeness = ProfileService.calculateProfileCompleteness(user)

          // Then
          expect(Number.isInteger(completeness)).toBe(true)
          expect(completeness).toBe(22)
        })
      })
    })

    describe('given different userType values', () => {
      describe('when calculating for informal worker', () => {
        it('then uses job-seeker logic (portfolio)', () => {
          // Given
          const user: User = {
            ...baseUser,
            userType: 'job-seeker',
            workSector: 'informal',
            bio: 'Bio',
            portfolio: [
              {
                id: 'port-1',
                title: 'Work',
                description: 'Desc',
                imageUrl: 'url',
                category: 'web-development',
                completedAt: new Date('2024-01-01'),
              },
            ],
          }

          // When
          const completeness = ProfileService.calculateProfileCompleteness(user)

          // Then
          expect(completeness).toBeGreaterThan(0)
        })
      })
    })

    describe('given edge case with all fields as false boolean', () => {
      describe('when calculating profile completeness', () => {
        it('then treats false as a valid value since it passes !== checks', () => {
          // Given
          const user: User = {
            ...baseUser,
            availability: false as any, // Unusual but tests edge case
            // False passes the filter (field !== null && field !== undefined && field !== '')
            // 1 out of 9 fields = 11%
          }

          // When
          const completeness = ProfileService.calculateProfileCompleteness(user)

          // Then
          // False does count as filled (passes !== null, undefined, '')
          expect(completeness).toBe(11)
        })
      })
    })
  })

  describe('File Validation Security', () => {
    describe('validateImageFile', () => {
      // Access private method for testing purposes
      const validateImageFile = (ProfileService as any).validateImageFile.bind(ProfileService)

      describe('File Size Validation', () => {
        it('should reject files larger than 5MB', () => {
          const largeFile = new File(
            [new ArrayBuffer(6 * 1024 * 1024)],
            'large-photo.jpg',
            { type: 'image/jpeg' }
          )

          expect(() => validateImageFile(largeFile)).toThrow('File size must be less than 5MB')
        })

        it('should reject files smaller than 1KB', () => {
          const tinyFile = new File(
            [new ArrayBuffer(500)],
            'tiny-photo.jpg',
            { type: 'image/jpeg' }
          )

          expect(() => validateImageFile(tinyFile)).toThrow('File is too small to be a valid image')
        })

        it('should accept files between 1KB and 5MB', () => {
          const validFile = new File(
            [new ArrayBuffer(2 * 1024 * 1024)],
            'valid-photo.jpg',
            { type: 'image/jpeg' }
          )

          expect(() => validateImageFile(validFile)).not.toThrow()
        })
      })

      describe('File Type Validation', () => {
        it('should accept JPEG images', () => {
          const jpegFile = new File(
            [new ArrayBuffer(100 * 1024)],
            'photo.jpg',
            { type: 'image/jpeg' }
          )

          expect(() => validateImageFile(jpegFile)).not.toThrow()
        })

        it('should accept PNG images', () => {
          const pngFile = new File(
            [new ArrayBuffer(100 * 1024)],
            'photo.png',
            { type: 'image/png' }
          )

          expect(() => validateImageFile(pngFile)).not.toThrow()
        })

        it('should reject PDF files', () => {
          const pdfFile = new File(
            [new ArrayBuffer(100 * 1024)],
            'document.pdf',
            { type: 'application/pdf' }
          )

          expect(() => validateImageFile(pdfFile)).toThrow('Only JPEG and PNG images are allowed')
        })

        it('should reject Word documents', () => {
          const docxFile = new File(
            [new ArrayBuffer(100 * 1024)],
            'document.docx',
            { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
          )

          expect(() => validateImageFile(docxFile)).toThrow('Only JPEG and PNG images are allowed')
        })

        it('should reject executable files', () => {
          const exeFile = new File(
            [new ArrayBuffer(100 * 1024)],
            'malware.exe',
            { type: 'application/x-msdownload' }
          )

          expect(() => validateImageFile(exeFile)).toThrow('Only JPEG and PNG images are allowed')
        })

        it('should reject SVG files (XSS risk)', () => {
          const svgFile = new File(
            [new ArrayBuffer(100 * 1024)],
            'image.svg',
            { type: 'image/svg+xml' }
          )

          expect(() => validateImageFile(svgFile)).toThrow('Only JPEG and PNG images are allowed')
        })
      })

      describe('File Extension Validation', () => {
        it('should reject files with no extension', () => {
          const noExtFile = new File(
            [new ArrayBuffer(100 * 1024)],
            'photo',
            { type: 'image/jpeg' }
          )

          expect(() => validateImageFile(noExtFile)).toThrow('Invalid file extension')
        })

        it('should reject files with executable extensions', () => {
          const exeFile = new File(
            [new ArrayBuffer(100 * 1024)],
            'photo.exe',
            { type: 'image/jpeg' }
          )

          expect(() => validateImageFile(exeFile)).toThrow('Invalid file extension')
        })

        it('should reject files with script extensions', () => {
          const jsFile = new File(
            [new ArrayBuffer(100 * 1024)],
            'photo.js',
            { type: 'image/jpeg' }
          )

          expect(() => validateImageFile(jsFile)).toThrow('Invalid file extension')
        })

        it('should accept uppercase extensions', () => {
          const upperFile = new File(
            [new ArrayBuffer(100 * 1024)],
            'photo.JPG',
            { type: 'image/jpeg' }
          )

          expect(() => validateImageFile(upperFile)).not.toThrow()
        })

        it('should accept mixed case extensions', () => {
          const mixedFile = new File(
            [new ArrayBuffer(100 * 1024)],
            'photo.PnG',
            { type: 'image/png' }
          )

          expect(() => validateImageFile(mixedFile)).not.toThrow()
        })
      })

      describe('Extension and MIME Type Mismatch', () => {
        it('should reject file with JPEG mime but PDF extension', () => {
          const mismatchFile = new File(
            [new ArrayBuffer(100 * 1024)],
            'photo.pdf',
            { type: 'image/jpeg' }
          )

          expect(() => validateImageFile(mismatchFile)).toThrow('Invalid file extension')
        })

        it('should reject file with PNG mime but EXE extension', () => {
          const mismatchFile = new File(
            [new ArrayBuffer(100 * 1024)],
            'photo.exe',
            { type: 'image/png' }
          )

          expect(() => validateImageFile(mismatchFile)).toThrow('Invalid file extension')
        })
      })
    })
  })
})
