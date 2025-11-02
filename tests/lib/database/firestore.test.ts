/**
 * FirestoreService Tests
 * Core database layer - critical for all database operations
 */

import { FirestoreService } from '@/lib/database/firestore';
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { User } from '@/types/auth';

// Mock Firebase Firestore
jest.mock('firebase/firestore');
jest.mock('../../../lib/firebase', () => ({
  db: {}
}));

describe('FirestoreService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a document and return its ID', async () => {
      const mockDocId = 'doc-123';
      const mockData = { name: 'Test', value: 42 };

      (addDoc as jest.Mock).mockResolvedValue({ id: mockDocId });
      (collection as jest.Mock).mockReturnValue({});

      const result = await FirestoreService.create('testCollection', mockData);

      expect(result).toBe(mockDocId);
      expect(addDoc).toHaveBeenCalled();
    });

    it('should throw error when creation fails', async () => {
      (addDoc as jest.Mock).mockRejectedValue(new Error('Firebase error'));
      (collection as jest.Mock).mockReturnValue({});

      await expect(
        FirestoreService.create('testCollection', {})
      ).rejects.toThrow('Error creating document: Firebase error');
    });
  });

  describe('getById', () => {
    it('should return document when it exists', async () => {
      const mockId = 'doc-123';
      const mockData = { name: 'Test' };
      const mockDocSnap = {
        exists: () => true,
        id: mockId,
        data: () => mockData
      };

      (doc as jest.Mock).mockReturnValue({});
      (getDoc as jest.Mock).mockResolvedValue(mockDocSnap);

      const result = await FirestoreService.getById('testCollection', mockId);

      expect(result).toEqual({ id: mockId, ...mockData });
    });

    it('should return null when document does not exist', async () => {
      const mockDocSnap = {
        exists: () => false
      };

      (doc as jest.Mock).mockReturnValue({});
      (getDoc as jest.Mock).mockResolvedValue(mockDocSnap);

      const result = await FirestoreService.getById('testCollection', 'non-existent');

      expect(result).toBeNull();
    });

    it('should throw error when getDoc fails', async () => {
      (doc as jest.Mock).mockReturnValue({});
      (getDoc as jest.Mock).mockRejectedValue(new Error('Permission denied'));

      await expect(
        FirestoreService.getById('testCollection', 'doc-123')
      ).rejects.toThrow('Error getting document: Permission denied');
    });
  });

  describe('update', () => {
    it('should update document successfully', async () => {
      const mockId = 'doc-123';
      const mockData = { name: 'Updated' };

      (doc as jest.Mock).mockReturnValue({});
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      await FirestoreService.update('testCollection', mockId, mockData);

      expect(updateDoc).toHaveBeenCalled();
    });

    it('should throw error when update fails', async () => {
      (doc as jest.Mock).mockReturnValue({});
      (updateDoc as jest.Mock).mockRejectedValue(new Error('Document not found'));

      await expect(
        FirestoreService.update('testCollection', 'doc-123', {})
      ).rejects.toThrow('Error updating document: Document not found');
    });
  });

  describe('delete', () => {
    it('should delete document successfully', async () => {
      const mockId = 'doc-123';

      (doc as jest.Mock).mockReturnValue({});
      (deleteDoc as jest.Mock).mockResolvedValue(undefined);

      await FirestoreService.delete('testCollection', mockId);

      expect(deleteDoc).toHaveBeenCalled();
    });

    it('should throw error when delete fails', async () => {
      (doc as jest.Mock).mockReturnValue({});
      (deleteDoc as jest.Mock).mockRejectedValue(new Error('Permission denied'));

      await expect(
        FirestoreService.delete('testCollection', 'doc-123')
      ).rejects.toThrow('Error deleting document: Permission denied');
    });
  });

  describe('getAll', () => {
    it('should return all documents from collection', async () => {
      const mockDocs = [
        { id: 'doc-1', data: () => ({ name: 'First' }) },
        { id: 'doc-2', data: () => ({ name: 'Second' }) }
      ];
      const mockQuerySnapshot = { docs: mockDocs };

      (collection as jest.Mock).mockReturnValue({});
      (getDocs as jest.Mock).mockResolvedValue(mockQuerySnapshot);

      const result = await FirestoreService.getAll('testCollection');

      expect(result).toEqual([
        { id: 'doc-1', name: 'First' },
        { id: 'doc-2', name: 'Second' }
      ]);
    });

    it('should apply orderBy when provided', async () => {
      const mockQuerySnapshot = { docs: [] };

      (collection as jest.Mock).mockReturnValue({});
      (query as jest.Mock).mockReturnValue({});
      (orderBy as jest.Mock).mockReturnValue({});
      (getDocs as jest.Mock).mockResolvedValue(mockQuerySnapshot);

      await FirestoreService.getAll('testCollection', 'createdAt', 'desc');

      expect(orderBy).toHaveBeenCalledWith('createdAt', 'desc');
    });

    it('should apply limit when provided', async () => {
      const mockQuerySnapshot = { docs: [] };

      (collection as jest.Mock).mockReturnValue({});
      (query as jest.Mock).mockReturnValue({});
      (orderBy as jest.Mock).mockReturnValue({});
      (limit as jest.Mock).mockReturnValue({});
      (getDocs as jest.Mock).mockResolvedValue(mockQuerySnapshot);

      await FirestoreService.getAll('testCollection', 'createdAt', 'desc', 10);

      expect(limit).toHaveBeenCalledWith(10);
    });

    it('should throw error when query fails', async () => {
      (collection as jest.Mock).mockReturnValue({});
      (getDocs as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(
        FirestoreService.getAll('testCollection')
      ).rejects.toThrow('Error getting documents: Network error');
    });
  });

  describe('getWhere', () => {
    it('should query documents with where clause', async () => {
      const mockDocs = [
        { id: 'doc-1', data: () => ({ status: 'active' }) }
      ];
      const mockQuerySnapshot = { docs: mockDocs };

      (collection as jest.Mock).mockReturnValue({});
      (query as jest.Mock).mockReturnValue({});
      (where as jest.Mock).mockReturnValue({});
      (getDocs as jest.Mock).mockResolvedValue(mockQuerySnapshot);

      const result = await FirestoreService.getWhere(
        'testCollection',
        'status',
        '==',
        'active'
      );

      expect(where).toHaveBeenCalledWith('status', '==', 'active');
      expect(result).toEqual([{ id: 'doc-1', status: 'active' }]);
    });

    it('should apply orderBy with where clause', async () => {
      const mockQuerySnapshot = { docs: [] };

      (collection as jest.Mock).mockReturnValue({});
      (query as jest.Mock).mockReturnValue({});
      (where as jest.Mock).mockReturnValue({});
      (orderBy as jest.Mock).mockReturnValue({});
      (getDocs as jest.Mock).mockResolvedValue(mockQuerySnapshot);

      await FirestoreService.getWhere(
        'testCollection',
        'status',
        '==',
        'active',
        'createdAt',
        'desc'
      );

      expect(where).toHaveBeenCalledWith('status', '==', 'active');
      expect(orderBy).toHaveBeenCalledWith('createdAt', 'desc');
    });

    it('should apply limit with where clause', async () => {
      const mockQuerySnapshot = { docs: [] };

      (collection as jest.Mock).mockReturnValue({});
      (query as jest.Mock).mockReturnValue({});
      (where as jest.Mock).mockReturnValue({});
      (limit as jest.Mock).mockReturnValue({});
      (getDocs as jest.Mock).mockResolvedValue(mockQuerySnapshot);

      await FirestoreService.getWhere(
        'testCollection',
        'status',
        '==',
        'active',
        undefined,
        'desc',
        5
      );

      expect(limit).toHaveBeenCalledWith(5);
    });

    it('should handle array-contains operator', async () => {
      const mockQuerySnapshot = { docs: [] };

      (collection as jest.Mock).mockReturnValue({});
      (query as jest.Mock).mockReturnValue({});
      (where as jest.Mock).mockReturnValue({});
      (getDocs as jest.Mock).mockResolvedValue(mockQuerySnapshot);

      await FirestoreService.getWhere(
        'conversations',
        'participantIds',
        'array-contains',
        'user-123'
      );

      expect(where).toHaveBeenCalledWith('participantIds', 'array-contains', 'user-123');
    });

    it('should throw error when query fails', async () => {
      (collection as jest.Mock).mockReturnValue({});
      (query as jest.Mock).mockReturnValue({});
      (where as jest.Mock).mockReturnValue({});
      (getDocs as jest.Mock).mockRejectedValue(new Error('Permission denied'));

      await expect(
        FirestoreService.getWhere('testCollection', 'field', '==', 'value')
      ).rejects.toThrow('Error querying documents: Permission denied');
    });
  });

  describe('getUserByEmail', () => {
    it('should return user when found', async () => {
      const mockUser: User = {
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        phone: '+27123456789',
        location: 'Johannesburg',
        userType: 'job-seeker',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (collection as jest.Mock).mockReturnValue({});
      (query as jest.Mock).mockReturnValue({});
      (where as jest.Mock).mockReturnValue({});
      (limit as jest.Mock).mockReturnValue({});
      (getDocs as jest.Mock).mockResolvedValue({
        docs: [{ id: 'user-1', data: () => mockUser }]
      });

      const result = await FirestoreService.getUserByEmail('test@example.com');

      expect(result).toBeTruthy();
      expect(result?.email).toBe('test@example.com');
    });

    it('should return null when user not found', async () => {
      (collection as jest.Mock).mockReturnValue({});
      (query as jest.Mock).mockReturnValue({});
      (where as jest.Mock).mockReturnValue({});
      (limit as jest.Mock).mockReturnValue({});
      (getDocs as jest.Mock).mockResolvedValue({ docs: [] });

      const result = await FirestoreService.getUserByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('getUsersByType', () => {
    it('should return all job seekers', async () => {
      const mockUsers = [
        { id: 'user-1', data: () => ({ userType: 'job-seeker' }) },
        { id: 'user-2', data: () => ({ userType: 'job-seeker' }) }
      ];

      (collection as jest.Mock).mockReturnValue({});
      (query as jest.Mock).mockReturnValue({});
      (where as jest.Mock).mockReturnValue({});
      (orderBy as jest.Mock).mockReturnValue({});
      (getDocs as jest.Mock).mockResolvedValue({ docs: mockUsers });

      const result = await FirestoreService.getUsersByType('job-seeker');

      expect(result).toHaveLength(2);
      expect(where).toHaveBeenCalledWith('userType', '==', 'job-seeker');
    });

    it('should return all employers', async () => {
      const mockUsers = [
        { id: 'user-1', data: () => ({ userType: 'employer' }) }
      ];

      (collection as jest.Mock).mockReturnValue({});
      (query as jest.Mock).mockReturnValue({});
      (where as jest.Mock).mockReturnValue({});
      (orderBy as jest.Mock).mockReturnValue({});
      (getDocs as jest.Mock).mockResolvedValue({ docs: mockUsers });

      const result = await FirestoreService.getUsersByType('employer');

      expect(result).toHaveLength(1);
      expect(where).toHaveBeenCalledWith('userType', '==', 'employer');
    });
  });

  describe('searchUsers', () => {
    it('should search users by first name', async () => {
      const mockUsers: User[] = [
        {
          id: 'user-1',
          email: 'john@example.com',
          firstName: 'John',
          lastName: 'Doe',
          phone: '+27123456789',
          location: 'Cape Town',
          userType: 'job-seeker',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'user-2',
          email: 'jane@example.com',
          firstName: 'Jane',
          lastName: 'Smith',
          phone: '+27987654321',
          location: 'Durban',
          userType: 'job-seeker',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      (collection as jest.Mock).mockReturnValue({});
      (query as jest.Mock).mockReturnValue({});
      (where as jest.Mock).mockReturnValue({});
      (orderBy as jest.Mock).mockReturnValue({});
      (getDocs as jest.Mock).mockResolvedValue({
        docs: mockUsers.map(u => ({ id: u.id, data: () => u }))
      });

      const result = await FirestoreService.searchUsers('joh', 'job-seeker');

      expect(result).toHaveLength(1);
      expect(result[0].firstName).toBe('John');
    });

    it('should search users by email', async () => {
      const mockUsers: User[] = [
        {
          id: 'user-1',
          email: 'john@example.com',
          firstName: 'John',
          lastName: 'Doe',
          phone: '+27123456789',
          location: 'Cape Town',
          userType: 'job-seeker',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      (collection as jest.Mock).mockReturnValue({});
      (query as jest.Mock).mockReturnValue({});
      (where as jest.Mock).mockReturnValue({});
      (orderBy as jest.Mock).mockReturnValue({});
      (getDocs as jest.Mock).mockResolvedValue({
        docs: mockUsers.map(u => ({ id: u.id, data: () => u }))
      });

      const result = await FirestoreService.searchUsers('john@example', 'job-seeker');

      expect(result).toHaveLength(1);
      expect(result[0].email).toBe('john@example.com');
    });

    it('should search users by skills', async () => {
      const mockUsers: User[] = [
        {
          id: 'user-1',
          email: 'dev@example.com',
          firstName: 'Developer',
          lastName: 'Pro',
          phone: '+27123456789',
          location: 'Johannesburg',
          userType: 'job-seeker',
          skills: ['JavaScript', 'React', 'Node.js'],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      (collection as jest.Mock).mockReturnValue({});
      (query as jest.Mock).mockReturnValue({});
      (where as jest.Mock).mockReturnValue({});
      (orderBy as jest.Mock).mockReturnValue({});
      (getDocs as jest.Mock).mockResolvedValue({
        docs: mockUsers.map(u => ({ id: u.id, data: () => u }))
      });

      const result = await FirestoreService.searchUsers('react', 'job-seeker');

      expect(result).toHaveLength(1);
      expect(result[0].skills).toContain('React');
    });

    it('should return empty array when no matches found', async () => {
      const mockUsers: User[] = [
        {
          id: 'user-1',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          phone: '+27123456789',
          location: 'Pretoria',
          userType: 'job-seeker',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      (collection as jest.Mock).mockReturnValue({});
      (query as jest.Mock).mockReturnValue({});
      (where as jest.Mock).mockReturnValue({});
      (orderBy as jest.Mock).mockReturnValue({});
      (getDocs as jest.Mock).mockResolvedValue({
        docs: mockUsers.map(u => ({ id: u.id, data: () => u }))
      });

      const result = await FirestoreService.searchUsers('nonexistent', 'job-seeker');

      expect(result).toHaveLength(0);
    });
  });
});
