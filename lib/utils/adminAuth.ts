/**
 * Admin Authentication Utilities
 * Helper functions for admin role checking and access control
 */

import { User } from '@/types/auth'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'

/**
 * Check if a user has admin privileges
 */
export function isAdmin(user: User | null): boolean {
  return user?.userType === 'admin'
}

/**
 * Require admin access - throws if user is not admin
 * @throws Error if user is not admin
 */
export function requireAdmin(user: User | null): void {
  if (!user) {
    throw new Error('Authentication required')
  }
  if (!isAdmin(user)) {
    throw new Error('Admin access required')
  }
}

/**
 * Get all admin users from the database
 * @returns Promise<User[]> List of admin users
 */
export async function getAdminUsers(): Promise<User[]> {
  const q = query(collection(db, 'users'), where('userType', '==', 'admin'))
  const querySnapshot = await getDocs(q)

  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate()
  })) as User[]
}

/**
 * Check if user has access to admin features
 * More flexible than requireAdmin - returns boolean instead of throwing
 */
export function canAccessAdminFeatures(user: User | null): boolean {
  return isAdmin(user)
}
