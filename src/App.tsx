import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db, auth, loginWithGoogle, logout } from './lib/firebase';
import { userService } from './lib/services';
import { UserProfile } from './types';
import Landing from './components/Landing';
import Dashboard from './components/Dashboard';
import CheckoutPage from './components/CheckoutPage';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCheckout, setIsCheckout] = useState(false);

  useEffect(() => {
    // Check for checkout route
    if (window.location.pathname.startsWith('/checkout/')) {
      setIsCheckout(true);
      setLoading(false);
      return;
    }

    let profileUnsub: (() => void) | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      // Cleanup previous profile listener if exists
      if (profileUnsub) {
        profileUnsub();
        profileUnsub = null;
      }

      if (firebaseUser) {
        // Initial setup/check
        const existingProfile = await userService.getProfile(firebaseUser.uid);
        const isAdminEmail = firebaseUser.email === 'shahinkhan28p@gmail.com';

        if (!existingProfile) {
          const newProfile: UserProfile = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || 'User',
            email: firebaseUser.email || '',
            role: isAdminEmail ? 'admin' : 'user',
            plan: 'free',
            planDeviceLimit: 1, // Default for free
            balance: 0,
            status: 'active',
            createdAt: new Date().toISOString()
          };
          await userService.createProfile(newProfile);
        } else if (isAdminEmail && existingProfile.role !== 'admin') {
          // Auto-upgrade existing profile to admin if email matches
          await updateDoc(doc(db, 'users', firebaseUser.uid), { role: 'admin' });
        }

        // Real-time listener
        profileUnsub = onSnapshot(doc(db, 'users', firebaseUser.uid), (doc) => {
          if (doc.exists()) {
            setProfile({ id: doc.id, ...doc.data() } as UserProfile);
          }
        });
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      authUnsubscribe();
      if (profileUnsub) profileUnsub();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (isCheckout) {
    return <CheckoutPage />;
  }

  if (!user) {
    return <Landing onLogin={loginWithGoogle} />;
  }

  return (
    <Dashboard 
      user={user} 
      profile={profile} 
      onLogout={logout} 
      onRefreshProfile={async () => {
        const fresh = await userService.getProfile(user.uid);
        setProfile(fresh);
      }}
    />
  );
}
