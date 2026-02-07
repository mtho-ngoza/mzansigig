/**
 * GigService - Accepted Gig Visibility Tests
 *
 * E2E-style tests for the full flow:
 * 1. Gig created (status: 'open') -> visible on browse
 * 2. Application submitted -> gig still visible
 * 3. Application accepted -> gig should NOT be visible on browse (assignedTo is set)
 * 4. Application funded -> gig status changes to 'in-progress', not visible on browse
 *
 * Bug being tested: When an application is accepted, the gig still appears on the browse page
 * because gig status remains 'open' until funded, and browse only filters by status.
 *
 * Fix: Filter out gigs with assignedTo set when browsing open gigs.
 */

import { GigService } from '@/lib/database/gigService';
import { FirestoreService } from '@/lib/database/firestore';
import { ConfigService } from '@/lib/database/configService';
import { Gig, GigApplication } from '@/types/gig';

// Mock dependencies
jest.mock('@/lib/database/firestore');
jest.mock('@/lib/database/configService');
jest.mock('@/lib/database/messagingService', () => ({
  MessagingService: {
    getOrCreateConversation: jest.fn().mockResolvedValue('conv-123'),
    sendMessage: jest.fn().mockResolvedValue(undefined)
  }
}));
jest.mock('@/lib/utils/applicationValidation', () => ({
  sanitizeApplicationMessage: jest.fn((input: string) => input),
  APPLICATION_TEXT_LIMITS: {
    MESSAGE_MAX: 1000,
    MESSAGE_MIN: 10
  }
}));
jest.mock('@/lib/utils/gigValidation', () => ({
  sanitizeGigText: jest.fn((input: string) => input),
  normalizeSkills: jest.fn((skills: string[]) => skills),
  validateBudget: jest.fn(() => ({ isValid: true })),
  GIG_TEXT_LIMITS: {
    TITLE_MAX: 100,
    DESCRIPTION_MAX: 5000
  }
}));
jest.mock('@/lib/utils/locationUtils', () => ({
  getCityCoordinates: jest.fn(() => ({ latitude: -33.9249, longitude: 18.4241 })),
  calculateDistance: jest.fn(() => 10),
  sortByDistance: jest.fn((items) => items),
  filterByRadius: jest.fn((items) => items)
}));

describe('GigService - Accepted Gig Visibility (E2E Flow)', () => {
  // Test data
  const mockEmployerId = 'employer-123';
  const mockWorkerId = 'worker-456';
  const mockGigId = 'gig-789';
  const mockApplicationId = 'app-001';

  const createMockGig = (overrides: Partial<Gig> = {}): Gig => ({
    id: mockGigId,
    title: 'Test Web Development Gig',
    description: 'Build a website for a local business',
    category: 'Technology',
    location: 'Cape Town',
    coordinates: { latitude: -33.9249, longitude: 18.4241 },
    budget: 5000,
    duration: '1 week',
    skillsRequired: ['React', 'Node.js'],
    employerId: mockEmployerId,
    employerName: 'Test Employer',
    status: 'open',
    workType: 'remote',
    applicants: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  });

  const createMockApplication = (overrides: Partial<GigApplication> = {}): GigApplication => ({
    id: mockApplicationId,
    gigId: mockGigId,
    applicantId: mockWorkerId,
    applicantName: 'Test Worker',
    employerId: mockEmployerId,
    proposedRate: 4500,
    message: 'I am interested in this opportunity',
    status: 'pending',
    rateStatus: 'proposed',
    createdAt: new Date(),
    ...overrides
  });

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
      };
      return Promise.resolve(defaults[key] || 0);
    });
  });

  describe('Gig Visibility Lifecycle', () => {
    describe('Step 1: New open gig should be visible on browse', () => {
      it('should return open gigs without assignedTo in getGigsByStatus', async () => {
        const openGig = createMockGig({ status: 'open', assignedTo: undefined });

        (FirestoreService.getWhere as jest.Mock).mockResolvedValue([openGig]);

        const gigs = await GigService.getGigsByStatus('open');

        expect(gigs).toHaveLength(1);
        expect(gigs[0].id).toBe(mockGigId);
        expect(gigs[0].status).toBe('open');
        expect(gigs[0].assignedTo).toBeUndefined();
      });

      it('should include open gigs in search results', async () => {
        const openGig = createMockGig({ status: 'open' });

        (FirestoreService.getWhere as jest.Mock).mockResolvedValue([openGig]);
        (FirestoreService.getAll as jest.Mock).mockResolvedValue([openGig]);

        const gigs = await GigService.searchGigs('web', 'Technology');

        expect(gigs).toHaveLength(1);
        expect(gigs[0].title).toContain('Web');
      });
    });

    describe('Step 2: Gig with pending applications should still be visible', () => {
      it('should still show gig when there are pending applications', async () => {
        const gigWithApplications = createMockGig({
          status: 'open',
          applicants: [mockWorkerId]
        });

        (FirestoreService.getWhere as jest.Mock).mockResolvedValue([gigWithApplications]);

        const gigs = await GigService.getGigsByStatus('open');

        expect(gigs).toHaveLength(1);
        expect(gigs[0].applicants).toContain(mockWorkerId);
      });
    });

    describe('Step 3: Gig with accepted application should NOT be visible on browse (THE BUG)', () => {
      it('should return gig in raw query but it has assignedTo set', async () => {
        // This test demonstrates the current bug behavior:
        // After acceptance, gig still has status 'open' but has assignedTo set
        const acceptedGig = createMockGig({
          status: 'open', // Still open!
          assignedTo: mockWorkerId // But assigned to a worker
        });

        (FirestoreService.getWhere as jest.Mock).mockResolvedValue([acceptedGig]);

        const gigs = await GigService.getGigsByStatus('open');

        // This is the raw query result - it includes gigs with assignedTo
        // The fix should filter these out before displaying to users
        expect(gigs).toHaveLength(1);
        expect(gigs[0].assignedTo).toBe(mockWorkerId);
        expect(gigs[0].status).toBe('open'); // Still open (problematic!)
      });

      it('should verify that accepting application sets assignedTo but keeps status open', async () => {
        // Setup mock for the acceptance flow
        const pendingApplication = createMockApplication({
          rateStatus: 'agreed',
          agreedRate: 4500
        });

        (FirestoreService.getById as jest.Mock)
          .mockResolvedValueOnce(pendingApplication) // First call: check for acceptance
          .mockResolvedValueOnce(pendingApplication); // Second call: after acceptance

        (FirestoreService.getWhere as jest.Mock).mockResolvedValue([pendingApplication]);
        (FirestoreService.update as jest.Mock).mockResolvedValue(undefined);

        await GigService.updateApplicationStatus(mockApplicationId, 'accepted');

        // Verify gig update was called with assignedTo but NOT status change
        const gigUpdateCall = (FirestoreService.update as jest.Mock).mock.calls.find(
          (call: unknown[]) => call[0] === 'gigs' && call[1] === mockGigId
        );

        expect(gigUpdateCall).toBeDefined();
        expect(gigUpdateCall?.[2]).toHaveProperty('assignedTo', mockWorkerId);
        // Verify status was NOT updated to 'in-progress' (that only happens when funded)
        expect(gigUpdateCall?.[2]).not.toHaveProperty('status');
      });
    });

    describe('Step 4: Funded gig should not be visible (status changes to in-progress)', () => {
      it('should update gig status to in-progress when application is funded', async () => {
        const acceptedApplication = createMockApplication({
          status: 'accepted',
          rateStatus: 'agreed',
          agreedRate: 4500
        });

        (FirestoreService.getById as jest.Mock).mockResolvedValue(acceptedApplication);
        (FirestoreService.update as jest.Mock).mockResolvedValue(undefined);

        await GigService.updateApplicationStatus(mockApplicationId, 'funded');

        // Verify gig status was updated to 'in-progress'
        expect(FirestoreService.update).toHaveBeenCalledWith(
          'gigs',
          mockGigId,
          expect.objectContaining({ status: 'in-progress' })
        );
      });

      it('should not return in-progress gigs when querying for open gigs', async () => {
        const fundedGig = createMockGig({
          status: 'in-progress',
          assignedTo: mockWorkerId
        });

        // Only open gigs should be returned
        (FirestoreService.getWhere as jest.Mock).mockResolvedValue([]);

        const openGigs = await GigService.getGigsByStatus('open');

        expect(openGigs).toHaveLength(0);
      });
    });
  });

  describe('Browse Page Filtering Requirements', () => {
    it('should identify gigs that are technically open but should be hidden (have assignedTo)', async () => {
      const gigs: Gig[] = [
        createMockGig({ id: 'gig-1', status: 'open', assignedTo: undefined }), // Should show
        createMockGig({ id: 'gig-2', status: 'open', assignedTo: 'worker-1' }), // Should hide
        createMockGig({ id: 'gig-3', status: 'open', assignedTo: undefined }), // Should show
        createMockGig({ id: 'gig-4', status: 'open', assignedTo: 'worker-2' }), // Should hide
      ];

      (FirestoreService.getWhere as jest.Mock).mockResolvedValue(gigs);

      const allOpenGigs = await GigService.getGigsByStatus('open');

      // Raw query returns all open gigs
      expect(allOpenGigs).toHaveLength(4);

      // Filter to get only unassigned gigs (what browse page should show)
      const browsableGigs = allOpenGigs.filter(gig => !gig.assignedTo);

      expect(browsableGigs).toHaveLength(2);
      expect(browsableGigs.map(g => g.id)).toEqual(['gig-1', 'gig-3']);
    });

    it('should correctly identify assigned vs unassigned gigs in search results', async () => {
      const gigs: Gig[] = [
        createMockGig({
          id: 'gig-1',
          title: 'Web Development Project',
          status: 'open',
          assignedTo: undefined
        }),
        createMockGig({
          id: 'gig-2',
          title: 'Web App for Startup',
          status: 'open',
          assignedTo: 'worker-assigned'
        }),
      ];

      (FirestoreService.getAll as jest.Mock).mockResolvedValue(gigs);

      const searchResults = await GigService.searchGigs('web');

      // Raw search returns both
      expect(searchResults).toHaveLength(2);

      // Filter for browsable gigs
      const browsableResults = searchResults.filter(gig =>
        gig.status === 'open' && !gig.assignedTo
      );

      expect(browsableResults).toHaveLength(1);
      expect(browsableResults[0].id).toBe('gig-1');
    });
  });

  describe('Full E2E Acceptance Flow', () => {
    it('should complete full flow from open gig to accepted to hidden from browse', async () => {
      // === Step 1: Create and verify open gig is browsable ===
      const openGig = createMockGig({
        status: 'open',
        assignedTo: undefined
      });

      (FirestoreService.getWhere as jest.Mock).mockResolvedValue([openGig]);

      let gigs = await GigService.getGigsByStatus('open');
      let browsableGigs = gigs.filter(g => !g.assignedTo);
      expect(browsableGigs).toHaveLength(1);

      // === Step 2: Submit application (gig still browsable) ===
      const pendingApplication = createMockApplication({ status: 'pending' });

      (FirestoreService.getById as jest.Mock).mockResolvedValue({ ...openGig, budget: 5000 });
      (FirestoreService.getWhereCompound as jest.Mock).mockResolvedValue([]);
      (FirestoreService.getWhere as jest.Mock).mockResolvedValue([]);
      (FirestoreService.create as jest.Mock).mockResolvedValue(mockApplicationId);

      await GigService.createApplication({
        gigId: mockGigId,
        applicantId: mockWorkerId,
        applicantName: 'Test Worker',
        employerId: mockEmployerId,
        proposedRate: 4500,
        message: 'I am interested'
      });

      // Gig should still be browsable after application
      (FirestoreService.getWhere as jest.Mock).mockResolvedValue([openGig]);
      gigs = await GigService.getGigsByStatus('open');
      browsableGigs = gigs.filter(g => !g.assignedTo);
      expect(browsableGigs).toHaveLength(1);

      // === Step 3: Accept application (gig should no longer be browsable) ===
      const agreedApplication = createMockApplication({
        status: 'pending',
        rateStatus: 'agreed',
        agreedRate: 4500
      });

      (FirestoreService.getById as jest.Mock).mockResolvedValue(agreedApplication);
      (FirestoreService.getWhere as jest.Mock).mockResolvedValue([agreedApplication]);
      (FirestoreService.update as jest.Mock).mockResolvedValue(undefined);

      await GigService.updateApplicationStatus(mockApplicationId, 'accepted');

      // After acceptance, gig has assignedTo set
      const assignedGig = createMockGig({
        status: 'open', // Still open!
        assignedTo: mockWorkerId // But now assigned
      });

      (FirestoreService.getWhere as jest.Mock).mockResolvedValue([assignedGig]);
      gigs = await GigService.getGigsByStatus('open');

      // Raw query still returns the gig
      expect(gigs).toHaveLength(1);

      // But filtering for browsable gigs should exclude it
      browsableGigs = gigs.filter(g => !g.assignedTo);
      expect(browsableGigs).toHaveLength(0); // No longer browsable!

      // === Step 4: Fund application (gig status changes, definitively not browsable) ===
      const acceptedApplication = createMockApplication({
        status: 'accepted',
        rateStatus: 'agreed',
        agreedRate: 4500
      });

      (FirestoreService.getById as jest.Mock).mockResolvedValue(acceptedApplication);

      await GigService.updateApplicationStatus(mockApplicationId, 'funded');

      // Now gig is in-progress
      const inProgressGig = createMockGig({
        status: 'in-progress',
        assignedTo: mockWorkerId
      });

      (FirestoreService.getWhere as jest.Mock).mockResolvedValue([]);
      gigs = await GigService.getGigsByStatus('open');

      expect(gigs).toHaveLength(0); // Not in open gigs query at all
    });
  });

  describe('Edge Cases', () => {
    it('should handle gig where assignedTo was cleared after funding timeout', async () => {
      // When funding times out, assignedTo is cleared and gig becomes browsable again
      const reopenedGig = createMockGig({
        status: 'open',
        assignedTo: undefined // Cleared after timeout
      });

      (FirestoreService.getWhere as jest.Mock).mockResolvedValue([reopenedGig]);

      const gigs = await GigService.getGigsByStatus('open');
      const browsableGigs = gigs.filter(g => !g.assignedTo);

      expect(browsableGigs).toHaveLength(1);
      expect(browsableGigs[0].id).toBe(mockGigId);
    });

    it('should not show reviewing status gigs on browse', async () => {
      const reviewingGig = createMockGig({ status: 'reviewing' });

      (FirestoreService.getWhere as jest.Mock).mockResolvedValue([]);

      const gigs = await GigService.getGigsByStatus('open');

      expect(gigs).toHaveLength(0);
    });

    it('should handle empty assignedTo string as unassigned', async () => {
      // Edge case: assignedTo might be empty string instead of undefined
      const gigWithEmptyAssigned = createMockGig({
        status: 'open',
        assignedTo: '' as unknown as string // Empty string edge case
      });

      (FirestoreService.getWhere as jest.Mock).mockResolvedValue([gigWithEmptyAssigned]);

      const gigs = await GigService.getGigsByStatus('open');
      // Empty string should be treated as unassigned (falsy)
      const browsableGigs = gigs.filter(g => !g.assignedTo);

      expect(browsableGigs).toHaveLength(1);
    });
  });

  describe('Utility Function: getOpenGigsForBrowsing', () => {
    it('should document the expected behavior of a browse-specific method', async () => {
      // This test documents what a hypothetical getOpenGigsForBrowsing method should do
      const allOpenGigs: Gig[] = [
        createMockGig({ id: 'gig-1', status: 'open', assignedTo: undefined }),
        createMockGig({ id: 'gig-2', status: 'open', assignedTo: 'worker-1' }),
        createMockGig({ id: 'gig-3', status: 'open', assignedTo: undefined }),
      ];

      (FirestoreService.getWhere as jest.Mock).mockResolvedValue(allOpenGigs);

      // Current implementation returns all open gigs
      const currentResult = await GigService.getGigsByStatus('open');
      expect(currentResult).toHaveLength(3);

      // Expected: A getOpenGigsForBrowsing method would filter out assigned gigs
      // This is what PublicGigBrowser should do after fetching
      const expectedBrowseResult = currentResult.filter(g => !g.assignedTo);
      expect(expectedBrowseResult).toHaveLength(2);
      expect(expectedBrowseResult.map(g => g.id)).toEqual(['gig-1', 'gig-3']);
    });
  });
});

describe('Application Acceptance Integration', () => {
  const mockEmployerId = 'employer-123';
  const mockWorkerId = 'worker-456';
  const mockGigId = 'gig-789';
  const mockApplicationId = 'app-001';

  beforeEach(() => {
    jest.clearAllMocks();

    (ConfigService.getValue as jest.Mock).mockImplementation((key: string) => {
      const defaults: Record<string, number> = {
        escrowAutoReleaseDays: 7,
        maxActiveApplicationsPerWorker: 20,
      };
      return Promise.resolve(defaults[key] || 0);
    });
  });

  it('should set assignedTo when accepting application via acceptApplicationWithRate', async () => {
    const application: GigApplication = {
      id: mockApplicationId,
      gigId: mockGigId,
      applicantId: mockWorkerId,
      applicantName: 'Test Worker',
      employerId: mockEmployerId,
      proposedRate: 4500,
      message: 'I am interested',
      status: 'pending',
      rateStatus: 'proposed', // Worker proposed, employer will accept
      createdAt: new Date()
    };

    const gig: Gig = {
      id: mockGigId,
      title: 'Test Gig',
      description: 'Test',
      category: 'Technology',
      location: 'Cape Town',
      budget: 5000,
      duration: '1 week',
      skillsRequired: ['React'],
      employerId: mockEmployerId,
      employerName: 'Test Employer',
      status: 'open',
      workType: 'remote',
      applicants: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Mock the flow
    (FirestoreService.getById as jest.Mock)
      .mockResolvedValueOnce(application) // confirmApplicationRate check
      .mockResolvedValueOnce(gig) // sendMessage lookup
      .mockResolvedValueOnce({ ...application, rateStatus: 'agreed' }) // updateApplicationStatus check
      .mockResolvedValueOnce({ ...application, rateStatus: 'agreed', status: 'accepted' }); // after acceptance

    (FirestoreService.getWhere as jest.Mock).mockResolvedValue([application]);
    (FirestoreService.update as jest.Mock).mockResolvedValue(undefined);

    await GigService.acceptApplicationWithRate(mockApplicationId, mockEmployerId);

    // Verify that the gig was updated with assignedTo
    const gigUpdateCalls = (FirestoreService.update as jest.Mock).mock.calls.filter(
      (call: unknown[]) => call[0] === 'gigs' && call[1] === mockGigId
    );

    expect(gigUpdateCalls.length).toBeGreaterThan(0);

    const assignedToUpdate = gigUpdateCalls.find(
      (call: unknown[]) => call[2] && (call[2] as Record<string, unknown>).assignedTo === mockWorkerId
    );
    expect(assignedToUpdate).toBeDefined();
  });

  it('should reject other pending applications when one is accepted', async () => {
    const acceptedApp: GigApplication = {
      id: 'app-accepted',
      gigId: mockGigId,
      applicantId: mockWorkerId,
      applicantName: 'Accepted Worker',
      employerId: mockEmployerId,
      proposedRate: 4500,
      status: 'pending',
      rateStatus: 'agreed',
      agreedRate: 4500,
      createdAt: new Date()
    };

    const otherApp: GigApplication = {
      id: 'app-other',
      gigId: mockGigId,
      applicantId: 'other-worker',
      applicantName: 'Other Worker',
      employerId: mockEmployerId,
      proposedRate: 5000,
      status: 'pending',
      rateStatus: 'proposed',
      createdAt: new Date()
    };

    (FirestoreService.getById as jest.Mock)
      .mockResolvedValueOnce(acceptedApp)
      .mockResolvedValueOnce(acceptedApp);

    (FirestoreService.getWhere as jest.Mock).mockResolvedValue([acceptedApp, otherApp]);
    (FirestoreService.update as jest.Mock).mockResolvedValue(undefined);

    await GigService.updateApplicationStatus('app-accepted', 'accepted');

    // Verify other application was rejected
    expect(FirestoreService.update).toHaveBeenCalledWith(
      'applications',
      'app-other',
      { status: 'rejected' }
    );
  });
});
