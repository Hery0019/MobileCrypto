import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { FIREBASE_AUTH, FIREBASE_DB } from '../../FirebaseConfig';

export type UserRole = 'user' | 'admin';

export interface User {
  uid: string;
  email: string;
  role: UserRole;
  displayName: string | null;
  photoURL: string | null;
}

interface AuthContextType {
  /** Profil de l'utilisateur connecté, null si déconnecté. */
  user: User | null;
  /** true tant que Firebase n'a pas restauré (ou infirmé) la session persistée. */
  initializing: boolean;
  setUser: (user: User | null) => void;
  /** Recharge le profil Firestore de l'utilisateur courant. */
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Construit le profil applicatif à partir du compte Firebase et de son document
 * Firestore. Un document manquant donne un profil minimal avec le rôle 'user'.
 */
const loadProfile = async (firebaseUser: FirebaseUser): Promise<User> => {
  const email = firebaseUser.email ?? '';
  const snapshot = await getDoc(doc(FIREBASE_DB, 'utilisateurs', firebaseUser.uid));
  const data = snapshot.exists() ? snapshot.data() : undefined;
  return {
    uid: firebaseUser.uid,
    email,
    role: data?.role === 'admin' ? 'admin' : 'user',
    displayName: data?.nom || email,
    photoURL: data?.photoURL || data?.photo || null,
  };
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // Source de vérité unique : l'état Firebase Auth (session persistée,
    // connexion, déconnexion, révocation de token).
    const unsubscribe = onAuthStateChanged(FIREBASE_AUTH, async (firebaseUser) => {
      try {
        // Un email non vérifié ne donne pas accès à l'application : l'email sert
        // d'identité affichée à l'admin, il doit appartenir à l'utilisateur.
        // Login se charge d'expliquer la situation et de renvoyer le lien.
        const usable = firebaseUser && firebaseUser.emailVerified;
        setUser(usable ? await loadProfile(firebaseUser) : null);
      } catch (error) {
        console.error('Impossible de charger le profil utilisateur:', error);
        setUser(null);
      } finally {
        setInitializing(false);
      }
    });
    return unsubscribe;
  }, []);

  const refreshProfile = useCallback(async () => {
    const current = FIREBASE_AUTH.currentUser;
    setUser(current && current.emailVerified ? await loadProfile(current) : null);
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(FIREBASE_AUTH);
    // onAuthStateChanged remet user à null ; la navigation conditionnelle
    // d'App.tsx bascule alors sur les écrans non authentifiés.
  }, []);

  return (
    <AuthContext.Provider value={{ user, initializing, setUser, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
