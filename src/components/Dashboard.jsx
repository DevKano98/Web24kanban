// src/components/Dashboard/Dashboard.js
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';

const Dashboard = ({ user, role }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (err) {
      console.error('Failed to log out', err);
    }
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Web24 Dashboard</h1>
        <div className="user-info">
          <span>Welcome, {user.email}</span>
          <span className="role-badge">{role}</span>
          <button onClick={handleLogout} className="btn-secondary">Logout</button>
        </div>
      </header>

      <nav className="dashboard-nav">
        <ul>
          <li><Link to="/kanban">Kanban Board</Link></li>
          <li><Link to="/notes">Notes</Link></li>
          <li><Link to="/targets">Targets</Link></li>
          {role === 'admin' && <li><Link to="/admin">Admin Panel</Link></li>}
        </ul>
      </nav>

      <main className="dashboard-content">
        <div className="welcome-section">
          <h2>Welcome to Web24 Task Management</h2>
          <p>Your productivity hub for managing tasks, notes, and goals.</p>
        </div>

        <div className="quick-links">
          <div className="card">
            <h3>Kanban Board</h3>
            <p>Manage your tasks with our intuitive Kanban board.</p>
            <Link to="/kanban" className="btn-primary">View Board</Link>
          </div>
          
          <div className="card">
            <h3>Personal Notes</h3>
            <p>Keep track of important information and ideas.</p>
            <Link to="/notes" className="btn-primary">View Notes</Link>
          </div>
          
          <div className="card">
            <h3>Target Tracker</h3>
            <p>Set and track your personal goals.</p>
            <Link to="/targets" className="btn-primary">View Targets</Link>
          </div>
          
          {role === 'admin' && (
            <div className="card">
              <h3>Admin Panel</h3>
              <p>Manage clients and their tasks.</p>
              <Link to="/admin" className="btn-primary">Manage Clients</Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;