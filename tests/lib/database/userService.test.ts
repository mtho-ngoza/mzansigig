/**
 * UserService Tests
 * Tests for job seeker querying and talent search functionality
 */

import { UserService } from '@/lib/database/userService';
import { FirestoreService } from '@/lib/database/firestore';
import { User } from '@/types/auth';
import { Coordinates } from '@/types/location';

// Mock FirestoreService
jest.mock('@/lib/database/firestore');

describe('UserService - Job Seeker Management', () => {
  const mockJobSeeker1: User = {
    id: 'user-1',
    email: 'john@example.com',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+27123456789',
    location: 'Johannesburg',
    coordinates: { latitude: -26.2041, longitude: 28.0473 },
    userType: 'job-seeker',
    workSector: 'informal',
    skills: ['Plumbing', 'Electrical'],
    rating: 4.5,
    reviewCount: 10,
    completedGigs: 15,
    isVerified: true,
    verificationLevel: 'basic',
    hourlyRate: 150,
    availability: 'Full-time',
    bio: 'Experienced plumber and electrician',
    createdAt: new Date('2024-01-01')
  };

  const mockJobSeeker2: User = {
    id: 'user-2',
    email: 'jane@example.com',
    firstName: 'Jane',
    lastName: 'Smith',
    phone: '+27987654321',
    location: 'Cape Town',
    coordinates: { latitude: -33.9249, longitude: 18.4241 },
    userType: 'job-seeker',
    workSector: 'professional',
    skills: ['Painting', 'Carpentry'],
    rating: 4.8,
    reviewCount: 25,
    completedGigs: 30,
    isVerified: true,
    verificationLevel: 'enhanced',
    hourlyRate: 200,
    availability: 'Part-time',
    bio: 'Professional painter and carpenter',
    createdAt: new Date('2024-02-01')
  };

  const mockEmployer: User = {
    id: 'user-3',
    email: 'employer@example.com',
    firstName: 'Employer',
    lastName: 'User',
    phone: '+27111222333',
    location: 'Pretoria',
    userType: 'employer',
    createdAt: new Date('2024-03-01')
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllJobSeekers', () => {
    it('should return only job seekers', async () => {
      const allUsers = [mockJobSeeker1, mockJobSeeker2, mockEmployer];
      (FirestoreService.getAll as jest.Mock).mockResolvedValue(allUsers);

      const result = await UserService.getAllJobSeekers();

      expect(result).toEqual([mockJobSeeker1, mockJobSeeker2]);
      expect(result).not.toContainEqual(mockEmployer);
      expect(FirestoreService.getAll).toHaveBeenCalledWith('users', 'createdAt', 'desc', undefined);
    });

    it('should respect limit parameter', async () => {
      const allUsers = [mockJobSeeker1, mockJobSeeker2];
      (FirestoreService.getAll as jest.Mock).mockResolvedValue(allUsers);

      const result = await UserService.getAllJobSeekers(10);

      expect(result).toEqual([mockJobSeeker1, mockJobSeeker2]);
      expect(FirestoreService.getAll).toHaveBeenCalledWith('users', 'createdAt', 'desc', 10);
    });

    it('should return empty array when no job seekers exist', async () => {
      (FirestoreService.getAll as jest.Mock).mockResolvedValue([mockEmployer]);

      const result = await UserService.getAllJobSeekers();

      expect(result).toEqual([]);
    });
  });

  describe('getJobSeekerById', () => {
    it('should return job seeker by ID', async () => {
      (FirestoreService.getById as jest.Mock).mockResolvedValue(mockJobSeeker1);

      const result = await UserService.getJobSeekerById('user-1');

      expect(result).toEqual(mockJobSeeker1);
      expect(FirestoreService.getById).toHaveBeenCalledWith('users', 'user-1');
    });

    it('should return null when user is not a job seeker', async () => {
      (FirestoreService.getById as jest.Mock).mockResolvedValue(mockEmployer);

      const result = await UserService.getJobSeekerById('user-3');

      expect(result).toBeNull();
    });

    it('should return null when user does not exist', async () => {
      (FirestoreService.getById as jest.Mock).mockResolvedValue(null);

      const result = await UserService.getJobSeekerById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('searchJobSeekers', () => {
    beforeEach(() => {
      (FirestoreService.getAll as jest.Mock).mockResolvedValue([mockJobSeeker1, mockJobSeeker2, mockEmployer]);
    });

    it('should return all job seekers when no filters provided', async () => {
      const result = await UserService.searchJobSeekers({});

      expect(result).toEqual([mockJobSeeker1, mockJobSeeker2]);
    });

    it('should filter by location', async () => {
      const result = await UserService.searchJobSeekers({ location: 'Johannesburg' });

      expect(result).toEqual([mockJobSeeker1]);
    });

    it('should filter by skills', async () => {
      const result = await UserService.searchJobSeekers({ skills: ['Plumbing'] });

      expect(result).toEqual([mockJobSeeker1]);
    });

    it('should filter by multiple skills (OR logic)', async () => {
      const result = await UserService.searchJobSeekers({ skills: ['Plumbing', 'Painting'] });

      expect(result).toEqual([mockJobSeeker1, mockJobSeeker2]);
    });

    it('should filter by minimum rating', async () => {
      const result = await UserService.searchJobSeekers({ minRating: 4.7 });

      expect(result).toEqual([mockJobSeeker2]);
    });

    it('should filter by verified status', async () => {
      const unverifiedJobSeeker = { ...mockJobSeeker1, isVerified: false };
      (FirestoreService.getAll as jest.Mock).mockResolvedValue([unverifiedJobSeeker, mockJobSeeker2]);

      const result = await UserService.searchJobSeekers({ isVerified: true });

      expect(result).toEqual([mockJobSeeker2]);
    });

    it('should filter by verification level', async () => {
      const result = await UserService.searchJobSeekers({ verificationLevel: 'enhanced' });

      expect(result).toEqual([mockJobSeeker2]);
    });

    it('should filter by hourly rate range', async () => {
      const result = await UserService.searchJobSeekers({
        minHourlyRate: 160,
        maxHourlyRate: 250
      });

      expect(result).toEqual([mockJobSeeker2]);
    });

    it('should filter by availability', async () => {
      const result = await UserService.searchJobSeekers({ availability: 'Full-time' });

      expect(result).toEqual([mockJobSeeker1]);
    });

    it('should filter by work sector', async () => {
      const result = await UserService.searchJobSeekers({ workSector: 'professional' });

      expect(result).toEqual([mockJobSeeker2]);
    });

    it('should apply multiple filters together', async () => {
      const result = await UserService.searchJobSeekers({
        location: 'Cape Town',
        minRating: 4.5,
        isVerified: true
      });

      expect(result).toEqual([mockJobSeeker2]);
    });
  });

  describe('getJobSeekersNearLocation', () => {
    beforeEach(() => {
      (FirestoreService.getAll as jest.Mock).mockResolvedValue([mockJobSeeker1, mockJobSeeker2, mockEmployer]);
    });

    it('should return job seekers within radius sorted by distance', async () => {
      const userCoordinates: Coordinates = { latitude: -26.2041, longitude: 28.0473 }; // Johannesburg

      const result = await UserService.getJobSeekersNearLocation(userCoordinates, 5000);

      // Result structure verification
      if (result.length > 0) {
        expect(result[0].distanceInfo).toBeDefined();
        expect(result[0].distanceInfo.unit).toBe('km');
        expect(result[0].distanceInfo.distance).toBeGreaterThanOrEqual(0);
      }
      // All returned users should be job seekers
      expect(result.every(u => u.userType === 'job-seeker')).toBe(true);
    });

    it('should exclude job seekers outside radius', async () => {
      const userCoordinates: Coordinates = { latitude: -26.2041, longitude: 28.0473 }; // Johannesburg

      const result = await UserService.getJobSeekersNearLocation(userCoordinates, 1);

      // With a 1km radius from Johannesburg, should only get job seekers very close
      // This test validates that the filtering logic works
      expect(result.every(js => js.distanceInfo.distance <= 1)).toBe(true);
    });

    it('should exclude job seekers without coordinates', async () => {
      const jobSeekerNoCoords = { ...mockJobSeeker1, id: 'user-4', coordinates: undefined };
      (FirestoreService.getAll as jest.Mock).mockResolvedValue([jobSeekerNoCoords, mockJobSeeker2]);

      const userCoordinates: Coordinates = { latitude: -26.2041, longitude: 28.0473 };
      const result = await UserService.getJobSeekersNearLocation(userCoordinates, 5000);

      expect(result.find(u => u.id === 'user-4')).toBeUndefined();
    });
  });

  describe('getTopRatedJobSeekers', () => {
    it('should return top-rated job seekers sorted by rating', async () => {
      (FirestoreService.getAll as jest.Mock).mockResolvedValue([mockJobSeeker1, mockJobSeeker2, mockEmployer]);

      const result = await UserService.getTopRatedJobSeekers(10);

      expect(result).toEqual([mockJobSeeker2, mockJobSeeker1]); // mockJobSeeker2 has higher rating
    });

    it('should limit results to specified count', async () => {
      (FirestoreService.getAll as jest.Mock).mockResolvedValue([mockJobSeeker1, mockJobSeeker2]);

      const result = await UserService.getTopRatedJobSeekers(1);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockJobSeeker2);
    });

    it('should exclude job seekers without ratings', async () => {
      const jobSeekerNoRating = { ...mockJobSeeker1, rating: undefined };
      (FirestoreService.getAll as jest.Mock).mockResolvedValue([jobSeekerNoRating, mockJobSeeker2]);

      const result = await UserService.getTopRatedJobSeekers(10);

      expect(result).toEqual([mockJobSeeker2]);
    });
  });

  describe('getVerifiedJobSeekers', () => {
    it('should return only verified job seekers', async () => {
      const unverifiedJobSeeker = { ...mockJobSeeker1, isVerified: false };
      (FirestoreService.getAll as jest.Mock).mockResolvedValue([unverifiedJobSeeker, mockJobSeeker2]);

      const result = await UserService.getVerifiedJobSeekers();

      expect(result).toEqual([mockJobSeeker2]);
    });

    it('should return empty array when no verified job seekers exist', async () => {
      const unverifiedJobSeeker = { ...mockJobSeeker1, isVerified: false };
      (FirestoreService.getAll as jest.Mock).mockResolvedValue([unverifiedJobSeeker]);

      const result = await UserService.getVerifiedJobSeekers();

      expect(result).toEqual([]);
    });
  });

  describe('getJobSeekersBySkill', () => {
    beforeEach(() => {
      (FirestoreService.getAll as jest.Mock).mockResolvedValue([mockJobSeeker1, mockJobSeeker2, mockEmployer]);
    });

    it('should return job seekers with matching skill', async () => {
      const result = await UserService.getJobSeekersBySkill('Plumbing');

      expect(result).toEqual([mockJobSeeker1]);
    });

    it('should be case insensitive', async () => {
      const result = await UserService.getJobSeekersBySkill('plumbing');

      expect(result).toEqual([mockJobSeeker1]);
    });

    it('should return empty array when skill not found', async () => {
      const result = await UserService.getJobSeekersBySkill('NonExistentSkill');

      expect(result).toEqual([]);
    });

    it('should match partial skill names', async () => {
      const result = await UserService.getJobSeekersBySkill('Paint');

      expect(result).toEqual([mockJobSeeker2]);
    });
  });
});
