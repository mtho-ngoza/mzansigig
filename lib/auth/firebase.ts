import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import { auth, db } from '../firebase';
import { User, LoginCredentials, RegisterData } from '@/types/auth';
import { encryptData, hashData } from '@/lib/utils/encryption';

export class FirebaseAuthService {
  static async signUp(data: RegisterData): Promise<User> {
    try {
      // Step 1: Check for duplicate phone number
      const phoneQuery = query(
        collection(db, 'users'),
        where('phone', '==', data.phone)
      );
      const phoneSnapshot = await getDocs(phoneQuery);

      if (!phoneSnapshot.empty) {
        throw new Error('This phone number is already registered. Please use a different number or sign in.');
      }

      // Step 2: Check for duplicate ID number (using hash)
      if (data.idNumber) {
        const cleanId = data.idNumber.replace(/\s/g, '');
        const idHash = hashData(cleanId);

        const idQuery = query(
          collection(db, 'users'),
          where('idNumberHash', '==', idHash)
        );
        const idSnapshot = await getDocs(idQuery);

        if (!idSnapshot.empty) {
          throw new Error('This ID number is already registered. Each ID number can only be used once.');
        }
      }

      // Step 3: Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );

      const firebaseUser = userCredential.user;

      // Step 4: Update Firebase Auth profile
      await updateProfile(firebaseUser, {
        displayName: `${data.firstName} ${data.lastName}`
      });

      // Step 5: Create user document in Firestore
      const currentDate = new Date();
      const CONSENT_VERSION = '1.0'; // Version tracking for legal compliance

      const user: Partial<User> = {
        id: firebaseUser.uid,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        location: data.location,
        userType: data.userType,
        createdAt: currentDate,
        // Store legal consents with timestamp and version for POPIA audit trail
        consents: {
          terms: {
            accepted: data.acceptTerms,
            acceptedAt: currentDate,
            version: CONSENT_VERSION
          },
          privacy: {
            accepted: data.acceptPrivacy,
            acceptedAt: currentDate,
            version: CONSENT_VERSION
          },
          popia: {
            accepted: data.acceptPopia,
            acceptedAt: currentDate,
            version: CONSENT_VERSION
          }
        }
      };

      // Only add optional fields if they have values (Firestore doesn't allow undefined)
      if (data.workSector) {
        user.workSector = data.workSector;
      }

      // Encrypt ID number and store hash for duplicate detection (POPIA compliance)
      if (data.idNumber) {
        const cleanId = data.idNumber.replace(/\s/g, ''); // Remove spaces
        user.idNumber = encryptData(cleanId); // Store encrypted
        user.idNumberHash = hashData(cleanId); // Store hash for duplicate checks
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

  static async signInWithGoogle(): Promise<{ user: User; needsProfileCompletion: boolean }> {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      const userCredential = await signInWithPopup(auth, provider);
      const firebaseUser = userCredential.user;

      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

      if (userDoc.exists()) {
        const existingUser = userDoc.data() as User;
        const needsCompletion = !existingUser.phone || !existingUser.location || !existingUser.userType;
        return { user: existingUser, needsProfileCompletion: needsCompletion };
      }

      const nameParts = firebaseUser.displayName?.split(' ') || ['', ''];
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const newUser: Partial<User> = {
        id: firebaseUser.uid,
        email: firebaseUser.email || '',
        firstName,
        lastName,
        phone: '',
        location: '',
        userType: 'job-seeker',
        profilePhoto: firebaseUser.photoURL || undefined,
        createdAt: new Date(),
      };

      await setDoc(doc(db, 'users', firebaseUser.uid), newUser);

      return { user: newUser as User, needsProfileCompletion: true };
    } catch (error: unknown) {
      const firebaseError = error as FirebaseError;

      if (firebaseError?.code === 'auth/popup-closed-by-user') {
        throw new Error('Sign-in cancelled. Please try again.');
      } else if (firebaseError?.code === 'auth/popup-blocked') {
        throw new Error('Pop-up blocked. Please allow pop-ups for this site.');
      } else if (firebaseError?.code === 'auth/account-exists-with-different-credential') {
        throw new Error('An account already exists with this email. Please sign in using your original method.');
      } else if (firebaseError?.code?.startsWith('auth/')) {
        throw new Error(`Authentication error: ${firebaseError.message}`);
      } else {
        throw new Error(firebaseError?.message || 'Google sign-in failed. Please try again.');
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