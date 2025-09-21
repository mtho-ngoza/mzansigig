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
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData
} from 'firebase/firestore';
import { db } from '../firebase';
import { User } from '@/types/auth';

export class FirestoreService {
  // Generic CRUD operations
  static async create<T extends DocumentData>(
    collectionName: string,
    data: T
  ): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, collectionName), data);
      return docRef.id;
    } catch (error: any) {
      throw new Error(`Error creating document: ${error.message}`);
    }
  }

  static async getById<T>(
    collectionName: string,
    id: string
  ): Promise<T | null> {
    try {
      const docRef = doc(db, collectionName, id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as T;
      }

      return null;
    } catch (error: any) {
      throw new Error(`Error getting document: ${error.message}`);
    }
  }

  static async update(
    collectionName: string,
    id: string,
    data: Partial<DocumentData>
  ): Promise<void> {
    try {
      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, data);
    } catch (error: any) {
      throw new Error(`Error updating document: ${error.message}`);
    }
  }

  static async delete(
    collectionName: string,
    id: string
  ): Promise<void> {
    try {
      const docRef = doc(db, collectionName, id);
      await deleteDoc(docRef);
    } catch (error: any) {
      throw new Error(`Error deleting document: ${error.message}`);
    }
  }

  static async getAll<T>(
    collectionName: string,
    orderByField?: string,
    orderDirection: 'asc' | 'desc' = 'desc',
    limitCount?: number
  ): Promise<T[]> {
    try {
      let q = collection(db, collectionName);
      let queryConstraints: any[] = [];

      if (orderByField) {
        queryConstraints.push(orderBy(orderByField, orderDirection));
      }

      if (limitCount) {
        queryConstraints.push(limit(limitCount));
      }

      if (queryConstraints.length > 0) {
        q = query(collection(db, collectionName), ...queryConstraints);
      }

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as T[];
    } catch (error: any) {
      throw new Error(`Error getting documents: ${error.message}`);
    }
  }

  static async getWhere<T>(
    collectionName: string,
    field: string,
    operator: any,
    value: any,
    orderByField?: string,
    orderDirection: 'asc' | 'desc' = 'desc',
    limitCount?: number
  ): Promise<T[]> {
    try {
      let queryConstraints: any[] = [where(field, operator, value)];

      if (orderByField) {
        queryConstraints.push(orderBy(orderByField, orderDirection));
      }

      if (limitCount) {
        queryConstraints.push(limit(limitCount));
      }

      const q = query(collection(db, collectionName), ...queryConstraints);
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as T[];
    } catch (error: any) {
      throw new Error(`Error querying documents: ${error.message}`);
    }
  }

  // User-specific operations
  static async getUserByEmail(email: string): Promise<User | null> {
    try {
      const users = await this.getWhere<User>('users', 'email', '==', email, undefined, 'desc', 1);
      return users.length > 0 ? users[0] : null;
    } catch (error: any) {
      throw new Error(`Error getting user by email: ${error.message}`);
    }
  }

  static async getUsersByType(userType: 'job-seeker' | 'employer'): Promise<User[]> {
    try {
      return await this.getWhere<User>('users', 'userType', '==', userType, 'createdAt');
    } catch (error: any) {
      throw new Error(`Error getting users by type: ${error.message}`);
    }
  }

  static async searchUsers(searchTerm: string, userType?: 'job-seeker' | 'employer'): Promise<User[]> {
    try {
      // Note: Firestore doesn't support full-text search natively
      // This is a basic implementation that searches by firstName and lastName
      // For production, consider using Algolia or similar service for full-text search

      let users: User[] = [];

      if (userType) {
        users = await this.getUsersByType(userType);
      } else {
        users = await this.getAll<User>('users');
      }

      const searchTermLower = searchTerm.toLowerCase();

      return users.filter(user =>
        user.firstName.toLowerCase().includes(searchTermLower) ||
        user.lastName.toLowerCase().includes(searchTermLower) ||
        user.email.toLowerCase().includes(searchTermLower) ||
        (user.skills && user.skills.some(skill =>
          skill.toLowerCase().includes(searchTermLower)
        ))
      );
    } catch (error: any) {
      throw new Error(`Error searching users: ${error.message}`);
    }
  }
}