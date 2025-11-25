import { FirestoreService } from './firestore';
import { Gig, GigApplication, Review } from '@/types/gig';
import { Coordinates, LocationSearchOptions } from '@/types/location';
import {
  calculateDistance,
  sortByDistance,
  filterByRadius,
  getCityCoordinates
} from '@/lib/utils/locationUtils';
import type { DocumentSnapshot, DocumentData } from 'firebase/firestore';
import { ConfigService } from './configService';
import { sanitizeGigText, normalizeSkills, validateBudget, GIG_TEXT_LIMITS } from '@/lib/utils/gigValidation';
import { sanitizeApplicationMessage, APPLICATION_TEXT_LIMITS } from '@/lib/utils/applicationValidation';

// Application limits to prevent spam (configurable via admin)
// Fallback to 20 if config not available
const MAX_ACTIVE_APPLICATIONS_PER_WORKER = 20;

export class GigService {
  // Gig CRUD operations
  static async createGig(gigData: Omit<Gig, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    // Validate budget
    const budgetValidation = validateBudget(gigData.budget);
    if (!budgetValidation.isValid) {
      throw new Error(`Invalid budget: ${budgetValidation.message}`);
    }

    // Sanitize text inputs to prevent XSS
    const sanitizedData = {
      ...gigData,
      title: sanitizeGigText(gigData.title, GIG_TEXT_LIMITS.TITLE_MAX),
      description: sanitizeGigText(gigData.description, GIG_TEXT_LIMITS.DESCRIPTION_MAX),
      skillsRequired: normalizeSkills(gigData.skillsRequired),
      budget: Math.round(gigData.budget), // Ensure integer
      createdAt: new Date(),
      updatedAt: new Date(),
      applicants: [],
      status: 'open' as const
    };

    // Add coordinates if location is provided
    if (gigData.location && !sanitizedData.coordinates) {
      const coordinates = getCityCoordinates(gigData.location);
      if (coordinates) {
        sanitizedData.coordinates = coordinates;
      }
    }

    return await FirestoreService.create('gigs', sanitizedData);
  }

  static async getGigById(id: string): Promise<Gig | null> {
    return await FirestoreService.getById<Gig>('gigs', id);
  }

  static async updateGig(id: string, updates: Partial<Gig>, userId?: string): Promise<void> {
    // If userId is provided, verify authorization (only gig owner can update)
    if (userId) {
      const existingGig = await this.getGigById(id);
      if (!existingGig) {
        throw new Error('Gig not found');
      }

      // Authorization check: Only the employer who created the gig can update it
      if (existingGig.employerId !== userId) {
        throw new Error('Unauthorized: Only the gig owner can update this gig');
      }
    }

    // Validate budget if being updated
    if (updates.budget !== undefined) {
      const budgetValidation = validateBudget(updates.budget);
      if (!budgetValidation.isValid) {
        throw new Error(`Invalid budget: ${budgetValidation.message}`);
      }
    }

    // Sanitize text inputs if they're being updated
    const sanitizedUpdates: Partial<Gig> = { ...updates };

    if (updates.title !== undefined) {
      sanitizedUpdates.title = sanitizeGigText(updates.title, GIG_TEXT_LIMITS.TITLE_MAX);
    }
    if (updates.description !== undefined) {
      sanitizedUpdates.description = sanitizeGigText(updates.description, GIG_TEXT_LIMITS.DESCRIPTION_MAX);
    }
    if (updates.budget !== undefined) {
      sanitizedUpdates.budget = Math.round(updates.budget); // Ensure integer
    }
    if (updates.skillsRequired !== undefined) {
      sanitizedUpdates.skillsRequired = normalizeSkills(updates.skillsRequired);
    }

    const updateData = {
      ...sanitizedUpdates,
      updatedAt: new Date()
    };

    await FirestoreService.update('gigs', id, updateData);
  }

  static async deleteGig(id: string, userId?: string): Promise<void> {
    // If userId is provided, verify authorization (only gig owner can delete)
    if (userId) {
      const existingGig = await this.getGigById(id);
      if (!existingGig) {
        throw new Error('Gig not found');
      }

      // Authorization check: Only the employer who created the gig can delete it
      if (existingGig.employerId !== userId) {
        throw new Error('Unauthorized: Only the gig owner can delete this gig');
      }
    }

    await FirestoreService.delete('gigs', id);
  }

  static async getAllGigs(limitCount?: number): Promise<Gig[]> {
    return await FirestoreService.getAll<Gig>('gigs', 'createdAt', 'desc', limitCount);
  }

  static async getGigsByEmployer(employerId: string): Promise<Gig[]> {
    return await FirestoreService.getWhere<Gig>('gigs', 'employerId', '==', employerId, 'createdAt');
  }

  static async getGigsByStatus(status: Gig['status'], limitCount?: number): Promise<Gig[]> {
    return await FirestoreService.getWhere<Gig>('gigs', 'status', '==', status, 'createdAt', 'desc', limitCount);
  }

  /**
   * Get completed gigs where user was involved (as employer or worker)
   * Used for review opportunities and history
   */
  static async getCompletedGigsByUser(userId: string): Promise<Gig[]> {
    // Get gigs where user was the employer
    const employerGigs = await FirestoreService.getWhereCompound<Gig>('gigs', [
      { field: 'employerId', operator: '==', value: userId },
      { field: 'status', operator: '==', value: 'completed' }
    ]);

    // Get gigs where user was the assigned worker
    const workerGigs = await FirestoreService.getWhereCompound<Gig>('gigs', [
      { field: 'assignedTo', operator: '==', value: userId },
      { field: 'status', operator: '==', value: 'completed' }
    ]);

    // Combine and deduplicate (shouldn't have duplicates, but just in case)
    const allGigs = [...employerGigs, ...workerGigs];
    const uniqueGigs = Array.from(new Map(allGigs.map(gig => [gig.id, gig])).values());

    // Sort by completion date (most recent first)
    return uniqueGigs.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * Get gigs by status with cursor-based pagination
   * Returns both gigs and the last document snapshot for next page
   */
  static async getGigsByStatusWithCursor(
    status: Gig['status'],
    limitCount: number,
    startAfterDoc?: DocumentSnapshot<DocumentData>
  ): Promise<{ gigs: Gig[]; lastDoc: DocumentSnapshot<DocumentData> | null }> {
    const result = await FirestoreService.getWhereWithCursor<Gig>(
      'gigs',
      'status',
      '==',
      status,
      'createdAt',
      'desc',
      limitCount,
      startAfterDoc
    );
    return { gigs: result.items, lastDoc: result.lastDoc };
  }

  static async searchGigs(searchTerm: string, category?: string, limitCount?: number): Promise<Gig[]> {
    let gigs: Gig[] = [];

    if (category) {
      gigs = await FirestoreService.getWhere<Gig>('gigs', 'category', '==', category, 'createdAt', 'desc', limitCount);
    } else {
      gigs = await this.getAllGigs(limitCount);
    }

    const searchTermLower = searchTerm.toLowerCase();

    return gigs.filter(gig =>
      gig.title.toLowerCase().includes(searchTermLower) ||
      gig.description.toLowerCase().includes(searchTermLower) ||
      gig.skillsRequired.some(skill =>
        skill.toLowerCase().includes(searchTermLower)
      )
    );
  }

  // Location-based search methods
  static async searchGigsWithLocation(
    searchTerm: string = '',
    options: LocationSearchOptions = {}
  ): Promise<(Gig & { distanceInfo?: { distance: number; unit: string; travelTime?: number } })[]> {
    let gigs: Gig[] = [];

    // Get base gigs
    if (options.city) {
      gigs = await FirestoreService.getWhere<Gig>('gigs', 'location', '==', options.city, 'createdAt');
    } else {
      gigs = await this.getGigsByStatus('open');
    }

    // Apply text search filter if provided
    if (searchTerm.trim()) {
      const searchTermLower = searchTerm.toLowerCase();
      gigs = gigs.filter(gig =>
        gig.title.toLowerCase().includes(searchTermLower) ||
        gig.description.toLowerCase().includes(searchTermLower) ||
        gig.skillsRequired.some(skill =>
          skill.toLowerCase().includes(searchTermLower)
        )
      );
    }

    // Ensure gigs have coordinates (add them if missing)
    const gigsWithCoords = await Promise.all(
      gigs.map(async (gig) => {
        if (!gig.coordinates && gig.location) {
          const coords = getCityCoordinates(gig.location);
          if (coords) {
            // Update gig with coordinates in database
            await this.updateGig(gig.id, { coordinates: coords });
            return { ...gig, coordinates: coords };
          }
        }
        return gig;
      })
    );

    // Apply location-based filtering and sorting
    if (options.coordinates) {
      let results = gigsWithCoords;

      // Filter by radius if specified
      if (options.radius && options.radius < 500) { // Don't filter if radius is "Anywhere in SA"
        results = filterByRadius(
          results,
          options.coordinates,
          options.radius,
          (gig) => gig.coordinates || null
        );
      }

      // Sort by distance if requested
      if (options.sortByDistance) {
        const sorted = sortByDistance(
          results,
          options.coordinates,
          (gig) => gig.coordinates || null
        );

        // Apply max results limit
        const limited = options.maxResults ? sorted.slice(0, options.maxResults) : sorted;
        return limited;
      }

      // Apply max results limit even without sorting
      return options.maxResults ? results.slice(0, options.maxResults) : results;
    }

    // No location-based processing, return as-is
    const limited = options.maxResults ? gigsWithCoords.slice(0, options.maxResults) : gigsWithCoords;
    return limited.map(gig => ({ ...gig })); // Ensure consistent return type
  }

  static async getGigsNearLocation(
    coordinates: Coordinates,
    radiusKm: number = 25,
    category?: string
  ): Promise<(Gig & { distanceInfo: { distance: number; unit: string; travelTime?: number } })[]> {
    let gigs: Gig[];

    if (category) {
      gigs = await FirestoreService.getWhere<Gig>('gigs', 'category', '==', category, 'createdAt');
    } else {
      gigs = await this.getGigsByStatus('open');
    }

    // Ensure gigs have coordinates
    const gigsWithCoords = await Promise.all(
      gigs.map(async (gig) => {
        if (!gig.coordinates && gig.location) {
          const coords = getCityCoordinates(gig.location);
          if (coords) {
            await this.updateGig(gig.id, { coordinates: coords });
            return { ...gig, coordinates: coords };
          }
        }
        return gig;
      })
    );

    // Filter by radius and add distance information
    const gigsInRange = gigsWithCoords
      .map(gig => {
        if (!gig.coordinates) return null;

        const distance = calculateDistance(coordinates, gig.coordinates);
        if (distance <= radiusKm) {
          return {
            ...gig,
            distanceInfo: {
              distance,
              unit: 'km' as const,
              travelTime: Math.round((distance / 50) * 60) // Estimate: 50 km/h average speed
            }
          };
        }
        return null;
      })
      .filter((gig): gig is NonNullable<typeof gig> => gig !== null)
      .sort((a, b) => a.distanceInfo.distance - b.distanceInfo.distance);

    return gigsInRange;
  }

  static async getRecommendedGigs(
    userCoordinates: Coordinates,
    userSkills: string[] = [],
    maxDistance: number = 50
  ): Promise<(Gig & { distanceInfo: { distance: number; unit: string; travelTime?: number }, relevanceScore: number })[]> {
    const gigs = await this.getGigsByStatus('open');

    // Ensure gigs have coordinates
    const gigsWithCoords = await Promise.all(
      gigs.map(async (gig) => {
        if (!gig.coordinates && gig.location) {
          const coords = getCityCoordinates(gig.location);
          if (coords) {
            await this.updateGig(gig.id, { coordinates: coords });
            return { ...gig, coordinates: coords };
          }
        }
        return gig;
      })
    );

    const recommendations = gigsWithCoords
      .map(gig => {
        if (!gig.coordinates) return null;

        const distance = calculateDistance(userCoordinates, gig.coordinates);
        if (distance > maxDistance) return null;

        // Calculate relevance score based on skills match
        const skillMatches = gig.skillsRequired.filter(skill =>
          userSkills.some(userSkill =>
            skill.toLowerCase().includes(userSkill.toLowerCase()) ||
            userSkill.toLowerCase().includes(skill.toLowerCase())
          )
        ).length;

        const skillScore = gig.skillsRequired.length > 0 ? skillMatches / gig.skillsRequired.length : 0;
        const distanceScore = Math.max(0, 1 - (distance / maxDistance)); // Closer = better

        // Weighted relevance score: 60% skills, 40% distance
        const relevanceScore = (skillScore * 0.6) + (distanceScore * 0.4);

        return {
          ...gig,
          distanceInfo: {
            distance,
            unit: 'km' as const,
            travelTime: Math.round((distance / 50) * 60)
          },
          relevanceScore
        };
      })
      .filter((gig): gig is NonNullable<typeof gig> => gig !== null)
      .sort((a, b) => b.relevanceScore - a.relevanceScore); // Sort by relevance (highest first)

    return recommendations;
  }

  // Application operations
  static async createApplication(
    applicationData: Omit<GigApplication, 'id' | 'createdAt' | 'status'>
  ): Promise<string> {
    // Check if worker has reached the active applications limit (spam prevention)
    const maxApplications = await ConfigService.getValue('maxActiveApplicationsPerWorker').catch(() => MAX_ACTIVE_APPLICATIONS_PER_WORKER);
    const activeApplicationsCount = await this.countActiveApplicationsByWorker(applicationData.applicantId);
    if (activeApplicationsCount >= maxApplications) {
      throw new Error(
        `You have reached the maximum limit of ${maxApplications} active applications. ` +
        `Please wait for responses on your current applications or withdraw some before applying to more gigs.`
      );
    }

    // Check if gig exists and get its maxApplicants setting
    const gig = await FirestoreService.getById<Gig>('gigs', applicationData.gigId);
    if (!gig) {
      throw new Error('Gig not found');
    }

    // Check if gig is still open
    if (gig.status !== 'open') {
      throw new Error(`Cannot apply to gig with status: ${gig.status}`);
    }

    // If maxApplicants is set, check if limit is reached
    if (gig.maxApplicants) {
      const currentApplicationCount = await this.getApplicationCountByGig(applicationData.gigId);
      if (currentApplicationCount >= gig.maxApplicants) {
        throw new Error('This gig has reached its maximum number of applicants');
      }
    }

    // Check if user has already applied to this gig (duplicate prevention)
    const existingApplications = await FirestoreService.getWhereCompound<GigApplication>(
      'applications',
      [
        { field: 'gigId', operator: '==', value: applicationData.gigId },
        { field: 'applicantId', operator: '==', value: applicationData.applicantId }
      ]
    );

    // Allow re-application only if previous application was withdrawn
    const activeApplication = existingApplications.find(
      app => app.status !== 'withdrawn'
    );

    if (activeApplication) {
      throw new Error('You have already applied to this gig');
    }

    // Sanitize message to prevent XSS
    const sanitizedData = {
      ...applicationData,
      message: applicationData.message
        ? sanitizeApplicationMessage(applicationData.message, APPLICATION_TEXT_LIMITS.MESSAGE_MAX)
        : undefined,
      createdAt: new Date(),
      status: 'pending' as const
    };

    const applicationId = await FirestoreService.create('applications', sanitizedData);

    // Auto-close gig if max applicants reached
    if (gig.maxApplicants) {
      const newApplicationCount = await this.getApplicationCountByGig(applicationData.gigId);
      if (newApplicationCount >= gig.maxApplicants) {
        await this.updateGig(applicationData.gigId, { status: 'reviewing' });
      }
    }

    // Note: We don't need to update the gig's applicants array since we can query
    // applications by gigId. This also avoids permission issues when job seekers apply.

    return applicationId;
  }

  static async getApplicationsByGig(gigId: string): Promise<GigApplication[]> {
    return await FirestoreService.getWhere<GigApplication>('applications', 'gigId', '==', gigId, 'createdAt');
  }

  static async getApplicationCountByGig(gigId: string): Promise<number> {
    const applications = await FirestoreService.getWhere<GigApplication>('applications', 'gigId', '==', gigId);
    return applications.length;
  }

  static async getApplicationsByApplicant(applicantId: string): Promise<GigApplication[]> {
    return await FirestoreService.getWhere<GigApplication>('applications', 'applicantId', '==', applicantId, 'createdAt');
  }

  /**
   * Count active applications for a worker (pending, accepted, or funded)
   * Used to enforce application limits and prevent spam
   */
  static async countActiveApplicationsByWorker(applicantId: string): Promise<number> {
    const applications = await this.getApplicationsByApplicant(applicantId);

    // Count applications that are still active (not rejected, completed, or withdrawn)
    const activeApplications = applications.filter(
      app => app.status === 'pending' || app.status === 'accepted' || app.status === 'funded'
    );

    return activeApplications.length;
  }

  static async hasUserApplied(gigId: string, applicantId: string): Promise<boolean> {
    const applications = await this.getApplicationsByGig(gigId);
    return applications.some(app => app.applicantId === applicantId);
  }

  static async updateApplicationStatus(
    applicationId: string,
    status: GigApplication['status']
  ): Promise<void> {
    // If accepting, check that no other application is already accepted
    if (status === 'accepted') {
      const application = await FirestoreService.getById<GigApplication>('applications', applicationId);
      if (!application) {
        throw new Error('Application not found');
      }

      // Check for existing accepted/funded applications for this gig
      const existingApplications = await this.getApplicationsByGig(application.gigId);
      const alreadyAccepted = existingApplications.find(
        app => app.id !== applicationId && (app.status === 'accepted' || app.status === 'funded')
      );

      if (alreadyAccepted) {
        throw new Error('Another worker has already been selected for this gig');
      }
    }

    // Set acceptedAt timestamp when accepting an application
    const updateData: Partial<GigApplication> = { status };
    if (status === 'accepted') {
      updateData.acceptedAt = new Date();
    }

    await FirestoreService.update('applications', applicationId, updateData);

    // If accepted, assign worker and reject other applications
    // Note: Gig status remains 'open' until funded to allow backup applications
    if (status === 'accepted') {
      const application = await FirestoreService.getById<GigApplication>('applications', applicationId);
      if (application) {
        // Assign worker to gig
        await this.updateGig(application.gigId, {
          assignedTo: application.applicantId
        });

        // Reject other pending applications for this gig
        const otherApplications = await this.getApplicationsByGig(application.gigId);
        for (const app of otherApplications) {
          if (app.id !== applicationId && app.status === 'pending') {
            await FirestoreService.update('applications', app.id, { status: 'rejected' });
          }
        }
      }
    }

    // If funded, update gig status to in-progress (payment secured, work can begin)
    if (status === 'funded') {
      const application = await FirestoreService.getById<GigApplication>('applications', applicationId);
      if (application) {
        await this.updateGig(application.gigId, {
          status: 'in-progress'
        });
      }
    }
  }

  // Update application payment status
  static async updateApplicationPaymentStatus(
    applicationId: string,
    paymentStatus: GigApplication['paymentStatus'],
    paymentId?: string
  ): Promise<void> {
    const updateData: Partial<GigApplication> = { paymentStatus };
    if (paymentId) {
      updateData.paymentId = paymentId;
    }

    await FirestoreService.update('applications', applicationId, updateData);
  }

  // Withdraw application (job seeker can withdraw their pending application)
  static async withdrawApplication(applicationId: string): Promise<void> {
    const application = await FirestoreService.getById<GigApplication>('applications', applicationId);

    if (!application) {
      throw new Error('Application not found');
    }

    // Only allow withdrawal of pending applications
    if (application.status !== 'pending') {
      throw new Error(`Cannot withdraw application with status: ${application.status}. Only pending applications can be withdrawn.`);
    }

    await FirestoreService.update('applications', applicationId, { status: 'withdrawn' });
  }

  // Worker completion request operations
  static async requestCompletionByWorker(
    applicationId: string,
    workerId: string
  ): Promise<void> {
    const application = await FirestoreService.getById<GigApplication>('applications', applicationId);

    if (!application) {
      throw new Error('Application not found');
    }

    // Verify the worker is the assigned applicant
    if (application.applicantId !== workerId) {
      throw new Error('Only the assigned worker can request completion');
    }

    // Only funded applications can request completion
    if (application.status !== 'funded') {
      throw new Error('Only funded applications can request completion');
    }

    // Check if completion already requested
    if (application.completionRequestedAt) {
      throw new Error('Completion has already been requested for this application');
    }

    // Set completion request with auto-release window (configurable)
    const now = new Date();
    const escrowAutoReleaseDays = await ConfigService.getValue('escrowAutoReleaseDays').catch(() => 7);
    const autoReleaseDate = new Date(now.getTime() + escrowAutoReleaseDays * 24 * 60 * 60 * 1000);

    await FirestoreService.update('applications', applicationId, {
      completionRequestedAt: now,
      completionRequestedBy: 'worker',
      completionAutoReleaseAt: autoReleaseDate
    });
  }

  // Employer approves worker completion request
  static async approveCompletion(
    applicationId: string,
    employerId: string
  ): Promise<void> {
    const application = await FirestoreService.getById<GigApplication>('applications', applicationId);

    if (!application) {
      throw new Error('Application not found');
    }

    // Get the gig to verify employer
    const gig = await FirestoreService.getById<Gig>('gigs', application.gigId);
    if (!gig) {
      throw new Error('Gig not found');
    }

    // Verify the employer owns this gig
    if (gig.employerId !== employerId) {
      throw new Error('Only the gig employer can approve completion');
    }

    // Verify completion was requested
    if (!application.completionRequestedAt) {
      throw new Error('No completion request found for this application');
    }

    // Update application status to completed
    await FirestoreService.update('applications', applicationId, { status: 'completed' });

    // Update gig status to completed
    await this.updateGig(application.gigId, { status: 'completed' });

    // Release escrow if payment exists
    if (application.paymentId) {
      const { PaymentService } = await import('../services/paymentService');
      await PaymentService.releaseEscrow(application.paymentId);
    }
  }

  // Employer disputes worker completion request
  static async disputeCompletion(
    applicationId: string,
    employerId: string,
    disputeReason: string
  ): Promise<void> {
    const application = await FirestoreService.getById<GigApplication>('applications', applicationId);

    if (!application) {
      throw new Error('Application not found');
    }

    // Get the gig to verify employer
    const gig = await FirestoreService.getById<Gig>('gigs', application.gigId);
    if (!gig) {
      throw new Error('Gig not found');
    }

    // Verify the employer owns this gig
    if (gig.employerId !== employerId) {
      throw new Error('Only the gig employer can dispute completion');
    }

    // Verify completion was requested
    if (!application.completionRequestedAt) {
      throw new Error('No completion request found for this application');
    }

    // Check if already disputed
    if (application.completionDisputedAt) {
      throw new Error('Completion has already been disputed');
    }

    // Validate dispute reason
    if (!disputeReason || disputeReason.trim().length < 10) {
      throw new Error('Dispute reason must be at least 10 characters');
    }

    // Mark as disputed and clear auto-release
    await FirestoreService.update('applications', applicationId, {
      completionDisputedAt: new Date(),
      completionDisputeReason: disputeReason,
      completionAutoReleaseAt: undefined // Remove auto-release when disputed
    });
  }

  // Check and process auto-release for applications with expired completion requests
  static async checkAndProcessAutoRelease(applicationId: string): Promise<boolean> {
    const application = await FirestoreService.getById<GigApplication>('applications', applicationId);

    if (!application) {
      return false;
    }

    // Check if eligible for auto-release
    if (
      application.status === 'funded' &&
      application.completionRequestedAt &&
      application.completionAutoReleaseAt &&
      !application.completionDisputedAt
    ) {
      const now = new Date();
      const autoReleaseDate = new Date(application.completionAutoReleaseAt);

      // If auto-release date has passed, automatically complete and release
      if (now >= autoReleaseDate) {
        // Update application status to completed
        await FirestoreService.update('applications', applicationId, { status: 'completed' });

        // Update gig status to completed
        await this.updateGig(application.gigId, { status: 'completed' });

        // Release escrow if payment exists
        if (application.paymentId) {
          const { PaymentService } = await import('../services/paymentService');
          await PaymentService.releaseEscrow(application.paymentId);
        }

        return true;
      }
    }

    return false;
  }

  // Admin dispute resolution operations
  static async getAllDisputedApplications(): Promise<GigApplication[]> {
    const allApplications = await FirestoreService.getAll<GigApplication>('applications');

    // Filter for applications with active disputes
    return allApplications.filter(app =>
      app.status === 'funded' &&
      app.completionRequestedAt &&
      app.completionDisputedAt &&
      !app.completionResolvedAt
    );
  }

  static async resolveDisputeInFavorOfWorker(
    applicationId: string,
    adminId: string,
    resolutionNotes?: string
  ): Promise<void> {
    const application = await FirestoreService.getById<GigApplication>('applications', applicationId);

    if (!application) {
      throw new Error('Application not found');
    }

    // Verify this is a disputed application
    if (!application.completionDisputedAt) {
      throw new Error('This application does not have an active dispute');
    }

    if (application.completionResolvedAt) {
      throw new Error('This dispute has already been resolved');
    }

    // Mark dispute as resolved in favor of worker
    await FirestoreService.update('applications', applicationId, {
      completionResolvedAt: new Date(),
      completionResolvedBy: adminId,
      completionResolution: 'approved',
      completionResolutionNotes: resolutionNotes,
      status: 'completed'
    });

    // Update gig status to completed
    await this.updateGig(application.gigId, { status: 'completed' });

    // Release escrow to worker
    if (application.paymentId) {
      const { PaymentService } = await import('../services/paymentService');
      await PaymentService.releaseEscrow(application.paymentId);
    }
  }

  static async resolveDisputeInFavorOfEmployer(
    applicationId: string,
    adminId: string,
    resolutionNotes?: string
  ): Promise<void> {
    const application = await FirestoreService.getById<GigApplication>('applications', applicationId);

    if (!application) {
      throw new Error('Application not found');
    }

    // Verify this is a disputed application
    if (!application.completionDisputedAt) {
      throw new Error('This application does not have an active dispute');
    }

    if (application.completionResolvedAt) {
      throw new Error('This dispute has already been resolved');
    }

    // Mark dispute as resolved in favor of employer
    // Worker needs to continue work or redo the work
    await FirestoreService.update('applications', applicationId, {
      completionResolvedAt: new Date(),
      completionResolvedBy: adminId,
      completionResolution: 'rejected',
      completionResolutionNotes: resolutionNotes,
      // Clear completion request fields so worker can request again after fixes
      completionRequestedAt: undefined,
      completionRequestedBy: undefined,
      completionDisputedAt: undefined,
      completionDisputeReason: undefined
    });

    // Note: Gig stays in 'in-progress' status, worker should continue/redo work
    // Escrow remains locked until work is properly completed
  }

  // Review operations
  static async createReview(reviewData: Omit<Review, 'id' | 'createdAt'>): Promise<string> {
    const review = {
      ...reviewData,
      createdAt: new Date()
    };

    return await FirestoreService.create('reviews', review);
  }

  static async getReviewsByUser(userId: string, type?: Review['type']): Promise<Review[]> {
    let reviews: Review[] = [];

    if (type) {
      const field = type === 'employer-to-worker' ? 'revieweeId' : 'reviewerId';
      reviews = await FirestoreService.getWhere<Review>('reviews', field, '==', userId, 'createdAt');
    } else {
      const reviewsAsReviewer = await FirestoreService.getWhere<Review>('reviews', 'reviewerId', '==', userId, 'createdAt');
      const reviewsAsReviewee = await FirestoreService.getWhere<Review>('reviews', 'revieweeId', '==', userId, 'createdAt');
      reviews = [...reviewsAsReviewer, ...reviewsAsReviewee];
    }

    return reviews;
  }

  static async getReviewsByGig(gigId: string): Promise<Review[]> {
    return await FirestoreService.getWhere<Review>('reviews', 'gigId', '==', gigId, 'createdAt');
  }

  static async calculateUserRating(userId: string): Promise<number> {
    const reviews = await FirestoreService.getWhere<Review>('reviews', 'revieweeId', '==', userId);

    if (reviews.length === 0) return 0;

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    return Math.round((totalRating / reviews.length) * 10) / 10; // Round to 1 decimal place
  }

  // Safety Check-in functions

  /**
   * Worker checks in at the gig location
   * @param applicationId The application ID
   * @param userId The user ID (for verification)
   * @param location GPS coordinates of check-in
   */
  static async checkIn(
    applicationId: string,
    userId: string,
    location?: Coordinates
  ): Promise<void> {
    const application = await FirestoreService.getById<GigApplication>('applications', applicationId);
    if (!application) {
      throw new Error('Application not found');
    }

    if (application.applicantId !== userId) {
      throw new Error('Unauthorized: Only the assigned worker can check in');
    }

    if (application.status !== 'funded') {
      throw new Error('Can only check in for funded gigs');
    }

    if (application.checkInAt) {
      throw new Error('Already checked in');
    }

    const now = new Date();
    await FirestoreService.update('applications', applicationId, {
      checkInAt: now,
      checkInLocation: location,
      lastSafetyCheckAt: now,
      missedSafetyChecks: 0
    });
  }

  /**
   * Worker checks out from the gig location
   * @param applicationId The application ID
   * @param userId The user ID (for verification)
   * @param location GPS coordinates of check-out
   */
  static async checkOut(
    applicationId: string,
    userId: string,
    location?: Coordinates
  ): Promise<void> {
    const application = await FirestoreService.getById<GigApplication>('applications', applicationId);
    if (!application) {
      throw new Error('Application not found');
    }

    if (application.applicantId !== userId) {
      throw new Error('Unauthorized: Only the assigned worker can check out');
    }

    if (!application.checkInAt) {
      throw new Error('Must check in before checking out');
    }

    if (application.checkOutAt) {
      throw new Error('Already checked out');
    }

    await FirestoreService.update('applications', applicationId, {
      checkOutAt: new Date(),
      checkOutLocation: location
    });
  }

  /**
   * Worker performs a safety check (confirms they're safe)
   * @param applicationId The application ID
   * @param userId The user ID (for verification)
   */
  static async performSafetyCheck(
    applicationId: string,
    userId: string
  ): Promise<void> {
    const application = await FirestoreService.getById<GigApplication>('applications', applicationId);
    if (!application) {
      throw new Error('Application not found');
    }

    if (application.applicantId !== userId) {
      throw new Error('Unauthorized');
    }

    if (!application.checkInAt || application.checkOutAt) {
      throw new Error('Safety check only available during active work');
    }

    await FirestoreService.update('applications', applicationId, {
      lastSafetyCheckAt: new Date(),
      missedSafetyChecks: 0
    });
  }

  /**
   * Get check-in status for an application
   * @param applicationId The application ID
   */
  static async getCheckInStatus(applicationId: string): Promise<{
    isCheckedIn: boolean;
    checkInAt?: Date;
    checkOutAt?: Date;
    lastSafetyCheckAt?: Date;
    missedSafetyChecks: number;
    needsSafetyCheck: boolean;
  }> {
    const application = await FirestoreService.getById<GigApplication>('applications', applicationId);
    if (!application) {
      throw new Error('Application not found');
    }

    const isCheckedIn = !!application.checkInAt && !application.checkOutAt;
    const missedSafetyChecks = application.missedSafetyChecks || 0;

    // Need safety check if checked in and last check was more than configured interval
    let needsSafetyCheck = false;
    if (isCheckedIn && application.lastSafetyCheckAt) {
      const safetyCheckInterval = await ConfigService.getValue('safetyCheckIntervalHours').catch(() => 2);
      const hoursSinceLastCheck =
        (Date.now() - application.lastSafetyCheckAt.getTime()) / (1000 * 60 * 60);
      needsSafetyCheck = hoursSinceLastCheck >= safetyCheckInterval;
    }

    return {
      isCheckedIn,
      checkInAt: application.checkInAt,
      checkOutAt: application.checkOutAt,
      lastSafetyCheckAt: application.lastSafetyCheckAt,
      missedSafetyChecks,
      needsSafetyCheck
    };
  }

  /**
   * Expire old unfunded gigs and overdue gigs
   * This function can be called manually or scheduled to run periodically
   * @returns Object with counts of expired gigs
   */
  static async expireOldGigs(): Promise<{
    unfundedExpired: number
    overdueExpired: number
    total: number
  }> {
    const now = new Date()
    const gigExpiryTimeoutDays = await ConfigService.getValue('gigExpiryTimeoutDays').catch(() => 7);
    const expiryDate = new Date(now.getTime() - gigExpiryTimeoutDays * 24 * 60 * 60 * 1000)

    let unfundedExpired = 0
    let overdueExpired = 0

    // Get all open and in-progress gigs to check for expiry
    const openGigs = await this.getGigsByStatus('open')
    const inProgressGigs = await this.getGigsByStatus('in-progress')
    const allGigs = [...openGigs, ...inProgressGigs]

    for (const gig of allGigs) {
      try {
        // Check for unfunded gigs older than configured timeout (open status only)
        if (gig.status === 'open' && gig.createdAt <= expiryDate) {
          // Check if gig has any funded applications
          const applications = await this.getApplicationsByGig(gig.id)
          const hasFundedApplication = applications.some(app => app.status === 'funded')

          if (!hasFundedApplication) {
            // Cancel unfunded gig
            await this.updateGig(gig.id, {
              status: 'cancelled'
            })
            unfundedExpired++
            console.log(`Expired unfunded gig ${gig.id} (created ${gig.createdAt.toISOString()})`)
            continue // Skip deadline check since we already cancelled
          }
        }

        // Check for gigs past their deadline
        if (gig.deadline && now > gig.deadline) {
          // Cancel overdue gigs that are still open or in-progress
          if (gig.status === 'open' || gig.status === 'in-progress') {
            await this.updateGig(gig.id, {
              status: 'cancelled'
            })
            overdueExpired++
            console.log(`Expired overdue gig ${gig.id} (deadline ${gig.deadline.toISOString()})`)
          }
        }
      } catch (error) {
        console.error(`Error expiring gig ${gig.id}:`, error)
        // Continue processing other gigs even if one fails
      }
    }

    const total = unfundedExpired + overdueExpired
    console.log(`Gig expiry complete: ${unfundedExpired} unfunded, ${overdueExpired} overdue, ${total} total`)

    return {
      unfundedExpired,
      overdueExpired,
      total
    }
  }

  /**
   * Check if a single gig should be expired and expire it if needed
   * Useful for on-demand expiry checks
   * @param gigId The gig ID to check
   * @returns Whether the gig was expired
   */
  static async checkAndExpireGig(gigId: string): Promise<boolean> {
    const gig = await this.getGigById(gigId)
    if (!gig) {
      return false
    }

    // Only check open and in-progress gigs
    if (gig.status !== 'open' && gig.status !== 'in-progress') {
      return false
    }

    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Check for unfunded gigs older than 7 days
    if (gig.status === 'open' && gig.createdAt <= sevenDaysAgo) {
      const applications = await this.getApplicationsByGig(gig.id)
      const hasFundedApplication = applications.some(app => app.status === 'funded')

      if (!hasFundedApplication) {
        await this.updateGig(gig.id, { status: 'cancelled' })
        console.log(`Expired unfunded gig ${gig.id}`)
        return true
      }
    }

    // Check for gigs past their deadline
    if (gig.deadline && now > gig.deadline) {
      await this.updateGig(gig.id, { status: 'cancelled' })
      console.log(`Expired overdue gig ${gig.id}`)
      return true
    }

    return false
  }

  /**
   * Timeout unfunded accepted applications after configured timeout
   * This function can be called manually or scheduled to run periodically
   * @returns Object with count of timed-out applications
   */
  static async timeoutUnfundedApplications(): Promise<{
    timedOut: number
  }> {
    const now = new Date()
    const fundingTimeoutHours = await ConfigService.getValue('fundingTimeoutHours').catch(() => 48);
    const timeoutDate = new Date(now.getTime() - fundingTimeoutHours * 60 * 60 * 1000)

    let timedOut = 0

    // Get all accepted applications
    const acceptedApplications = await FirestoreService.getWhere<GigApplication>(
      'applications',
      'status',
      '==',
      'accepted'
    )

    for (const application of acceptedApplications) {
      try {
        // Check if application was accepted more than configured timeout ago
        if (application.acceptedAt && application.acceptedAt <= timeoutDate) {
          // Timeout the application (reject it)
          await FirestoreService.update('applications', application.id, {
            status: 'rejected'
          })

          // Unassign worker from gig (set back to undefined)
          await this.updateGig(application.gigId, {
            assignedTo: undefined
          })

          timedOut++
          console.log(
            `Timed out unfunded application ${application.id} (accepted ${application.acceptedAt.toISOString()})`
          )
        }
      } catch (error) {
        console.error(`Error timing out application ${application.id}:`, error)
        // Continue processing other applications even if one fails
      }
    }

    console.log(`Funding timeout complete: ${timedOut} applications timed out`)

    return {
      timedOut
    }
  }

  /**
   * Check if a single application should be timed out and timeout if needed
   * Useful for on-demand timeout checks
   * @param applicationId The application ID to check
   * @returns Whether the application was timed out
   */
  static async checkAndTimeoutApplication(applicationId: string): Promise<boolean> {
    const application = await FirestoreService.getById<GigApplication>('applications', applicationId)
    if (!application) {
      return false
    }

    // Only check accepted applications
    if (application.status !== 'accepted') {
      return false
    }

    // Check if acceptedAt timestamp exists and is older than configured timeout
    if (!application.acceptedAt) {
      return false
    }

    const now = new Date()
    const fundingTimeoutHours = await ConfigService.getValue('fundingTimeoutHours').catch(() => 48);
    const timeoutDate = new Date(now.getTime() - fundingTimeoutHours * 60 * 60 * 1000)

    if (application.acceptedAt <= timeoutDate) {
      // Timeout the application
      await FirestoreService.update('applications', application.id, {
        status: 'rejected'
      })

      // Unassign worker from gig
      await this.updateGig(application.gigId, {
        assignedTo: undefined
      })

      console.log(`Timed out unfunded application ${application.id}`)
      return true
    }

    return false
  }
}