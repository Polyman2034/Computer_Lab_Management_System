/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc, getDocFromServer } from 'firebase/firestore';
import { UserProfile } from './types';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { LabBooking } from './pages/LabBooking';
import { AdminPanel } from './pages/AdminPanel';
import { Login } from './pages/Login';
import { Profile } from './pages/Profile';
import { Guidelines } from './pages/Guidelines';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const existingProfile = userDoc.data() as UserProfile;
          // Ensure the specific user is always an admin
          if (firebaseUser.email === 'saiprasadkawdikar25@gmail.com' && existingProfile.role !== 'admin') {
            const updatedProfile = { ...existingProfile, role: 'admin' as const };
            await setDoc(doc(db, 'users', firebaseUser.uid), updatedProfile);
            setProfile(updatedProfile);
          } else {
            setProfile(existingProfile);
          }
        } else {
          // Create a default profile for new users
          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || 'User',
            role: firebaseUser.email === 'saiprasadkawdikar25@gmail.com' ? 'admin' : 'student',
            status: 'active',
            createdAt: new Date().toISOString(),
          };
          await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
          setProfile(newProfile);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          <Route
            path="/"
            element={user ? <Layout profile={profile}><Dashboard profile={profile} /></Layout> : <Navigate to="/login" />}
          />
          <Route
            path="/booking"
            element={user ? <Layout profile={profile}><LabBooking profile={profile} /></Layout> : <Navigate to="/login" />}
          />
          <Route
            path="/admin"
            element={user && profile?.role === 'admin' ? <Layout profile={profile}><AdminPanel /></Layout> : <Navigate to="/" />}
          />
          <Route
            path="/profile"
            element={user ? <Layout profile={profile}><Profile profile={profile} /></Layout> : <Navigate to="/login" />}
          />
          <Route
            path="/guidelines"
            element={user ? <Layout profile={profile}><Guidelines /></Layout> : <Navigate to="/login" />}
          />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

