// src/components/Auth/Login.js
import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { useNavigate, Link } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (loading) return;
    
    setLoading(true);
    setError('');

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Wait for the auth state to be properly set
      if (userCredential.user) {
        // Small delay to ensure Firebase auth state is updated
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 100);
      }
    } catch (err) {
      console.error('Login error:', err);
      
      // More specific error messages
      let errorMessage = 'Failed to log in. Please try again.';
      
      switch (err.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email address.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password. Please try again.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Please enter a valid email address.';
          break;
        case 'auth/user-disabled':
          errorMessage = 'This account has been disabled.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please try again later.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your connection.';
          break;
        default:
          errorMessage = 'Login failed. Please check your credentials.';
      }
      
      setError(errorMessage);
      
      // Don't clear the form on error - keep user input
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    // Clear error when user starts typing
    if (error) setError('');
  };

  return (
    <div className="auth-container">
      <div className="auth-form">
        <h2>Web24 Login</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleLogin} noValidate>
          <div className="form-group">
            <label htmlFor="email">Email:</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={handleEmailChange}
              disabled={loading}
              required
              autoComplete="email"
              placeholder="Enter your email"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password:</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={handlePasswordChange}
              disabled={loading}
              required
              autoComplete="current-password"
              placeholder="Enter your password"
            />
          </div>
          <button 
            type="submit" 
            className="btn-primary" 
            disabled={loading || !email.trim() || !password.trim()}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p>Don't have an account? <Link to="/signup">Sign up</Link></p>
      </div>
    </div>
  );
};

export default Login;