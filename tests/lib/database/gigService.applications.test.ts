/**
 * GigService Application Tests
 * Tests for application count queries, status updates, and permissions
 */

import { GigService } from '@/lib/database/gigService';
import { FirestoreService } from '@/lib/database/firestore';
import { Gig, GigApplication } from '@/types/gig';

// Mock FirestoreService
jest.mock('@/lib/database/firestore');

describe('GigService - Application Management', () => {
  const mockGigId = 'test-gig-123';
  const mockApplicationId = 'test-app-123';
  const mockEmployerId = 'employer-123';
  const mockApplicantId = 'applicant-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getApplicationCountByGig', () => {
    it('should return the count of applications for a gig', async () => {
      const mockApplications: GigApplication[] = [
        {
          id: 'app-1',
          gigId: mockGigId,
          applicantId: 'user-1',
          applicantName: 'John Doe',
          coverLetter: 'I am interested',
          proposedRate: 5000,
          status: 'pending',
          createdAt: new Date()
        },
        {
          id: 'app-2',
          gigId: mockGigId,
          applicantId: 'user-2',
          applicantName: 'Jane Smith',
          coverLetter: 'I have experience',
          proposedRate: 5500,
          status: 'pending',
          createdAt: new Date()
        }
      ];

      (FirestoreService.getWhere as jest.Mock).mockResolvedValue(mockApplications);

      const count = await GigService.getApplicationCountByGig(mockGigId);

      expect(count).toBe(2);
      expect(FirestoreService.getWhere).toHaveBeenCalledWith(
        'applications',
        'gigId',
        '==',
        mockGigId
      );
    });

    it('should return 0 when no applications exist', async () => {
      (FirestoreService.getWhere as jest.Mock).mockResolvedValue([]);

      const count = await GigService.getApplicationCountByGig(mockGigId);

      expect(count).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      (FirestoreService.getWhere as jest.Mock).mockRejectedValue(
        new Error('Firestore error')
      );

      await expect(GigService.getApplicationCountByGig(mockGigId)).rejects.toThrow();
    });
  });

  describe('updateApplicationStatus', () => {
    it('should update application status to accepted', async () => {
      const mockApplication: GigApplication = {
        id: mockApplicationId,
        gigId: mockGigId,
        applicantId: mockApplicantId,
        applicantName: 'John Doe',
        coverLetter: 'I am interested',
        proposedRate: 5000,
        status: 'pending',
        createdAt: new Date()
      };

      (FirestoreService.getById as jest.Mock).mockResolvedValue(mockApplication);
      (FirestoreService.update as jest.Mock).mockResolvedValue(undefined);
      (FirestoreService.getWhere as jest.Mock).mockResolvedValue([mockApplication]);

      await GigService.updateApplicationStatus(mockApplicationId, 'accepted');

      expect(FirestoreService.update).toHaveBeenCalledWith(
        'applications',
        mockApplicationId,
        { status: 'accepted' }
      );
    });

    it('should update gig status when application is accepted', async () => {
      const mockApplication: GigApplication = {
        id: mockApplicationId,
        gigId: mockGigId,
        applicantId: mockApplicantId,
        applicantName: 'John Doe',
        coverLetter: 'I am interested',
        proposedRate: 5000,
        status: 'pending',
        createdAt: new Date()
      };

      (FirestoreService.getById as jest.Mock).mockResolvedValue(mockApplication);
      (FirestoreService.update as jest.Mock).mockResolvedValue(undefined);
      (FirestoreService.getWhere as jest.Mock).mockResolvedValue([mockApplication]);

      await GigService.updateApplicationStatus(mockApplicationId, 'accepted');

      // Should update gig to in-progress and assign worker
      expect(FirestoreService.update).toHaveBeenCalledWith(
        'gigs',
        mockGigId,
        expect.objectContaining({
          status: 'in-progress',
          assignedTo: mockApplicantId
        })
      );
    });

    it('should reject other applications when one is accepted', async () => {
      const mockApplication: GigApplication = {
        id: mockApplicationId,
        gigId: mockGigId,
        applicantId: mockApplicantId,
        applicantName: 'John Doe',
        coverLetter: 'I am interested',
        proposedRate: 5000,
        status: 'pending',
        createdAt: new Date()
      };

      const otherApplication: GigApplication = {
        id: 'app-other',
        gigId: mockGigId,
        applicantId: 'other-user',
        applicantName: 'Jane Smith',
        coverLetter: 'I want this job',
        proposedRate: 4500,
        status: 'pending',
        createdAt: new Date()
      };

      (FirestoreService.getById as jest.Mock).mockResolvedValue(mockApplication);
      (FirestoreService.update as jest.Mock).mockResolvedValue(undefined);
      (FirestoreService.getWhere as jest.Mock).mockResolvedValue([
        mockApplication,
        otherApplication
      ]);

      await GigService.updateApplicationStatus(mockApplicationId, 'accepted');

      // Should reject the other application
      expect(FirestoreService.update).toHaveBeenCalledWith(
        'applications',
        'app-other',
        { status: 'rejected' }
      );
    });

    it('should update status to rejected without affecting gig', async () => {
      (FirestoreService.update as jest.Mock).mockResolvedValue(undefined);

      await GigService.updateApplicationStatus(mockApplicationId, 'rejected');

      expect(FirestoreService.update).toHaveBeenCalledWith(
        'applications',
        mockApplicationId,
        { status: 'rejected' }
      );

      // Should not update gig
      expect(FirestoreService.getById).not.toHaveBeenCalled();
    });
  });

  describe('createApplication', () => {
    it('should create application without updating gig applicants array', async () => {
      const applicationData = {
        gigId: mockGigId,
        applicantId: mockApplicantId,
        applicantName: 'John Doe',
        coverLetter: 'I am interested in this opportunity',
        proposedRate: 5000
      };

      (FirestoreService.create as jest.Mock).mockResolvedValue(mockApplicationId);

      const result = await GigService.createApplication(applicationData);

      expect(result).toBe(mockApplicationId);
      expect(FirestoreService.create).toHaveBeenCalledWith(
        'applications',
        expect.objectContaining({
          ...applicationData,
          status: 'pending'
        })
      );

      // Should NOT call getGigById or updateGig
      expect(FirestoreService.getById).not.toHaveBeenCalled();
      expect(FirestoreService.update).not.toHaveBeenCalledWith(
        'gigs',
        expect.any(String),
        expect.anything()
      );
    });
  });

  describe('getApplicationsByGig', () => {
    it('should query applications by gigId', async () => {
      const mockApplications: GigApplication[] = [
        {
          id: 'app-1',
          gigId: mockGigId,
          applicantId: 'user-1',
          applicantName: 'John Doe',
          coverLetter: 'I am interested',
          proposedRate: 5000,
          status: 'pending',
          createdAt: new Date()
        }
      ];

      (FirestoreService.getWhere as jest.Mock).mockResolvedValue(mockApplications);

      const result = await GigService.getApplicationsByGig(mockGigId);

      expect(result).toEqual(mockApplications);
      expect(FirestoreService.getWhere).toHaveBeenCalledWith(
        'applications',
        'gigId',
        '==',
        mockGigId,
        'createdAt'
      );
    });
  });

  describe('getApplicationsByApplicant', () => {
    it('should query applications by applicantId', async () => {
      const mockApplications: GigApplication[] = [
        {
          id: 'app-1',
          gigId: 'gig-1',
          applicantId: mockApplicantId,
          applicantName: 'John Doe',
          coverLetter: 'I am interested',
          proposedRate: 5000,
          status: 'pending',
          createdAt: new Date()
        }
      ];

      (FirestoreService.getWhere as jest.Mock).mockResolvedValue(mockApplications);

      const result = await GigService.getApplicationsByApplicant(mockApplicantId);

      expect(result).toEqual(mockApplications);
      expect(FirestoreService.getWhere).toHaveBeenCalledWith(
        'applications',
        'applicantId',
        '==',
        mockApplicantId,
        'createdAt'
      );
    });
  });
});
