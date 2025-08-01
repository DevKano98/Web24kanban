// src/components/Auth/Signup.js
import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../services/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Email domain validation
  const isAllowedEmail = (email) => {
    const allowedDomains = ['web24.agency', 'web24partner.com'];
    const domain = email.split('@')[1]?.toLowerCase();
    
    // Allow hardcoded admin email
    if (email === 'shreyasnikam177@gmail.com') {
      return true;
    }
    
    return allowedDomains.includes(domain);
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    if (!email.includes('@') || !email.includes('.')) {
      setError('Please enter a valid email address');
      return;
    }
    
    if (name.trim().length === 0) {
      setError('Please enter your full name');
      return;
    }

    // Email domain validation
    if (!isAllowedEmail(email)) {
      setError('');
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Create user document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        name,
        email,
        role: 'client',
        createdAt: new Date()
      });
      
      navigate('/dashboard');
    } catch (err) {
      console.error('Signup error:', err);
      // More specific error messages
      switch (err.code) {
        case 'auth/email-already-in-use':
          setError('This email is already registered. Please login instead.');
          break;
        case 'auth/invalid-email':
          setError('Invalid email address. Please check and try again.');
          break;
        case 'auth/operation-not-allowed':
          setError('Email/password authentication is not enabled.');
          break;
        case 'auth/weak-password':
          setError('Password is too weak. Please use at least 6 characters.');
          break;
        case 'permission-denied':
          setError('Access denied. Please use a company or partner email address.');
          break;
        default:
          setError('Failed to create account. Please try again. Error: ' + err.message);
      }
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form">
        <h2>Web24 Sign Up</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSignup}>
          <div className="form-group">
            <label htmlFor="name">Full Name:</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email:</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder=""
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password:</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength="6"
            />
          </div>
          <button type="submit" className="btn-primary">Sign Up</button>
        </form>
        <p>Already have an account? <Link to="/login">Login</Link></p>
        <p>
          Are you a Partner? <Link to="/partner-signup">Partner Sign Up</Link>
        </p>
        <div className="allowed-domains">
          
        </div>
      </div>
    </div>
  );
};

export default Signup;