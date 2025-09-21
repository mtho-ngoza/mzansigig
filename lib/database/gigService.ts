import { FirestoreService } from './firestore';
import { Gig, GigApplication, Review } from '@/types/gig';

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

  static async getGigsByStatus(status: Gig['status']): Promise<Gig[]> {
    return await FirestoreService.getWhere<Gig>('gigs', 'status', '==', status, 'createdAt');
  }

  static async searchGigs(searchTerm: string, category?: string): Promise<Gig[]> {
    let gigs: Gig[] = [];

    if (category) {
      gigs = await FirestoreService.getWhere<Gig>('gigs', 'category', '==', category, 'createdAt');
    } else {
      gigs = await this.getAllGigs();
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

  // Application operations
  static async createApplication(
    applicationData: Omit<GigApplication, 'id' | 'createdAt'>
  ): Promise<string> {
    const application = {
      ...applicationData,
      createdAt: new Date(),
      status: 'pending' as const
    };

    const applicationId = await FirestoreService.create('applications', application);

    // Add applicant to gig's applicants array
    const gig = await this.getGigById(applicationData.gigId);
    if (gig) {
      const updatedApplicants = [...gig.applicants, applicationData.applicantId];
      await this.updateGig(applicationData.gigId, { applicants: updatedApplicants });
    }

    return applicationId;
  }

  static async getApplicationsByGig(gigId: string): Promise<GigApplication[]> {
    return await FirestoreService.getWhere<GigApplication>('applications', 'gigId', '==', gigId, 'createdAt');
  }

  static async getApplicationsByApplicant(applicantId: string): Promise<GigApplication[]> {
    return await FirestoreService.getWhere<GigApplication>('applications', 'applicantId', '==', applicantId, 'createdAt');
  }

  static async updateApplicationStatus(
    applicationId: string,
    status: GigApplication['status']
  ): Promise<void> {
    await FirestoreService.update('applications', applicationId, { status });

    // If accepted, update gig status and assign worker
    if (status === 'accepted') {
      const application = await FirestoreService.getById<GigApplication>('applications', applicationId);
      if (application) {
        await this.updateGig(application.gigId, {
          status: 'in-progress',
          assignedTo: application.applicantId
        });

        // Reject other applications for this gig
        const otherApplications = await this.getApplicationsByGig(application.gigId);
        for (const app of otherApplications) {
          if (app.id !== applicationId && app.status === 'pending') {
            await FirestoreService.update('applications', app.id, { status: 'rejected' });
          }
        }
      }
    }
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