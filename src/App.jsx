// src/App.js - Protected version
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { auth, db } from './services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import Login from './components/Auth/Login';
import Signup from './components/Auth/Signup';
import PartnerSignup from './components/Auth/PartnerSignup';
import Dashboard from './components/Dashboard';
import KanbanBoard from './components/Kanbanboard';
import Notes from './components/Notes';
import Targets from './components/Targets';
import AdminPanel from './components/AdminPanel';
import PartnerDashboard from './components/PartnerDashboard';
import { useConsoleProtection } from './utils/consoleProtection';
import './App.css';

function App() {
  // Add console protection hook
  useConsoleProtection();

  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [assignedProjectId, setAssignedProjectId] = useState(null);

  // Optimize user data fetching with useCallback
  const fetchUserData = useCallback(async (user) => {
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userDocRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Remove console.log in production
        if (process.env.NODE_ENV === 'development') {
          console.log('User data loaded:', data.role);
        }
        
        setUserRole(data.role || 'client');
        
        if (data.role === 'partner' && data.assignedProjectId) {
          setAssignedProjectId(data.assignedProjectId);
        } else {
          setAssignedProjectId(null);
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('No user document found, defaulting to client');
        }
        setUserRole('client');
        setAssignedProjectId(null);
      }
    } catch (error) {
      // Only log errors in development
      if (process.env.NODE_ENV === 'development') {
        console.error("Error fetching user data:", error);
      }
      setUserRole('client');
      setAssignedProjectId(null);
    }
  }, []);

  // Memoized components to prevent unnecessary re-renders
  const ProtectedRoute = useCallback(({ children, allowedRoles = [] }) => {
    if (!currentUser) {
      return <Navigate to="/login" replace />;
    }
    
    if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
      return <Navigate to="/dashboard" replace />;
    }
    
    return children;
  }, [currentUser, userRole]);

  const PartnerRedirect = useCallback(() => {
    if (userRole === 'partner') {
      if (assignedProjectId) {
        return <Navigate to={`/partner/project/${assignedProjectId}`} replace />;
      } else {
        return (
          <div className="dashboard-container" style={{ padding: '20px', textAlign: 'center' }}>
            <h2>Partner Dashboard</h2>
            <p>You are registered as a Partner, but no project has been assigned yet. Please contact your Admin.</p>
          </div>
        );
      }
    }
    return <Navigate to="/dashboard" replace />;
  }, [userRole, assignedProjectId]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Auth state changed:', user?.email || 'No user');
      }
      
      try {
        if (user) {
          setCurrentUser(user);
          await fetchUserData(user);
        } else {
          // User is logged out - reset all states
          setCurrentUser(null);
          setUserRole(null);
          setAssignedProjectId(null);
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error in auth state change:', error);
        }
      } finally {
        // Always set loading to false after auth check
        setLoading(false);
      }
    });
    
    return () => unsubscribe();
  }, [fetchUserData]);

  // Show loading spinner only during initial auth check
  if (loading) {
    return (
      <div className="loading" style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <Router>
      <div className="app">
        <div className="app-content">
          <Routes>
            {/* Public Routes */}
            <Route 
              path="/login" 
              element={
                currentUser ? (
                  <Navigate to={userRole === 'partner' ? '/partner' : '/dashboard'} replace />
                ) : (
                  <Login />
                )
              } 
            />
            <Route 
              path="/signup" 
              element={
                currentUser ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <Signup />
                )
              } 
            />
            <Route 
              path="/partner-signup" 
              element={
                currentUser ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <PartnerSignup />
                )
              } 
            />

            {/* Dashboard Route */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  {userRole === 'partner' ? (
                    <PartnerRedirect />
                  ) : (
                    <Dashboard user={currentUser} role={userRole} />
                  )}
                </ProtectedRoute>
              }
            />

            {/* Kanban Route */}
            <Route
              path="/kanban"
              element={
                <ProtectedRoute allowedRoles={['admin', 'client']}>
                  <KanbanBoard user={currentUser} role={userRole} />
                </ProtectedRoute>
              }
            />

            {/* Notes Route */}
            <Route
              path="/notes"
              element={
                <ProtectedRoute allowedRoles={['admin', 'client']}>
                  <Notes user={currentUser} />
                </ProtectedRoute>
              }
            />

            {/* Targets Route */}
            <Route
              path="/targets"
              element={
                <ProtectedRoute allowedRoles={['admin', 'client']}>
                  <Targets user={currentUser} />
                </ProtectedRoute>
              }
            />

            {/* Admin Panel */}
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminPanel />
                </ProtectedRoute>
              }
            />

            {/* Partner Dashboard */}
            <Route
              path="/partner/project/:projectId"
              element={
                <ProtectedRoute allowedRoles={['partner']}>
                  <PartnerDashboard user={currentUser} role={userRole} />
                </ProtectedRoute>
              }
            />

            {/* Partner Default Route */}
            <Route
              path="/partner"
              element={
                <ProtectedRoute allowedRoles={['partner']}>
                  <PartnerRedirect />
                </ProtectedRoute>
              }
            />

            {/* Root Route */}
            <Route
              path="/"
              element={
                <Navigate
                  to={
                    currentUser
                      ? userRole === 'partner'
                        ? '/partner'
                        : '/dashboard'
                      : '/login'
                  }
                  replace
                />
              }
            />

            {/* Unauthorized access route */}
            <Route
              path="/unauthorized"
              element={
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  height: '100vh',
                  background: '#f44336',
                  color: 'white',
                  fontSize: '20px',
                  textAlign: 'center'
                }}>
                  <h1>⚠️ Unauthorized Access Detected</h1>
                  <p>This activity has been logged.</p>
                  <button 
                    onClick={() => window.location.href = '/'}
                    style={{
                      padding: '10px 20px',
                      fontSize: '16px',
                      background: 'white',
                      color: '#f44336',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      marginTop: '20px'
                    }}
                  >
                    Return to Home
                  </button>
                </div>
              }
            />

            {/* Catch all route */}
            <Route
              path="*"
              element={
                <Navigate
                  to={
                    currentUser
                      ? userRole === 'partner'
                        ? '/partner'
                        : '/dashboard'
                      : '/login'
                  }
                  replace
                />
              }
            />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;