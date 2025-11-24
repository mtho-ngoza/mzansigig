// @ts-nocheck
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { v4 as uuidv4 } from 'uuid'

// Mock Firebase lib
jest.mock('@/lib/firebase', () => ({
  storage: {},
}))

// Mock Firebase storage
jest.mock('firebase/storage', () => ({
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
}))

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}))

// Mock messageValidation
jest.mock('@/lib/utils/messageValidation', () => ({
  sanitizeFilename: jest.fn((filename) => filename.replace(/[<>:"\/\\|?*]/g, '_')),
  validateFileExtension: jest.fn((filename) => {
    const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'txt', 'zip']
    const ext = filename.split('.').pop()?.toLowerCase()
    return ext && validExtensions.includes(ext)
      ? { isValid: true }
      : { isValid: false, message: `File type .${ext} is not allowed` }
  }),
}))

// Import after mocks
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

  describe('uploadMessageFile', () => {
    const mockUserId = 'user-123'
    const mockConversationId = 'conv-456'
    const mockMessageId = 'msg-789'
    const mockUuid = 'uuid-abc-def'
    const mockDownloadUrl = 'https://storage.googleapis.com/bucket/path/to/file.jpg'

    beforeEach(() => {
      // Reset mocks
      jest.clearAllMocks()

      // Setup default mock implementations
      (uuidv4 as jest.Mock).mockReturnValue(mockUuid)
      jest.mocked(ref).mockReturnValue({ fullPath: 'mock-path' } as any)
      jest.mocked(uploadBytes).mockResolvedValue({} as any)
      jest.mocked(getDownloadURL).mockResolvedValue(mockDownloadUrl)
    })

    describe('given valid file', () => {
      describe('when uploading message file', () => {
        it('then uploads to correct path matching storage rules', async () => {
          // Given
          const file = new File(['content'], 'document.pdf', { type: 'application/pdf' })
          Object.defineProperty(file, 'size', { value: 1024 * 1024 }) // 1MB

          // When
          await FileService.uploadMessageFile(mockUserId, mockConversationId, mockMessageId, file)

          // Then
          expect(ref).toHaveBeenCalledWith(
            expect.anything(),
            `messages/${mockConversationId}/${mockMessageId}/${mockUuid}.pdf`
          )
        })

        it('then includes correct metadata', async () => {
          // Given
          const file = new File(['content'], 'photo.jpg', { type: 'image/jpeg' })
          Object.defineProperty(file, 'size', { value: 1024 * 1024 })

          // When
          await FileService.uploadMessageFile(mockUserId, mockConversationId, mockMessageId, file)

          // Then
          expect(uploadBytes).toHaveBeenCalledWith(
            expect.anything(),
            file,
            expect.objectContaining({
              contentType: 'image/jpeg',
              customMetadata: {
                uploadedBy: mockUserId,
                conversationId: mockConversationId,
                messageId: mockMessageId,
                originalName: 'photo.jpg'
              }
            })
          )
        })

        it('then returns file data with sanitized filename', async () => {
          // Given
          const file = new File(['content'], 'my-document.pdf', { type: 'application/pdf' })
          Object.defineProperty(file, 'size', { value: 2048 })

          // When
          const result = await FileService.uploadMessageFile(mockUserId, mockConversationId, mockMessageId, file)

          // Then
          expect(result).toEqual({
            fileName: 'my-document.pdf',
            fileUrl: mockDownloadUrl,
            fileSize: 2048
          })
        })
      })
    })

    describe('given file with dangerous filename', () => {
      describe('when uploading message file', () => {
        it('then sanitizes filename in metadata', async () => {
          // Given
          const file = new File(['content'], '../../../etc/passwd.txt', { type: 'text/plain' })
          Object.defineProperty(file, 'size', { value: 1024 })

          // When
          await FileService.uploadMessageFile(mockUserId, mockConversationId, mockMessageId, file)

          // Then - sanitizeFilename should be called and unsafe characters removed
          const metadata = jest.mocked(uploadBytes).mock.calls[0][2]
          // Original filename had slashes and dots which should be replaced with underscores
          expect(metadata?.customMetadata?.originalName).toBe('.._.._.._etc_passwd.txt')
          // Verify it doesn't contain actual path separators
          expect(metadata?.customMetadata?.originalName).not.toContain('/')
          expect(metadata?.customMetadata?.originalName).not.toContain('\\')
        })
      })
    })

    describe('given file exceeding size limit', () => {
      describe('when uploading message file', () => {
        it('then throws error', async () => {
          // Given
          const file = new File(['content'], 'large-file.pdf', { type: 'application/pdf' })
          Object.defineProperty(file, 'size', { value: 26 * 1024 * 1024 }) // 26MB (over 25MB limit)

          // When / Then
          await expect(
            FileService.uploadMessageFile(mockUserId, mockConversationId, mockMessageId, file)
          ).rejects.toThrow('File size must be less than 25MB')
        })
      })
    })

    describe('given file at size limit boundary', () => {
      describe('when uploading message file', () => {
        it('then accepts exactly 25MB', async () => {
          // Given
          const file = new File(['content'], 'max-size.pdf', { type: 'application/pdf' })
          Object.defineProperty(file, 'size', { value: 25 * 1024 * 1024 }) // Exactly 25MB

          // When
          const result = await FileService.uploadMessageFile(mockUserId, mockConversationId, mockMessageId, file)

          // Then
          expect(result).toBeDefined()
          expect(uploadBytes).toHaveBeenCalled()
        })
      })
    })

    describe('given invalid file type', () => {
      describe('when uploading message file', () => {
        it('then throws error for executable', async () => {
          // Given
          const file = new File(['content'], 'malware.exe', { type: 'application/x-msdownload' })
          Object.defineProperty(file, 'size', { value: 1024 })

          // When / Then
          await expect(
            FileService.uploadMessageFile(mockUserId, mockConversationId, mockMessageId, file)
          ).rejects.toThrow('File type not allowed')
        })

        it('then throws error for script file', async () => {
          // Given
          const file = new File(['content'], 'script.js', { type: 'application/javascript' })
          Object.defineProperty(file, 'size', { value: 1024 })

          // When / Then
          await expect(
            FileService.uploadMessageFile(mockUserId, mockConversationId, mockMessageId, file)
          ).rejects.toThrow('File type not allowed')
        })
      })
    })

    describe('given invalid file extension', () => {
      describe('when uploading message file', () => {
        it('then throws error for .exe extension', async () => {
          // Given
          const file = new File(['content'], 'program.exe', { type: 'application/pdf' })
          Object.defineProperty(file, 'size', { value: 1024 })

          // When / Then
          await expect(
            FileService.uploadMessageFile(mockUserId, mockConversationId, mockMessageId, file)
          ).rejects.toThrow()
        })
      })
    })

    describe('given uppercase file extension', () => {
      describe('when uploading message file', () => {
        it('then normalizes to lowercase in storage path', async () => {
          // Given
          const file = new File(['content'], 'PHOTO.JPG', { type: 'image/jpeg' })
          Object.defineProperty(file, 'size', { value: 1024 })

          // When
          await FileService.uploadMessageFile(mockUserId, mockConversationId, mockMessageId, file)

          // Then - extension should be lowercase in path
          expect(ref).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining('.jpg')
          )
        })
      })
    })

    describe('given storage upload fails', () => {
      describe('when uploading message file', () => {
        it('then throws descriptive error', async () => {
          // Given
          const file = new File(['content'], 'photo.jpg', { type: 'image/jpeg' })
          Object.defineProperty(file, 'size', { value: 1024 })
          jest.mocked(uploadBytes).mockRejectedValueOnce(new Error('Network error'))

          // When / Then
          await expect(
            FileService.uploadMessageFile(mockUserId, mockConversationId, mockMessageId, file)
          ).rejects.toThrow('Network error')
        })
      })
    })

    describe('given multiple files uploaded to same message', () => {
      describe('when uploading message files', () => {
        it('then generates unique filenames for each', async () => {
          // Given
          const file1 = new File(['content1'], 'photo.jpg', { type: 'image/jpeg' })
          const file2 = new File(['content2'], 'photo.jpg', { type: 'image/jpeg' })
          Object.defineProperty(file1, 'size', { value: 1024 })
          Object.defineProperty(file2, 'size', { value: 1024 })

          (uuidv4 as jest.Mock)
            .mockReturnValueOnce('uuid-1')
            .mockReturnValueOnce('uuid-2')

          // When
          await FileService.uploadMessageFile(mockUserId, mockConversationId, mockMessageId, file1)
          await FileService.uploadMessageFile(mockUserId, mockConversationId, mockMessageId, file2)

          // Then
          expect(ref).toHaveBeenNthCalledWith(
            1,
            expect.anything(),
            `messages/${mockConversationId}/${mockMessageId}/uuid-1.jpg`
          )
          expect(ref).toHaveBeenNthCalledWith(
            2,
            expect.anything(),
            `messages/${mockConversationId}/${mockMessageId}/uuid-2.jpg`
          )
        })
      })
    })
  })
})
