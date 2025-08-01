// src/components/Auth/PartnerSignup.js
import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db } from '../../services/firebase';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';

const PartnerSignup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [projectIdentifier, setProjectIdentifier] = useState(''); // Project Name or Code
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Email domain validation for partners
  const isAllowedPartnerEmail = (email) => {
    // Clean the email first
    const cleanEmail = email.trim().toLowerCase();
    const domain = cleanEmail.split('@')[1];
    
    console.log('Original email:', email);
    console.log('Clean email:', cleanEmail);
    console.log('Extracted domain:', domain);
    console.log('Expected domain: web24partner.com');
    console.log('Is valid domain?', domain === 'web24partner.com');
    
    return domain === 'web24partner.com';
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Basic validation
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    if (name.trim().length === 0) {
      setError('Please enter your full name');
      setLoading(false);
      return;
    }

    if (projectIdentifier.trim().length === 0) {
      setError('Please enter the Project Name or Code provided by the Admin');
      setLoading(false);
      return;
    }

    // Partner email domain validation
    console.log('About to validate email:', email);
    if (!isAllowedPartnerEmail(email)) {
      setError('Access denied. Please use a @web24partner.com email address.');
      setLoading(false);
      return;
    }
    console.log('Email validation passed!');

    try {
      // --- Create User Account FIRST ---
      console.log('Creating user account...');
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      console.log('User created successfully, now validating project...');

      // Wait for auth state to be properly set
      await new Promise(resolve => setTimeout(resolve, 1000));

      // --- Validate Project (now as authenticated user) ---
      let projectId = null;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          console.log(`Attempting to query projects (attempt ${retryCount + 1})...`);
          const q = query(collection(db, 'projects'), where('name', '==', projectIdentifier.trim()));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            projectId = querySnapshot.docs[0].id;
            console.log('Project found:', projectId);
            break;
          } else {
            console.log('No project found with name:', projectIdentifier.trim());
            // Delete the created user account since project doesn't exist
            await user.delete();
            throw new Error('Project not found. Please check the Project Name/Code with the Admin.');
          }
        } catch (queryError) {
          console.error(`Project query attempt ${retryCount + 1} failed:`, queryError);
          
          if (queryError.code === 'permission-denied') {
            console.log('Permission denied - user may not be fully authenticated yet');
            retryCount++;
            if (retryCount >= maxRetries) {
              // Delete the created user account
              try {
                await user.delete();
              } catch (deleteError) {
                console.error('Failed to delete user after permission error:', deleteError);
              }
              throw new Error('Unable to validate project. Please contact the Admin or try again later.');
            }
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            // Other errors, don't retry
            try {
              await user.delete();
            } catch (deleteError) {
              console.error('Failed to delete user after query error:', deleteError);
            }
            throw queryError;
          }
        }
      }

      if (!projectId) {
        await user.delete();
        throw new Error('Failed to validate project after multiple attempts.');
      }

      // --- Create User Document with Role and Project Link ---
      console.log('Creating user document...');
      
      try {
        await setDoc(doc(db, 'users', user.uid), {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role: 'partner',
          assignedProjectId: projectId,
          createdAt: new Date().toISOString(),
          uid: user.uid
        });
        
        console.log("Partner account created successfully for project:", projectId);
      } catch (docError) {
        console.error('Failed to create user document:', docError);
        // Delete the created user account
        try {
          await user.delete();
        } catch (deleteError) {
          console.error('Failed to delete user after doc creation error:', deleteError);
        }
        throw new Error('Failed to complete registration. Please try again or contact support.');
      }

      // Sign out the user immediately after creating the account
      await signOut(auth);
      
      // Show success message
      setError('');
      alert('Partner account created successfully! Please login to continue.');
      
      // Navigate to login
      setTimeout(() => {
        navigate('/login');
      }, 500);

    } catch (err) {
      console.error('Partner Signup error:', err);
      let errorMessage = 'Failed to create Partner account. Please try again.';
      
      // More specific error messages
      if (err.code) {
        switch (err.code) {
          case 'auth/email-already-in-use':
            errorMessage = 'This email is already registered.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Invalid email address.';
            break;
          case 'auth/operation-not-allowed':
            errorMessage = 'Email/password authentication is not enabled.';
            break;
          case 'auth/weak-password':
            errorMessage = 'Password is too weak.';
            break;
          case 'permission-denied':
            errorMessage = 'Access denied. Please use a @web24partner.com email address.';
            break;
          default:
            errorMessage = `Authentication error: ${err.message}`;
        }
      } else {
        // Use the message from our custom error
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (error) setError(''); // Clear error when user types
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (error) setError(''); // Clear error when user types
  };

  const handleNameChange = (e) => {
    setName(e.target.value);
    if (error) setError(''); // Clear error when user types
  };

  const handleProjectChange = (e) => {
    setProjectIdentifier(e.target.value);
    if (error) setError(''); // Clear error when user types
  };

  return (
    <div className="auth-container">
      <div className="auth-form">
        <h2>Partner Sign Up</h2>
        <p>Enter the Project Name provided by the Admin.</p>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSignup} noValidate>
          <div className="form-group">
            <label htmlFor="partner-name">Full Name:</label>
            <input
              type="text"
              id="partner-name"
              value={name}
              onChange={handleNameChange}
              required
              disabled={loading}
              placeholder=""
              autoComplete="name"
            />
          </div>
          <div className="form-group">
            <label htmlFor="partner-email">Email:</label>
            <input
              type="email"
              id="partner-email"
              value={email}
              onChange={handleEmailChange}
              placeholder=""
              required
              disabled={loading}
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label htmlFor="partner-password">Password:</label>
            <input
              type="password"
              id="partner-password"
              value={password}
              onChange={handlePasswordChange}
              required
              minLength="6"
              disabled={loading}
              placeholder=""
              autoComplete="new-password"
            />
          </div>
          <div className="form-group">
            <label htmlFor="project-identifier">Project Name/Code (from Admin):</label>
            <input
              type="text"
              id="project-identifier"
              value={projectIdentifier}
              onChange={handleProjectChange}
              required
              disabled={loading}
              placeholder=""
            />
          </div>
          <button 
            type="submit" 
            className="btn-primary" 
            disabled={loading || !name.trim() || !email.trim() || !password.trim() || !projectIdentifier.trim()}
          >
            {loading ? 'Signing Up...' : 'Sign Up as Partner'}
          </button>
        </form>
        <p>Are you a Client or Admin? <Link to="/signup">General Sign Up</Link></p>
        <p>Already have an account? <Link to="/login">Login</Link></p>
        <div className="allowed-domains">
         
        </div>
      </div>
    </div>
  );
};

export default PartnerSignup;