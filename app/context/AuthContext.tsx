import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { FIREBASE_AUTH } from '../../FirebaseConfig';
import { subscribeUserProfile } from '../services/firestore';
import { UserProfile, UserRole } from '../services/model';

export type { UserRole };

export interface User {
  uid: string;
  email: string;
  /** Issu du custom claim 'admin' (posé par functions/scripts/set-admin). */
  role: UserRole;
  displayName: string | null;
  photoURL: string | null;
  /** Solde fiat, mis à jour en temps réel (validation admin, ordres). */
  porteFeuille: number;
  /** Document Firestore complet, null si le profil n'existe pas encore. */
  profile: UserProfile | null;
}

interface AuthContextType {
  user: User | null;
  /** true tant que Firebase n'a pas restauré (ou infirmé) la session persistée. */
  initializing: boolean;
  /** Force le rafraîchissement du token (ex. après attribution du rôle admin). */
  refreshClaims: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const readAdminClaim = async (forceRefresh: boolean): Promise<boolean> => {
  const current = FIREBASE_AUTH.currentUser;
  if (!current) {
    return false;
  }
  try {
    const token = await current.getIdTokenResult(forceRefresh);
    return token.claims.admin === true;
  } catch (error) {
    console.error('Lecture des claims impossible:', error);
    return false;
  }
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const unsubscribeProfile = useRef<() => void>();

  useEffect(() => {
    // Source de vérité unique : l'état Firebase Auth (session persistée,
    // connexion, déconnexion, révocation de token).
    const unsubscribeAuth = onAuthStateChanged(FIREBASE_AUTH, async (firebaseUser) => {
      unsubscribeProfile.current?.();
      unsubscribeProfile.current = undefined;

      // Un e-mail non vérifié ne donne pas accès à l'application (Login
      // explique la situation et propose de renvoyer le lien).
      if (!firebaseUser || !firebaseUser.emailVerified) {
        setUser(null);
        setInitializing(false);
        return;
      }

      const admin = await readAdminClaim(true);
      setIsAdmin(admin);
      const uid = firebaseUser.uid;
      const email = firebaseUser.email ?? '';

      unsubscribeProfile.current = subscribeUserProfile(
        uid,
        (profile) => {
          setUser({
            uid,
            email,
            role: admin ? 'admin' : 'user',
            displayName: profile?.nom || email,
            photoURL: profile?.photoURL ?? null,
            porteFeuille: profile?.porteFeuille ?? 0,
            profile,
          });
          setInitializing(false);
        },
        (error) => {
          console.error('Abonnement au profil impossible:', error);
          setUser({ uid, email, role: admin ? 'admin' : 'user', displayName: email, photoURL: null, porteFeuille: 0, profile: null });
          setInitializing(false);
        }
      );
    });
    return () => {
      unsubscribeAuth();
      unsubscribeProfile.current?.();
    };
  }, []);

  // Le rôle peut changer après coup (set-admin) : on le propage au profil courant.
  useEffect(() => {
    setUser((current) => (current ? { ...current, role: isAdmin ? 'admin' : 'user' } : current));
  }, [isAdmin]);

  const refreshClaims = useCallback(async () => {
    setIsAdmin(await readAdminClaim(true));
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(FIREBASE_AUTH);
    // onAuthStateChanged remet user à null ; la navigation conditionnelle
    // d'App.tsx bascule alors sur les écrans non authentifiés.
  }, []);

  return (
    <AuthContext.Provider value={{ user, initializing, refreshClaims, signOut }}>
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
