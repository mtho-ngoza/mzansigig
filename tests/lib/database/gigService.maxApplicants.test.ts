/**
 * GigService Max Applicants Tests
 * Tests for max applicants limit functionality
 */

import { GigService } from '@/lib/database/gigService';
import { FirestoreService } from '@/lib/database/firestore';
import { Gig, GigApplication } from '@/types/gig';

// Mock FirestoreService
jest.mock('@/lib/database/firestore');

describe('GigService - Max Applicants Feature', () => {
  const mockGigId = 'test-gig-123';
  const mockEmployerId = 'employer-123';
  const mockApplicantId = 'applicant-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createApplication with maxApplicants', () => {
    const mockGigWithMax: Gig = {
      id: mockGigId,
      title: 'Test Gig',
      description: 'Test description',
      category: 'Construction',
      location: 'Johannesburg',
      budget: 5000,
      duration: '1 week',
      skillsRequired: ['Plumbing'],
      employerId: mockEmployerId,
      employerName: 'John Employer',
      status: 'open',
      applicants: [],
      maxApplicants: 5,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const mockApplicationData = {
      gigId: mockGigId,
      applicantId: mockApplicantId,
      applicantName: 'Jane Applicant',
      message: 'I am interested',
      proposedRate: 5000
    };

    it('should allow application when under max limit', async () => {
      (FirestoreService.getById as jest.Mock).mockResolvedValue(mockGigWithMax);
      (FirestoreService.getWhere as jest.Mock).mockResolvedValue([
        { id: 'app-1' },
        { id: 'app-2' }
      ]); // 2 existing applications
      (FirestoreService.create as jest.Mock).mockResolvedValue('new-app-123');

      const result = await GigService.createApplication(mockApplicationData);

      expect(result).toBe('new-app-123');
      expect(FirestoreService.create).toHaveBeenCalled();
    });

    it('should reject application when max limit is reached', async () => {
      (FirestoreService.getById as jest.Mock).mockResolvedValue(mockGigWithMax);
      (FirestoreService.getWhere as jest.Mock).mockResolvedValue([
        { id: 'app-1' },
        { id: 'app-2' },
        { id: 'app-3' },
        { id: 'app-4' },
        { id: 'app-5' }
      ]); // 5 existing applications (at max)

      await expect(GigService.createApplication(mockApplicationData)).rejects.toThrow(
        'This gig has reached its maximum number of applicants'
      );

      expect(FirestoreService.create).not.toHaveBeenCalled();
    });

    it('should auto-close gig to "reviewing" when max applicants reached after new application', async () => {
      (FirestoreService.getById as jest.Mock).mockResolvedValue(mockGigWithMax);
      // First call (before create): 4 applications
      // Second call (after create): 5 applications
      (FirestoreService.getWhere as jest.Mock)
        .mockResolvedValueOnce([
          { id: 'app-1' },
          { id: 'app-2' },
          { id: 'app-3' },
          { id: 'app-4' }
        ])
        .mockResolvedValueOnce([
          { id: 'app-1' },
          { id: 'app-2' },
          { id: 'app-3' },
          { id: 'app-4' },
          { id: 'app-5' }
        ]);
      (FirestoreService.create as jest.Mock).mockResolvedValue('app-5');
      (FirestoreService.update as jest.Mock).mockResolvedValue(undefined);

      await GigService.createApplication(mockApplicationData);

      // Verify gig was updated to 'reviewing' status
      expect(FirestoreService.update).toHaveBeenCalledWith(
        'gigs',
        mockGigId,
        expect.objectContaining({ status: 'reviewing' })
      );
    });

    it('should not auto-close gig when under max limit', async () => {
      (FirestoreService.getById as jest.Mock).mockResolvedValue(mockGigWithMax);
      // Before create: 2 applications, After create: 3 applications
      (FirestoreService.getWhere as jest.Mock)
        .mockResolvedValueOnce([
          { id: 'app-1' },
          { id: 'app-2' }
        ])
        .mockResolvedValueOnce([
          { id: 'app-1' },
          { id: 'app-2' },
          { id: 'app-3' }
        ]);
      (FirestoreService.create as jest.Mock).mockResolvedValue('app-3');
      (FirestoreService.update as jest.Mock).mockResolvedValue(undefined);

      await GigService.createApplication(mockApplicationData);

      // Verify gig was NOT updated to 'reviewing' status
      expect(FirestoreService.update).not.toHaveBeenCalled();
    });

    it('should allow unlimited applications when maxApplicants is not set', async () => {
      const gigWithoutMax = { ...mockGigWithMax, maxApplicants: undefined };
      (FirestoreService.getById as jest.Mock).mockResolvedValue(gigWithoutMax);
      (FirestoreService.getWhere as jest.Mock).mockResolvedValue(
        Array(100).fill({ id: 'existing-app' })
      ); // 100 existing applications
      (FirestoreService.create as jest.Mock).mockResolvedValue('new-app-123');

      const result = await GigService.createApplication(mockApplicationData);

      expect(result).toBe('new-app-123');
      expect(FirestoreService.create).toHaveBeenCalled();
    });

    it('should reject application to gig with "reviewing" status', async () => {
      const gigReviewing = { ...mockGigWithMax, status: 'reviewing' as const };
      (FirestoreService.getById as jest.Mock).mockResolvedValue(gigReviewing);

      await expect(GigService.createApplication(mockApplicationData)).rejects.toThrow(
        'Cannot apply to gig with status: reviewing'
      );

      expect(FirestoreService.create).not.toHaveBeenCalled();
    });

    it('should reject application to gig with "in-progress" status', async () => {
      const gigInProgress = { ...mockGigWithMax, status: 'in-progress' as const };
      (FirestoreService.getById as jest.Mock).mockResolvedValue(gigInProgress);

      await expect(GigService.createApplication(mockApplicationData)).rejects.toThrow(
        'Cannot apply to gig with status: in-progress'
      );

      expect(FirestoreService.create).not.toHaveBeenCalled();
    });

    it('should reject application to gig with "completed" status', async () => {
      const gigCompleted = { ...mockGigWithMax, status: 'completed' as const };
      (FirestoreService.getById as jest.Mock).mockResolvedValue(gigCompleted);

      await expect(GigService.createApplication(mockApplicationData)).rejects.toThrow(
        'Cannot apply to gig with status: completed'
      );

      expect(FirestoreService.create).not.toHaveBeenCalled();
    });

    it('should reject application to gig with "cancelled" status', async () => {
      const gigCancelled = { ...mockGigWithMax, status: 'cancelled' as const };
      (FirestoreService.getById as jest.Mock).mockResolvedValue(gigCancelled);

      await expect(GigService.createApplication(mockApplicationData)).rejects.toThrow(
        'Cannot apply to gig with status: cancelled'
      );

      expect(FirestoreService.create).not.toHaveBeenCalled();
    });

    it('should reject application when gig not found', async () => {
      (FirestoreService.getById as jest.Mock).mockResolvedValue(null);

      await expect(GigService.createApplication(mockApplicationData)).rejects.toThrow(
        'Gig not found'
      );

      expect(FirestoreService.create).not.toHaveBeenCalled();
    });

    it('should handle exact maxApplicants boundary correctly', async () => {
      const gigWithMax3 = { ...mockGigWithMax, maxApplicants: 3 };
      (FirestoreService.getById as jest.Mock).mockResolvedValue(gigWithMax3);
      // Exactly 2 existing applications (1 slot left)
      (FirestoreService.getWhere as jest.Mock)
        .mockResolvedValueOnce([
          { id: 'app-1' },
          { id: 'app-2' }
        ])
        .mockResolvedValueOnce([
          { id: 'app-1' },
          { id: 'app-2' },
          { id: 'app-3' }
        ]);
      (FirestoreService.create as jest.Mock).mockResolvedValue('app-3');
      (FirestoreService.update as jest.Mock).mockResolvedValue(undefined);

      await GigService.createApplication(mockApplicationData);

      // Should succeed and auto-close
      expect(FirestoreService.create).toHaveBeenCalled();
      expect(FirestoreService.update).toHaveBeenCalledWith(
        'gigs',
        mockGigId,
        expect.objectContaining({ status: 'reviewing' })
      );
    });
  });
});
