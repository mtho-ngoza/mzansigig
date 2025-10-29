import { FileService } from '@/lib/database/fileService'

describe('FileService', () => {
  describe('formatFileSize', () => {
    describe('given zero bytes', () => {
      describe('when formatting file size', () => {
        it('then returns 0 Bytes', () => {
          // Given
          const bytes = 0

          // When
          const result = FileService.formatFileSize(bytes)

          // Then
          expect(result).toBe('0 Bytes')
        })
      })
    })

    describe('given bytes less than 1 KB', () => {
      describe('when formatting file size', () => {
        it('then returns size in Bytes', () => {
          // Given
          const bytes = 512

          // When
          const result = FileService.formatFileSize(bytes)

          // Then
          expect(result).toBe('512 Bytes')
        })
      })
    })

    describe('given bytes in KB range', () => {
      describe('when formatting file size', () => {
        it('then returns size in KB with 2 decimals', () => {
          // Given
          const bytes = 1536 // 1.5 KB

          // When
          const result = FileService.formatFileSize(bytes)

          // Then
          expect(result).toBe('1.5 KB')
        })
      })
    })

    describe('given bytes in MB range', () => {
      describe('when formatting file size', () => {
        it('then returns size in MB with 2 decimals', () => {
          // Given
          const bytes = 5242880 // 5 MB

          // When
          const result = FileService.formatFileSize(bytes)

          // Then
          expect(result).toBe('5 MB')
        })
      })
    })

    describe('given bytes in GB range', () => {
      describe('when formatting file size', () => {
        it('then returns size in GB with 2 decimals', () => {
          // Given
          const bytes = 2147483648 // 2 GB

          // When
          const result = FileService.formatFileSize(bytes)

          // Then
          expect(result).toBe('2 GB')
        })
      })
    })

    describe('given fractional KB size', () => {
      describe('when formatting file size', () => {
        it('then rounds to 2 decimal places', () => {
          // Given
          const bytes = 1234 // ~1.205 KB

          // When
          const result = FileService.formatFileSize(bytes)

          // Then
          expect(result).toBe('1.21 KB')
        })
      })
    })

    describe('given exactly 1 KB', () => {
      describe('when formatting file size', () => {
        it('then returns 1 KB', () => {
          // Given
          const bytes = 1024

          // When
          const result = FileService.formatFileSize(bytes)

          // Then
          expect(result).toBe('1 KB')
        })
      })
    })

    describe('given exactly 1 MB', () => {
      describe('when formatting file size', () => {
        it('then returns 1 MB', () => {
          // Given
          const bytes = 1048576 // 1024 * 1024

          // When
          const result = FileService.formatFileSize(bytes)

          // Then
          expect(result).toBe('1 MB')
        })
      })
    })

    describe('given 10 MB (max file size)', () => {
      describe('when formatting file size', () => {
        it('then returns 10 MB', () => {
          // Given
          const bytes = 10485760 // 10 * 1024 * 1024

          // When
          const result = FileService.formatFileSize(bytes)

          // Then
          expect(result).toBe('10 MB')
        })
      })
    })
  })

  describe('isValidFileType', () => {
    describe('given valid JPEG image', () => {
      describe('when validating file type', () => {
        it('then returns true', () => {
          // Given
          const file = new File(['content'], 'photo.jpg', { type: 'image/jpeg' })

          // When
          const result = FileService.isValidFileType(file)

          // Then
          expect(result).toBe(true)
        })
      })
    })

    describe('given valid JPG image', () => {
      describe('when validating file type', () => {
        it('then returns true', () => {
          // Given
          const file = new File(['content'], 'photo.jpg', { type: 'image/jpg' })

          // When
          const result = FileService.isValidFileType(file)

          // Then
          expect(result).toBe(true)
        })
      })
    })

    describe('given valid PNG image', () => {
      describe('when validating file type', () => {
        it('then returns true', () => {
          // Given
          const file = new File(['content'], 'screenshot.png', { type: 'image/png' })

          // When
          const result = FileService.isValidFileType(file)

          // Then
          expect(result).toBe(true)
        })
      })
    })

    describe('given valid GIF image', () => {
      describe('when validating file type', () => {
        it('then returns true', () => {
          // Given
          const file = new File(['content'], 'animation.gif', { type: 'image/gif' })

          // When
          const result = FileService.isValidFileType(file)

          // Then
          expect(result).toBe(true)
        })
      })
    })

    describe('given valid WebP image', () => {
      describe('when validating file type', () => {
        it('then returns true', () => {
          // Given
          const file = new File(['content'], 'image.webp', { type: 'image/webp' })

          // When
          const result = FileService.isValidFileType(file)

          // Then
          expect(result).toBe(true)
        })
      })
    })

    describe('given valid PDF document', () => {
      describe('when validating file type', () => {
        it('then returns true', () => {
          // Given
          const file = new File(['content'], 'document.pdf', { type: 'application/pdf' })

          // When
          const result = FileService.isValidFileType(file)

          // Then
          expect(result).toBe(true)
        })
      })
    })

    describe('given valid Word document (.doc)', () => {
      describe('when validating file type', () => {
        it('then returns true', () => {
          // Given
          const file = new File(['content'], 'document.doc', {
            type: 'application/msword',
          })

          // When
          const result = FileService.isValidFileType(file)

          // Then
          expect(result).toBe(true)
        })
      })
    })

    describe('given valid Word document (.docx)', () => {
      describe('when validating file type', () => {
        it('then returns true', () => {
          // Given
          const file = new File(['content'], 'document.docx', {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          })

          // When
          const result = FileService.isValidFileType(file)

          // Then
          expect(result).toBe(true)
        })
      })
    })

    describe('given valid text file', () => {
      describe('when validating file type', () => {
        it('then returns true', () => {
          // Given
          const file = new File(['content'], 'notes.txt', { type: 'text/plain' })

          // When
          const result = FileService.isValidFileType(file)

          // Then
          expect(result).toBe(true)
        })
      })
    })

    describe('given valid ZIP archive', () => {
      describe('when validating file type', () => {
        it('then returns true', () => {
          // Given
          const file = new File(['content'], 'archive.zip', { type: 'application/zip' })

          // When
          const result = FileService.isValidFileType(file)

          // Then
          expect(result).toBe(true)
        })
      })
    })

    describe('given valid RAR archive', () => {
      describe('when validating file type', () => {
        it('then returns true', () => {
          // Given
          const file = new File(['content'], 'archive.rar', {
            type: 'application/x-rar-compressed',
          })

          // When
          const result = FileService.isValidFileType(file)

          // Then
          expect(result).toBe(true)
        })
      })
    })

    describe('given invalid file type (video)', () => {
      describe('when validating file type', () => {
        it('then returns false', () => {
          // Given
          const file = new File(['content'], 'video.mp4', { type: 'video/mp4' })

          // When
          const result = FileService.isValidFileType(file)

          // Then
          expect(result).toBe(false)
        })
      })
    })

    describe('given invalid file type (audio)', () => {
      describe('when validating file type', () => {
        it('then returns false', () => {
          // Given
          const file = new File(['content'], 'audio.mp3', { type: 'audio/mpeg' })

          // When
          const result = FileService.isValidFileType(file)

          // Then
          expect(result).toBe(false)
        })
      })
    })

    describe('given invalid file type (executable)', () => {
      describe('when validating file type', () => {
        it('then returns false', () => {
          // Given
          const file = new File(['content'], 'program.exe', {
            type: 'application/x-msdownload',
          })

          // When
          const result = FileService.isValidFileType(file)

          // Then
          expect(result).toBe(false)
        })
      })
    })

    describe('given invalid file type (script)', () => {
      describe('when validating file type', () => {
        it('then returns false', () => {
          // Given
          const file = new File(['content'], 'script.js', { type: 'application/javascript' })

          // When
          const result = FileService.isValidFileType(file)

          // Then
          expect(result).toBe(false)
        })
      })
    })

    describe('given empty MIME type', () => {
      describe('when validating file type', () => {
        it('then returns false', () => {
          // Given
          const file = new File(['content'], 'unknown', { type: '' })

          // When
          const result = FileService.isValidFileType(file)

          // Then
          expect(result).toBe(false)
        })
      })
    })
  })
})
