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
          message: 'I am interested',
          proposedRate: 5000,
          status: 'pending',
          createdAt: new Date()
        },
        {
          id: 'app-2',
          gigId: mockGigId,
          applicantId: 'user-2',
          applicantName: 'Jane Smith',
          message: 'I have experience',
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
        message: 'I am interested',
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
        message: 'I am interested',
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
        message: 'I am interested',
        proposedRate: 5000,
        status: 'pending',
        createdAt: new Date()
      };

      const otherApplication: GigApplication = {
        id: 'app-other',
        gigId: mockGigId,
        applicantId: 'other-user',
        applicantName: 'Jane Smith',
        message: 'I want this job',
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
        message: 'I am interested in this opportunity',
        proposedRate: 5000
      };

      const mockGig = {
        id: mockGigId,
        status: 'open' as const
      };
      (FirestoreService.getById as jest.Mock).mockResolvedValue(mockGig);
      (FirestoreService.getWhere as jest.Mock).mockResolvedValue([]); // No existing applications
      (FirestoreService.getWhereCompound as jest.Mock).mockResolvedValue([]); // No duplicate applications
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

      // Should call getById to validate gig but not update it
      expect(FirestoreService.getById).toHaveBeenCalledWith('gigs', mockGigId);
      // Should NOT update gig (since no maxApplicants limit)
      expect(FirestoreService.update).not.toHaveBeenCalled();
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
          message: 'I am interested',
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
          message: 'I am interested',
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

  describe('hasUserApplied', () => {
    it('should return true when user has applied to the gig', async () => {
      const mockApplications: GigApplication[] = [
        {
          id: 'app-1',
          gigId: mockGigId,
          applicantId: mockApplicantId,
          applicantName: 'John Doe',
          message: 'I am interested',
          proposedRate: 5000,
          status: 'pending',
          createdAt: new Date()
        },
        {
          id: 'app-2',
          gigId: mockGigId,
          applicantId: 'other-user',
          applicantName: 'Jane Smith',
          message: 'I want this job',
          proposedRate: 4500,
          status: 'pending',
          createdAt: new Date()
        }
      ];

      (FirestoreService.getWhere as jest.Mock).mockResolvedValue(mockApplications);

      const result = await GigService.hasUserApplied(mockGigId, mockApplicantId);

      expect(result).toBe(true);
      expect(FirestoreService.getWhere).toHaveBeenCalledWith(
        'applications',
        'gigId',
        '==',
        mockGigId,
        'createdAt'
      );
    });

    it('should return false when user has not applied to the gig', async () => {
      const mockApplications: GigApplication[] = [
        {
          id: 'app-1',
          gigId: mockGigId,
          applicantId: 'other-user-1',
          applicantName: 'Jane Smith',
          message: 'I want this job',
          proposedRate: 4500,
          status: 'pending',
          createdAt: new Date()
        },
        {
          id: 'app-2',
          gigId: mockGigId,
          applicantId: 'other-user-2',
          applicantName: 'Bob Johnson',
          message: 'I have experience',
          proposedRate: 5500,
          status: 'pending',
          createdAt: new Date()
        }
      ];

      (FirestoreService.getWhere as jest.Mock).mockResolvedValue(mockApplications);

      const result = await GigService.hasUserApplied(mockGigId, mockApplicantId);

      expect(result).toBe(false);
    });

    it('should return false when there are no applications for the gig', async () => {
      (FirestoreService.getWhere as jest.Mock).mockResolvedValue([]);

      const result = await GigService.hasUserApplied(mockGigId, mockApplicantId);

      expect(result).toBe(false);
    });

    it('should return true even if application is rejected or accepted', async () => {
      const mockApplications: GigApplication[] = [
        {
          id: 'app-1',
          gigId: mockGigId,
          applicantId: mockApplicantId,
          applicantName: 'John Doe',
          message: 'I am interested',
          proposedRate: 5000,
          status: 'rejected',
          createdAt: new Date()
        }
      ];

      (FirestoreService.getWhere as jest.Mock).mockResolvedValue(mockApplications);

      const result = await GigService.hasUserApplied(mockGigId, mockApplicantId);

      expect(result).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      (FirestoreService.getWhere as jest.Mock).mockRejectedValue(
        new Error('Firestore error')
      );

      await expect(GigService.hasUserApplied(mockGigId, mockApplicantId)).rejects.toThrow();
    });
  });

  describe('withdrawApplication', () => {
    const mockPendingApplication: GigApplication = {
      id: mockApplicationId,
      gigId: mockGigId,
      applicantId: mockApplicantId,
      applicantName: 'John Doe',
      message: 'I am interested',
      proposedRate: 5000,
      status: 'pending',
      createdAt: new Date()
    };

    it('should successfully withdraw a pending application', async () => {
      (FirestoreService.getById as jest.Mock).mockResolvedValue(mockPendingApplication);
      (FirestoreService.update as jest.Mock).mockResolvedValue(undefined);

      await GigService.withdrawApplication(mockApplicationId);

      expect(FirestoreService.getById).toHaveBeenCalledWith('applications', mockApplicationId);
      expect(FirestoreService.update).toHaveBeenCalledWith(
        'applications',
        mockApplicationId,
        { status: 'withdrawn' }
      );
    });

    it('should throw error when application is not found', async () => {
      (FirestoreService.getById as jest.Mock).mockResolvedValue(null);

      await expect(GigService.withdrawApplication(mockApplicationId)).rejects.toThrow(
        'Application not found'
      );

      expect(FirestoreService.update).not.toHaveBeenCalled();
    });

    it('should throw error when trying to withdraw an accepted application', async () => {
      const acceptedApplication: GigApplication = {
        ...mockPendingApplication,
        status: 'accepted'
      };

      (FirestoreService.getById as jest.Mock).mockResolvedValue(acceptedApplication);

      await expect(GigService.withdrawApplication(mockApplicationId)).rejects.toThrow(
        'Cannot withdraw application with status: accepted. Only pending applications can be withdrawn.'
      );

      expect(FirestoreService.update).not.toHaveBeenCalled();
    });

    it('should throw error when trying to withdraw a rejected application', async () => {
      const rejectedApplication: GigApplication = {
        ...mockPendingApplication,
        status: 'rejected'
      };

      (FirestoreService.getById as jest.Mock).mockResolvedValue(rejectedApplication);

      await expect(GigService.withdrawApplication(mockApplicationId)).rejects.toThrow(
        'Cannot withdraw application with status: rejected. Only pending applications can be withdrawn.'
      );

      expect(FirestoreService.update).not.toHaveBeenCalled();
    });

    it('should throw error when trying to withdraw a funded application', async () => {
      const fundedApplication: GigApplication = {
        ...mockPendingApplication,
        status: 'funded'
      };

      (FirestoreService.getById as jest.Mock).mockResolvedValue(fundedApplication);

      await expect(GigService.withdrawApplication(mockApplicationId)).rejects.toThrow(
        'Cannot withdraw application with status: funded. Only pending applications can be withdrawn.'
      );

      expect(FirestoreService.update).not.toHaveBeenCalled();
    });

    it('should throw error when trying to withdraw a completed application', async () => {
      const completedApplication: GigApplication = {
        ...mockPendingApplication,
        status: 'completed'
      };

      (FirestoreService.getById as jest.Mock).mockResolvedValue(completedApplication);

      await expect(GigService.withdrawApplication(mockApplicationId)).rejects.toThrow(
        'Cannot withdraw application with status: completed. Only pending applications can be withdrawn.'
      );

      expect(FirestoreService.update).not.toHaveBeenCalled();
    });

    it('should throw error when trying to withdraw an already withdrawn application', async () => {
      const withdrawnApplication: GigApplication = {
        ...mockPendingApplication,
        status: 'withdrawn'
      };

      (FirestoreService.getById as jest.Mock).mockResolvedValue(withdrawnApplication);

      await expect(GigService.withdrawApplication(mockApplicationId)).rejects.toThrow(
        'Cannot withdraw application with status: withdrawn. Only pending applications can be withdrawn.'
      );

      expect(FirestoreService.update).not.toHaveBeenCalled();
    });

    it('should handle Firestore errors when updating status', async () => {
      (FirestoreService.getById as jest.Mock).mockResolvedValue(mockPendingApplication);
      (FirestoreService.update as jest.Mock).mockRejectedValue(
        new Error('Firestore update error')
      );

      await expect(GigService.withdrawApplication(mockApplicationId)).rejects.toThrow(
        'Firestore update error'
      );
    });
  });

  describe('createApplication - Duplicate Prevention', () => {
    const mockGig: Gig = {
      id: mockGigId,
      title: 'Test Gig',
      description: 'Test Description',
      category: 'technology',
      location: 'Johannesburg',
      budget: 1000,
      duration: '1 week',
      skillsRequired: ['JavaScript'],
      employerId: mockEmployerId,
      employerName: 'Employer Name',
      status: 'open',
      applicants: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const mockApplicationData = {
      gigId: mockGigId,
      applicantId: mockApplicantId,
      applicantName: 'John Doe',
      message: 'I am interested',
      proposedRate: 1000
    };

    beforeEach(() => {
      (FirestoreService.getById as jest.Mock).mockResolvedValue(mockGig);
    });

    it('should prevent duplicate applications from same user to same gig', async () => {
      // Mock existing application
      const existingApplication: GigApplication = {
        id: 'existing-app-123',
        gigId: mockGigId,
        applicantId: mockApplicantId,
        applicantName: 'John Doe',
        message: 'Previous application',
        proposedRate: 900,
        status: 'pending',
        createdAt: new Date()
      };

      (FirestoreService.getWhereCompound as jest.Mock).mockResolvedValue([existingApplication]);

      await expect(GigService.createApplication(mockApplicationData)).rejects.toThrow(
        'You have already applied to this gig'
      );

      expect(FirestoreService.getWhereCompound).toHaveBeenCalledWith(
        'applications',
        [
          { field: 'gigId', operator: '==', value: mockGigId },
          { field: 'applicantId', operator: '==', value: mockApplicantId }
        ]
      );
      expect(FirestoreService.create).not.toHaveBeenCalled();
    });

    it('should allow application when user has not applied before', async () => {
      (FirestoreService.getWhereCompound as jest.Mock).mockResolvedValue([]);
      (FirestoreService.create as jest.Mock).mockResolvedValue('new-app-123');
      (FirestoreService.getWhere as jest.Mock).mockResolvedValue([]);

      const applicationId = await GigService.createApplication(mockApplicationData);

      expect(applicationId).toBe('new-app-123');
      expect(FirestoreService.create).toHaveBeenCalledWith(
        'applications',
        expect.objectContaining({
          gigId: mockGigId,
          applicantId: mockApplicantId,
          status: 'pending'
        })
      );
    });

    it('should allow re-application if previous application was withdrawn', async () => {
      const withdrawnApplication: GigApplication = {
        id: 'withdrawn-app-123',
        gigId: mockGigId,
        applicantId: mockApplicantId,
        applicantName: 'John Doe',
        message: 'Previous application',
        proposedRate: 900,
        status: 'withdrawn',
        createdAt: new Date()
      };

      (FirestoreService.getWhereCompound as jest.Mock).mockResolvedValue([withdrawnApplication]);
      (FirestoreService.create as jest.Mock).mockResolvedValue('new-app-456');
      (FirestoreService.getWhere as jest.Mock).mockResolvedValue([withdrawnApplication]);

      const applicationId = await GigService.createApplication(mockApplicationData);

      expect(applicationId).toBe('new-app-456');
      expect(FirestoreService.create).toHaveBeenCalled();
    });

    it('should prevent duplicate application even if one is rejected', async () => {
      const rejectedApplication: GigApplication = {
        id: 'rejected-app-123',
        gigId: mockGigId,
        applicantId: mockApplicantId,
        applicantName: 'John Doe',
        message: 'Previous application',
        proposedRate: 900,
        status: 'rejected',
        createdAt: new Date()
      };

      (FirestoreService.getWhereCompound as jest.Mock).mockResolvedValue([rejectedApplication]);

      await expect(GigService.createApplication(mockApplicationData)).rejects.toThrow(
        'You have already applied to this gig'
      );

      expect(FirestoreService.create).not.toHaveBeenCalled();
    });

    it('should prevent duplicate application if one is accepted', async () => {
      const acceptedApplication: GigApplication = {
        id: 'accepted-app-123',
        gigId: mockGigId,
        applicantId: mockApplicantId,
        applicantName: 'John Doe',
        message: 'Previous application',
        proposedRate: 900,
        status: 'accepted',
        createdAt: new Date()
      };

      (FirestoreService.getWhereCompound as jest.Mock).mockResolvedValue([acceptedApplication]);

      await expect(GigService.createApplication(mockApplicationData)).rejects.toThrow(
        'You have already applied to this gig'
      );

      expect(FirestoreService.create).not.toHaveBeenCalled();
    });
  });
});
