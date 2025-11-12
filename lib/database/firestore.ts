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
  DocumentData,
  DocumentSnapshot,
  QueryConstraint,
  WhereFilterOp
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
    } catch (error: unknown) {
      throw new Error(`Error creating document: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    } catch (error: unknown) {
      throw new Error(`Error getting document: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    } catch (error: unknown) {
      throw new Error(`Error updating document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async delete(
    collectionName: string,
    id: string
  ): Promise<void> {
    try {
      const docRef = doc(db, collectionName, id);
      await deleteDoc(docRef);
    } catch (error: unknown) {
      throw new Error(`Error deleting document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async getAll<T>(
    collectionName: string,
    orderByField?: string,
    orderDirection: 'asc' | 'desc' = 'desc',
    limitCount?: number
  ): Promise<T[]> {
    try {
      const queryConstraints: QueryConstraint[] = [];

      if (orderByField) {
        queryConstraints.push(orderBy(orderByField, orderDirection));
      }

      if (limitCount) {
        queryConstraints.push(limit(limitCount));
      }

      const q = queryConstraints.length > 0
        ? query(collection(db, collectionName), ...queryConstraints)
        : collection(db, collectionName);

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as T[];
    } catch (error: unknown) {
      throw new Error(`Error getting documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async getWhere<T>(
    collectionName: string,
    field: string,
    operator: WhereFilterOp,
    value: unknown,
    orderByField?: string,
    orderDirection: 'asc' | 'desc' = 'desc',
    limitCount?: number
  ): Promise<T[]> {
    try {
      const queryConstraints: QueryConstraint[] = [where(field, operator, value)];

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
    } catch (error: unknown) {
      throw new Error(`Error querying documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Query documents with cursor-based pagination support
   * Returns both documents and the last document snapshot for pagination
   */
  static async getWhereWithCursor<T>(
    collectionName: string,
    field: string,
    operator: WhereFilterOp,
    value: unknown,
    orderByField: string,
    orderDirection: 'asc' | 'desc' = 'desc',
    limitCount: number,
    startAfterDoc?: DocumentSnapshot<DocumentData>
  ): Promise<{ items: T[]; lastDoc: DocumentSnapshot<DocumentData> | null }> {
    try {
      const queryConstraints: QueryConstraint[] = [
        where(field, operator, value),
        orderBy(orderByField, orderDirection),
        limit(limitCount)
      ];

      // Add cursor if provided
      if (startAfterDoc) {
        queryConstraints.push(startAfter(startAfterDoc));
      }

      const q = query(collection(db, collectionName), ...queryConstraints);
      const querySnapshot = await getDocs(q);

      const items = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as T[];

      // Get last document for next pagination
      const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1] || null;

      return { items, lastDoc };
    } catch (error: unknown) {
      throw new Error(`Error querying documents with cursor: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // User-specific operations
  static async getUserByEmail(email: string): Promise<User | null> {
    try {
      const users = await this.getWhere<User>('users', 'email', '==', email, undefined, 'desc', 1);
      return users.length > 0 ? users[0] : null;
    } catch (error: unknown) {
      throw new Error(`Error getting user by email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async getUsersByType(userType: 'job-seeker' | 'employer'): Promise<User[]> {
    try {
      return await this.getWhere<User>('users', 'userType', '==', userType, 'createdAt');
    } catch (error: unknown) {
      throw new Error(`Error getting users by type: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    } catch (error: unknown) {
      throw new Error(`Error searching users: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}