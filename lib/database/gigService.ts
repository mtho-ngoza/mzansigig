import { FirestoreService } from './firestore';
import { Gig, GigApplication, Review } from '@/types/gig';
import { Coordinates, LocationSearchOptions } from '@/types/location';
import {
  calculateDistance,
  isWithinRadius,
  sortByDistance,
  filterByRadius,
  getCityCoordinates
} from '@/lib/utils/locationUtils';
import type { DocumentSnapshot, DocumentData } from 'firebase/firestore';

export class GigService {
  // Gig CRUD operations
  static async createGig(gigData: Omit<Gig, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const gig = {
      ...gigData,
      createdAt: new Date(),
      updatedAt: new Date(),
      applicants: [],
      status: 'open' as const
    };

    // Add coordinates if location is provided
    if (gigData.location && !gigData.coordinates) {
      const coordinates = getCityCoordinates(gigData.location);
      if (coordinates) {
        gig.coordinates = coordinates;
      }
    }

    return await FirestoreService.create('gigs', gig);
  }

  static async getGigById(id: string): Promise<Gig | null> {
    return await FirestoreService.getById<Gig>('gigs', id);
  }

  static async updateGig(id: string, updates: Partial<Gig>): Promise<void> {
    const updateData = {
      ...updates,
      updatedAt: new Date()
    };

    await FirestoreService.update('gigs', id, updateData);
  }

  static async deleteGig(id: string): Promise<void> {
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

    const application = {
      ...applicationData,
      createdAt: new Date(),
      status: 'pending' as const
    };

    const applicationId = await FirestoreService.create('applications', application);

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

    await FirestoreService.update('applications', applicationId, { status });

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

    // Set completion request with 7-day auto-release window
    const now = new Date();
    const autoReleaseDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

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
}