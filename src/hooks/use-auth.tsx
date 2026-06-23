
'use client';

import {
  useState,
  useEffect,
  createContext,
  useContext,
  ReactNode,
} from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  UserCredential,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { createUserProfile, getUserProfile } from '@/lib/data';
import type { UserProfile } from '@/types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<UserCredential>;
  signUp: (email: string, pass: string) => Promise<UserCredential>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Intentar crear/asegurar perfil
        try {
          await createUserProfile(currentUser);
        } catch (e) {
          console.error("Error inicializando perfil:", e);
        }
        
        // Escuchar cambios en el perfil
        const unsubProfile = getUserProfile(
          currentUser.uid, 
          (profile) => {
            setUserProfile(profile);
            setLoading(false);
          },
          (error) => {
            console.error("Error cargando perfil:", error);
            // Si hay un error de permisos, dejamos de cargar para que el overlay se muestre
            setLoading(false);
          }
        );
        return () => unsubProfile();
      } else {
        setUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, pass: string) => {
    setLoading(true);
    try {
        const res = await signInWithEmailAndPassword(auth, email, pass);
        return res;
    } catch (err) {
        setLoading(false);
        throw err;
    }
  };

  const signUp = async (email: string, pass: string) => {
    setLoading(true);
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        return userCredential;
    } catch (error) {
        setLoading(false);
        throw error;
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const value = { user, userProfile, loading, signIn, signOut, signUp };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};
