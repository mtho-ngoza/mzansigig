import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import { auth, db } from '../firebase';
import { User, LoginCredentials, RegisterData } from '@/types/auth';

export class FirebaseAuthService {
  static async signUp(data: RegisterData): Promise<User> {
    try {
      // Step 1: Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );

      const firebaseUser = userCredential.user;

      // Step 2: Update Firebase Auth profile
      await updateProfile(firebaseUser, {
        displayName: `${data.firstName} ${data.lastName}`
      });

      // Step 3: Create user document in Firestore
      const user: Partial<User> = {
        id: firebaseUser.uid,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        location: data.location,
        userType: data.userType,
        createdAt: new Date(),
      };

      // Only add optional fields if they have values (Firestore doesn't allow undefined)
      if (data.workSector) {
        user.workSector = data.workSector;
      }
      if (data.idNumber) {
        user.idNumber = data.idNumber;
      }

      await setDoc(doc(db, 'users', firebaseUser.uid), user);

      return user as User;
    } catch (error: unknown) {
      const firebaseError = error as FirebaseError;

      // More specific error handling
      if (firebaseError?.code === 'auth/email-already-in-use') {
        throw new Error('An account with this email already exists. Please try signing in instead.');
      } else if (firebaseError?.code === 'auth/weak-password') {
        throw new Error('Password is too weak. Please choose a stronger password.');
      } else if (firebaseError?.code === 'auth/invalid-email') {
        throw new Error('Please enter a valid email address.');
      } else if (firebaseError?.code?.startsWith('auth/')) {
        throw new Error(`Authentication error: ${firebaseError.message}`);
      } else if (firebaseError?.code?.startsWith('firestore/')) {
        throw new Error(`Database error: ${firebaseError.message}`);
      } else {
        throw new Error(firebaseError?.message || 'Registration failed. Please try again.');
      }
    }
  }

  static async signIn(credentials: LoginCredentials): Promise<User> {
    try {
      // Step 1: Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(
        auth,
        credentials.email,
        credentials.password
      );

      // Step 2: Get user document from Firestore
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));

      if (!userDoc.exists()) {
        throw new Error('User profile not found. Please contact support.');
      }

      return userDoc.data() as User;
    } catch (error: unknown) {
      const firebaseError = error as FirebaseError;

      // More specific error handling
      if (firebaseError?.code === 'auth/user-not-found') {
        throw new Error('No account found with this email. Please check your email or create a new account.');
      } else if (firebaseError?.code === 'auth/wrong-password') {
        throw new Error('Incorrect password. Please try again.');
      } else if (firebaseError?.code === 'auth/invalid-credential') {
        throw new Error('Invalid email or password. Please check your credentials and try again.');
      } else if (firebaseError?.code === 'auth/too-many-requests') {
        throw new Error('Too many failed attempts. Please wait a few minutes before trying again.');
      } else if (firebaseError?.code?.startsWith('auth/')) {
        throw new Error(`Authentication error: ${firebaseError.message}`);
      } else if (firebaseError?.code?.startsWith('firestore/')) {
        throw new Error(`Database error: ${firebaseError.message}`);
      } else {
        throw new Error(firebaseError?.message || 'Sign in failed. Please try again.');
      }
    }
  }

  static async signOut(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error: unknown) {
      throw new Error(error instanceof Error ? error.message : 'Sign out failed');
    }
  }

  static async getCurrentUser(): Promise<User | null> {
    const firebaseUser = auth.currentUser;

    if (!firebaseUser) {
      return null;
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

      if (!userDoc.exists()) {
        return null;
      }

      return userDoc.data() as User;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  static onAuthStateChanged(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

          if (userDoc.exists()) {
            callback(userDoc.data() as User);
          } else {
            callback(null);
          }
        } catch (error) {
          console.error('Error in auth state change:', error);
          callback(null);
        }
      } else {
        callback(null);
      }
    });
  }

  static async updateUserProfile(userId: string, updates: Partial<User>): Promise<void> {
    try {
      await setDoc(doc(db, 'users', userId), updates, { merge: true });
    } catch (error: unknown) {
      throw new Error(error instanceof Error ? error.message : 'Profile update failed');
    }
  }
}