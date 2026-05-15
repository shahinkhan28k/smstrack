import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, loginWithGoogle, logout } from './lib/firebase';
import { userService } from './lib/services';
import { UserProfile } from './types';
import Landing from './components/Landing';
import Dashboard from './components/Dashboard';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        let userProfile = await userService.getProfile(firebaseUser.uid);
        if (!userProfile) {
          // Initialize profile
          userProfile = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || 'User',
            email: firebaseUser.email || '',
            role: 'user',
            plan: 'free',
            status: 'active',
            createdAt: new Date().toISOString()
          };
          await userService.createProfile(userProfile);
        }
        setProfile(userProfile);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
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
