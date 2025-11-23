/**
 * GigService Application Tests
 * Tests for application count queries, status updates, and permissions
 */

import { GigService } from '@/lib/database/gigService';
import { FirestoreService } from '@/lib/database/firestore';
import { ConfigService } from '@/lib/database/configService';
import { Gig, GigApplication } from '@/types/gig';

// Mock FirestoreService and validation utilities
jest.mock('@/lib/database/firestore');
jest.mock('@/lib/database/configService');
jest.mock('@/lib/utils/applicationValidation', () => ({
  sanitizeApplicationMessage: jest.fn((input: string) => input), // Pass through by default
  APPLICATION_TEXT_LIMITS: {
    MESSAGE_MAX: 1000,
    MESSAGE_MIN: 10
  }
}));

describe('GigService - Application Management', () => {
  const mockGigId = 'test-gig-123';
  const mockApplicationId = 'test-app-123';
  const mockEmployerId = 'employer-123';
  const mockApplicantId = 'applicant-123';

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock ConfigService to return default values
    (ConfigService.getValue as jest.Mock).mockImplementation((key: string) => {
      const defaults: Record<string, number> = {
        escrowAutoReleaseDays: 7,
        safetyCheckIntervalHours: 2,
        gigExpiryTimeoutDays: 7,
        fundingTimeoutHours: 48,
        maxActiveApplicationsPerWorker: 20,
        distanceWarningThresholdKm: 50,
        reviewDeadlineDays: 30,
      }
      return Promise.resolve(defaults[key] || 0)
    });
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
        { status: 'accepted', acceptedAt: expect.any(Date) }
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

      // Should assign worker to gig (but NOT change status - that happens when funded)
      expect(FirestoreService.update).toHaveBeenCalledWith(
        'gigs',
        mockGigId,
        expect.objectContaining({
          assignedTo: mockApplicantId
        })
      );

      // Verify gig status was NOT updated (happens only when funded)
      const gigUpdateCall = (FirestoreService.update as jest.Mock).mock.calls.find(
        (call: unknown[]) => call[0] === 'gigs' && call[1] === mockGigId
      );
      expect(gigUpdateCall?.[2]).not.toHaveProperty('status');
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
    it('should create application with sanitized message and employerId', async () => {
      const applicationData = {
        gigId: mockGigId,
        applicantId: mockApplicantId,
        applicantName: 'John Doe',
        employerId: mockEmployerId,
        message: 'I am interested in this opportunity',
        proposedRate: 5000
      };

      const mockGig = {
        id: mockGigId,
        status: 'open' as const,
        employerId: mockEmployerId
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
          gigId: mockGigId,
          applicantId: mockApplicantId,
          applicantName: 'John Doe',
          employerId: mockEmployerId,
          message: 'I am interested in this opportunity', // Sanitized (passes through in mock)
          proposedRate: 5000,
          status: 'pending'
        })
      );

      // Should call getById to validate gig but not update it
      expect(FirestoreService.getById).toHaveBeenCalledWith('gigs', mockGigId);
      // Should NOT update gig (since no maxApplicants limit)
      expect(FirestoreService.update).not.toHaveBeenCalled();
    });

    it('should sanitize message to prevent XSS attacks', async () => {
      // Import and configure the sanitization mock
      const { sanitizeApplicationMessage } = require('@/lib/utils/applicationValidation');

      // Configure mock to strip HTML tags for this test
      (sanitizeApplicationMessage as jest.Mock).mockReturnValueOnce('I am interested');

      const applicationData = {
        gigId: mockGigId,
        applicantId: mockApplicantId,
        applicantName: 'John Doe',
        employerId: mockEmployerId,
        message: '<script>alert("XSS")</script>I am interested',
        proposedRate: 5000
      };

      const mockGig = {
        id: mockGigId,
        status: 'open' as const,
        employerId: mockEmployerId
      };
      (FirestoreService.getById as jest.Mock).mockResolvedValue(mockGig);
      (FirestoreService.getWhere as jest.Mock).mockResolvedValue([]);
      (FirestoreService.getWhereCompound as jest.Mock).mockResolvedValue([]);
      (FirestoreService.create as jest.Mock).mockResolvedValue(mockApplicationId);

      await GigService.createApplication(applicationData);

      expect(sanitizeApplicationMessage).toHaveBeenCalledWith(
        '<script>alert("XSS")</script>I am interested',
        1000
      );
      expect(FirestoreService.create).toHaveBeenCalledWith(
        'applications',
        expect.objectContaining({
          message: 'I am interested' // HTML tags stripped by sanitization
        })
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
      updatedAt: new Date(),
      workType: 'remote'
    };

    const mockApplicationData = {
      gigId: mockGigId,
      applicantId: mockApplicantId,
      applicantName: 'John Doe',
      employerId: mockEmployerId,
      message: 'I am interested',
      proposedRate: 1000
    };

    beforeEach(() => {
      (FirestoreService.getById as jest.Mock).mockResolvedValue(mockGig);
      // Reset getWhere mock to prevent test pollution from previous error handling tests
      (FirestoreService.getWhere as jest.Mock).mockReset();
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

      // Mock getWhere for active applications count check (returns existing application)
      (FirestoreService.getWhere as jest.Mock).mockResolvedValue([existingApplication]);
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

      // Mock getWhere for active applications count check
      (FirestoreService.getWhere as jest.Mock).mockResolvedValue([rejectedApplication]);
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

      // Mock getWhere for active applications count check
      (FirestoreService.getWhere as jest.Mock).mockResolvedValue([acceptedApplication]);
      (FirestoreService.getWhereCompound as jest.Mock).mockResolvedValue([acceptedApplication]);

      await expect(GigService.createApplication(mockApplicationData)).rejects.toThrow(
        'You have already applied to this gig'
      );

      expect(FirestoreService.create).not.toHaveBeenCalled();
    });
  });

  describe('countActiveApplicationsByWorker', () => {
    it('should count only active applications (pending, accepted, funded)', async () => {
      const mockApplications: GigApplication[] = [
        {
          id: 'app-1',
          gigId: 'gig-1',
          applicantId: mockApplicantId,
          applicantName: 'John Doe',
          message: 'Test',
          proposedRate: 1000,
          status: 'pending',
          createdAt: new Date()
        },
        {
          id: 'app-2',
          gigId: 'gig-2',
          applicantId: mockApplicantId,
          applicantName: 'John Doe',
          message: 'Test',
          proposedRate: 1000,
          status: 'accepted',
          createdAt: new Date()
        },
        {
          id: 'app-3',
          gigId: 'gig-3',
          applicantId: mockApplicantId,
          applicantName: 'John Doe',
          message: 'Test',
          proposedRate: 1000,
          status: 'funded',
          createdAt: new Date()
        },
        {
          id: 'app-4',
          gigId: 'gig-4',
          applicantId: mockApplicantId,
          applicantName: 'John Doe',
          message: 'Test',
          proposedRate: 1000,
          status: 'rejected',
          createdAt: new Date()
        },
        {
          id: 'app-5',
          gigId: 'gig-5',
          applicantId: mockApplicantId,
          applicantName: 'John Doe',
          message: 'Test',
          proposedRate: 1000,
          status: 'completed',
          createdAt: new Date()
        },
        {
          id: 'app-6',
          gigId: 'gig-6',
          applicantId: mockApplicantId,
          applicantName: 'John Doe',
          message: 'Test',
          proposedRate: 1000,
          status: 'withdrawn',
          createdAt: new Date()
        }
      ];

      (FirestoreService.getWhere as jest.Mock).mockResolvedValue(mockApplications);

      const count = await GigService.countActiveApplicationsByWorker(mockApplicantId);

      // Should count only pending (1) + accepted (1) + funded (1) = 3
      // Should NOT count rejected, completed, or withdrawn
      expect(count).toBe(3);
      expect(FirestoreService.getWhere).toHaveBeenCalledWith(
        'applications',
        'applicantId',
        '==',
        mockApplicantId,
        'createdAt'
      );
    });

    it('should return 0 when worker has no active applications', async () => {
      const mockApplications: GigApplication[] = [
        {
          id: 'app-1',
          gigId: 'gig-1',
          applicantId: mockApplicantId,
          applicantName: 'John Doe',
          message: 'Test',
          proposedRate: 1000,
          status: 'rejected',
          createdAt: new Date()
        },
        {
          id: 'app-2',
          gigId: 'gig-2',
          applicantId: mockApplicantId,
          applicantName: 'John Doe',
          message: 'Test',
          proposedRate: 1000,
          status: 'completed',
          createdAt: new Date()
        }
      ];

      (FirestoreService.getWhere as jest.Mock).mockResolvedValue(mockApplications);

      const count = await GigService.countActiveApplicationsByWorker(mockApplicantId);

      expect(count).toBe(0);
    });

    it('should return 0 when worker has no applications at all', async () => {
      (FirestoreService.getWhere as jest.Mock).mockResolvedValue([]);

      const count = await GigService.countActiveApplicationsByWorker(mockApplicantId);

      expect(count).toBe(0);
    });
  });

  describe('createApplication - Application Limits', () => {
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
      updatedAt: new Date(),
      workType: 'remote'
    };

    const mockApplicationData = {
      gigId: mockGigId,
      applicantId: mockApplicantId,
      applicantName: 'John Doe',
      employerId: mockEmployerId,
      message: 'I am interested',
      proposedRate: 1000
    };

    beforeEach(() => {
      (FirestoreService.getById as jest.Mock).mockResolvedValue(mockGig);
      (FirestoreService.getWhereCompound as jest.Mock).mockResolvedValue([]);
      (FirestoreService.getWhere as jest.Mock).mockResolvedValue([]);
    });

    it('should reject application when worker has 20 active applications', async () => {
      // Create 20 active applications
      const activeApplications: GigApplication[] = Array.from({ length: 20 }, (_, i) => ({
        id: `app-${i}`,
        gigId: `gig-${i}`,
        applicantId: mockApplicantId,
        applicantName: 'John Doe',
        message: 'Test',
        proposedRate: 1000,
        status: 'pending' as const,
        createdAt: new Date()
      }));

      (FirestoreService.getWhere as jest.Mock).mockResolvedValue(activeApplications);

      await expect(GigService.createApplication(mockApplicationData)).rejects.toThrow(
        'You have reached the maximum limit of 20 active applications'
      );

      expect(FirestoreService.create).not.toHaveBeenCalled();
    });

    it('should allow application when worker has 19 active applications', async () => {
      // Create 19 active applications
      const activeApplications: GigApplication[] = Array.from({ length: 19 }, (_, i) => ({
        id: `app-${i}`,
        gigId: `gig-${i}`,
        applicantId: mockApplicantId,
        applicantName: 'John Doe',
        message: 'Test',
        proposedRate: 1000,
        status: 'pending' as const,
        createdAt: new Date()
      }));

      (FirestoreService.getWhere as jest.Mock).mockResolvedValue(activeApplications);
      (FirestoreService.create as jest.Mock).mockResolvedValue('new-app-123');

      const applicationId = await GigService.createApplication(mockApplicationData);

      expect(applicationId).toBe('new-app-123');
      expect(FirestoreService.create).toHaveBeenCalled();
    });

    it('should not count rejected/completed/withdrawn applications toward limit', async () => {
      // Create 15 pending + 10 rejected applications (only 15 should count)
      const applications: GigApplication[] = [
        ...Array.from({ length: 15 }, (_, i) => ({
          id: `app-pending-${i}`,
          gigId: `gig-${i}`,
          applicantId: mockApplicantId,
          applicantName: 'John Doe',
          message: 'Test',
          proposedRate: 1000,
          status: 'pending' as const,
          createdAt: new Date()
        })),
        ...Array.from({ length: 10 }, (_, i) => ({
          id: `app-rejected-${i}`,
          gigId: `gig-${i + 15}`,
          applicantId: mockApplicantId,
          applicantName: 'John Doe',
          message: 'Test',
          proposedRate: 1000,
          status: 'rejected' as const,
          createdAt: new Date()
        }))
      ];

      (FirestoreService.getWhere as jest.Mock).mockResolvedValue(applications);
      (FirestoreService.create as jest.Mock).mockResolvedValue('new-app-123');

      // Should succeed since only 15 active applications (under the 20 limit)
      const applicationId = await GigService.createApplication(mockApplicationData);

      expect(applicationId).toBe('new-app-123');
      expect(FirestoreService.create).toHaveBeenCalled();
    });

    it('should provide helpful error message with suggestions', async () => {
      const activeApplications: GigApplication[] = Array.from({ length: 20 }, (_, i) => ({
        id: `app-${i}`,
        gigId: `gig-${i}`,
        applicantId: mockApplicantId,
        applicantName: 'John Doe',
        message: 'Test',
        proposedRate: 1000,
        status: 'pending' as const,
        createdAt: new Date()
      }));

      (FirestoreService.getWhere as jest.Mock).mockResolvedValue(activeApplications);

      try {
        await GigService.createApplication(mockApplicationData);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        if (error instanceof Error) {
          expect(error.message).toContain('maximum limit of 20 active applications');
          expect(error.message).toContain('wait for responses');
          expect(error.message).toContain('withdraw some');
        }
      }
    });

    it('should count mixed active statuses (pending + accepted + funded)', async () => {
      // Create 7 pending + 7 accepted + 7 funded = 21 active (over limit)
      const applications: GigApplication[] = [
        ...Array.from({ length: 7 }, (_, i) => ({
          id: `app-pending-${i}`,
          gigId: `gig-${i}`,
          applicantId: mockApplicantId,
          applicantName: 'John Doe',
          message: 'Test',
          proposedRate: 1000,
          status: 'pending' as const,
          createdAt: new Date()
        })),
        ...Array.from({ length: 7 }, (_, i) => ({
          id: `app-accepted-${i}`,
          gigId: `gig-${i + 7}`,
          applicantId: mockApplicantId,
          applicantName: 'John Doe',
          message: 'Test',
          proposedRate: 1000,
          status: 'accepted' as const,
          createdAt: new Date()
        })),
        ...Array.from({ length: 7 }, (_, i) => ({
          id: `app-funded-${i}`,
          gigId: `gig-${i + 14}`,
          applicantId: mockApplicantId,
          applicantName: 'John Doe',
          message: 'Test',
          proposedRate: 1000,
          status: 'funded' as const,
          createdAt: new Date()
        }))
      ];

      (FirestoreService.getWhere as jest.Mock).mockResolvedValue(applications);

      await expect(GigService.createApplication(mockApplicationData)).rejects.toThrow(
        'You have reached the maximum limit of 20 active applications'
      );

      expect(FirestoreService.create).not.toHaveBeenCalled();
    });
  });
});
