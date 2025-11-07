import { FirestoreService } from './firestore';
import { User } from '@/types/auth';
import { Coordinates } from '@/types/location';
import { calculateDistance } from '@/lib/utils/locationUtils';

export interface TalentSearchFilters {
  skills?: string[];
  location?: string;
  maxDistance?: number; // in kilometers
  minRating?: number;
  verificationLevel?: 'basic' | 'enhanced' | 'premium';
  isVerified?: boolean;
  minHourlyRate?: number;
  maxHourlyRate?: number;
  availability?: string;
  workSector?: 'professional' | 'informal';
}

export class UserService {
  // Get all job seekers
  static async getAllJobSeekers(limitCount?: number): Promise<User[]> {
    const allUsers = await FirestoreService.getAll<User>('users', 'createdAt', 'desc', limitCount);
    return allUsers.filter(user => user.userType === 'job-seeker');
  }

  // Get job seeker by ID
  static async getJobSeekerById(id: string): Promise<User | null> {
    const user = await FirestoreService.getById<User>('users', id);
    if (user && user.userType === 'job-seeker') {
      return user;
    }
    return null;
  }

  // Search job seekers with filters
  static async searchJobSeekers(filters: TalentSearchFilters = {}): Promise<User[]> {
    // Start with all job seekers
    let jobSeekers = await this.getAllJobSeekers();

    // Filter by location if specified
    if (filters.location) {
      jobSeekers = jobSeekers.filter(
        user => user.location.toLowerCase().includes(filters.location!.toLowerCase())
      );
    }

    // Filter by skills if specified
    if (filters.skills && filters.skills.length > 0) {
      jobSeekers = jobSeekers.filter(user => {
        if (!user.skills || user.skills.length === 0) return false;

        return filters.skills!.some(filterSkill =>
          user.skills!.some(userSkill =>
            userSkill.toLowerCase().includes(filterSkill.toLowerCase()) ||
            filterSkill.toLowerCase().includes(userSkill.toLowerCase())
          )
        );
      });
    }

    // Filter by minimum rating if specified
    if (filters.minRating !== undefined && filters.minRating > 0) {
      jobSeekers = jobSeekers.filter(
        user => user.rating !== undefined && user.rating >= filters.minRating!
      );
    }

    // Filter by verification status if specified
    if (filters.isVerified !== undefined) {
      jobSeekers = jobSeekers.filter(
        user => user.isVerified === filters.isVerified
      );
    }

    // Filter by verification level if specified
    if (filters.verificationLevel) {
      jobSeekers = jobSeekers.filter(
        user => user.verificationLevel === filters.verificationLevel
      );
    }

    // Filter by hourly rate range if specified
    if (filters.minHourlyRate !== undefined) {
      jobSeekers = jobSeekers.filter(
        user => user.hourlyRate !== undefined && user.hourlyRate >= filters.minHourlyRate!
      );
    }

    if (filters.maxHourlyRate !== undefined) {
      jobSeekers = jobSeekers.filter(
        user => user.hourlyRate !== undefined && user.hourlyRate <= filters.maxHourlyRate!
      );
    }

    // Filter by availability if specified
    if (filters.availability) {
      jobSeekers = jobSeekers.filter(
        user => user.availability &&
                user.availability.toLowerCase().includes(filters.availability!.toLowerCase())
      );
    }

    // Filter by work sector if specified
    if (filters.workSector) {
      jobSeekers = jobSeekers.filter(
        user => user.workSector === filters.workSector
      );
    }

    return jobSeekers;
  }

  // Get job seekers near a location
  static async getJobSeekersNearLocation(
    coordinates: Coordinates,
    radiusKm: number = 25
  ): Promise<(User & { distanceInfo: { distance: number; unit: string } })[]> {
    const jobSeekers = await this.getAllJobSeekers();

    const jobSeekersWithDistance = jobSeekers
      .map(user => {
        if (!user.coordinates) return null;

        const distance = calculateDistance(coordinates, user.coordinates);
        if (distance <= radiusKm) {
          return {
            ...user,
            distanceInfo: {
              distance,
              unit: 'km' as const
            }
          };
        }
        return null;
      })
      .filter((user): user is NonNullable<typeof user> => user !== null)
      .sort((a, b) => a.distanceInfo.distance - b.distanceInfo.distance);

    return jobSeekersWithDistance;
  }

  // Get top-rated job seekers
  static async getTopRatedJobSeekers(limit: number = 10): Promise<User[]> {
    const jobSeekers = await this.getAllJobSeekers();

    return jobSeekers
      .filter(user => user.rating !== undefined && user.rating > 0)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, limit);
  }

  // Get verified job seekers
  static async getVerifiedJobSeekers(): Promise<User[]> {
    const jobSeekers = await this.getAllJobSeekers();
    return jobSeekers.filter(user => user.isVerified === true);
  }

  // Get job seekers by skill
  static async getJobSeekersBySkill(skill: string): Promise<User[]> {
    const jobSeekers = await this.getAllJobSeekers();

    return jobSeekers.filter(user =>
      user.skills?.some(s =>
        s.toLowerCase().includes(skill.toLowerCase()) ||
        skill.toLowerCase().includes(s.toLowerCase())
      )
    );
  }
}
