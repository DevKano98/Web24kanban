// src/components/Admin/AdminPanel.js
import React, { useState, useEffect } from 'react';
import { db } from "../services/firebase.js";
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom'; // For navigation

const AdminPanel = () => {
  const [clients, setClients] = useState([]);
  const [partners, setPartners] = useState([]); // New state for partners
  const [projects, setProjects] = useState([]); // New state for projects
  const [reviews, setReviews] = useState([]); // New state for reviews
  const [newProjectName, setNewProjectName] = useState(''); // For project creation
  const [editingClientId, setEditingClientId] = useState(null);
  const [editingClientName, setEditingClientName] = useState('');
  const navigate = useNavigate();

  // Fetch clients
  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'client'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const clientsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setClients(clientsData);
    });

    return unsubscribe;
  }, []);

  // Fetch partners
  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'partner'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const partnersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPartners(partnersData);
    });

    return unsubscribe;
  }, []);

  // Fetch projects
  useEffect(() => {
    const q = query(collection(db, 'projects'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProjects(projectsData);
    });

    return unsubscribe;
  }, []);

  // Fetch reviews
  useEffect(() => {
    const q = query(collection(db, 'reviews'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reviewsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setReviews(reviewsData);
    });

    return unsubscribe;
  }, []);

  const handleEditClient = (client) => {
    setEditingClientId(client.id);
    setEditingClientName(client.name || '');
  };

  const handleSaveEdit = async () => {
    if (!editingClientId || !editingClientName.trim()) return;

    try {
      await updateDoc(doc(db, 'users', editingClientId), {
        name: editingClientName.trim()
      });
      setEditingClientId(null);
      setEditingClientName('');
    } catch (err) {
      console.error('Error updating client:', err);
      alert('Failed to update client name. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setEditingClientId(null);
    setEditingClientName('');
  };

  const handleDeleteClient = async (clientId) => {
    if (!window.confirm('Are you sure you want to remove this client? This will delete their account and all associated data.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'users', clientId));
      // Note: In a full implementation, you might also want to delete associated tasks/notes/targets
    } catch (err) {
      console.error('Error deleting client:', err);
      alert('Failed to remove client. Please try again.');
    }
  };

  // New function to handle partner deletion
  const handleDeletePartner = async (partnerId) => {
    if (!window.confirm('Are you sure you want to remove this partner? This will delete their account.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'users', partnerId));
    } catch (err) {
      console.error('Error deleting partner:', err);
      alert('Failed to remove partner. Please try again.');
    }
  };

  // New function to create a project
  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) {
      alert('Project name is required.');
      return;
    }

    try {
      await addDoc(collection(db, 'projects'), {
        name: newProjectName.trim(),
        createdAt: new Date().toISOString()
      });
      setNewProjectName('');
      alert('Project created successfully!');
    } catch (err) {
      console.error('Error creating project:', err);
      alert('Failed to create project. Please try again.');
    }
  };

  // New function to delete a project
  const handleDeleteProject = async (projectId) => {
    if (!window.confirm('Are you sure you want to delete this project? This will also delete all associated tasks and reviews.')) {
      return;
    }

    try {
      // In a production app, you'd also delete associated tasks and reviews
      await deleteDoc(doc(db, 'projects', projectId));
      alert('Project deleted successfully!');
    } catch (err) {
      console.error('Error deleting project:', err);
      alert('Failed to delete project. Please try again.');
    }
  };

  // New function to delete a review
  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'reviews', reviewId));
      alert('Review deleted successfully!');
    } catch (err) {
      console.error('Error deleting review:', err);
      alert('Failed to delete review. Please try again.');
    }
  };

  // Helper to get project name for reviews
  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project ? project.name : 'Unknown Project';
  };

  // Helper to get user name for reviews
  const getUserName = (userId) => {
    const user = [...clients, ...partners].find(u => u.id === userId);
    return user ? (user.name || user.email) : 'Unknown User';
  };

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>Admin Panel</h1>
      </header>

      {/* Manage Projects Section */}
      <div className="admin-section">
        <h2>Manage Projects</h2>
        <form onSubmit={handleCreateProject} style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
        <input
             type="text"
             placeholder="New project name"
             value={newProjectName}
             onChange={(e) => setNewProjectName(e.target.value)}
             required
             style={{
             width: '300px',
             padding: '10px',
             border: '2px solid #000000',
             background: '#ffffff',
             color: '#000000',
             fontFamily: 'Courier New, monospace',
             fontSize: '14px'
             }}
        />
          <button type="submit" className="btn-primary" style={{ marginLeft: '10px' }}>
            Create Project
          </button>
        </form>

        <div className="projects-list">
          {projects.length === 0 ? (
            <p>No projects found.</p>
          ) : (
            <table className="projects-table">
              <thead>
                <tr>
                  <th>Project Name</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map(project => (
                  <tr key={project.id}>
                    <td>{project.name}</td>
                    <td>{new Date(project.createdAt).toLocaleDateString()}</td>
                    <td>
                     
                      <button
                        onClick={() => handleDeleteProject(project.id)}
                        className="btn-danger"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Manage Users Section */}
      <div className="admin-section">
        <h2>Manage Users</h2>

        {/* Clients Subsection */}
        <h3 style={{ marginTop: '20px' }}>Clients</h3>
        <p style={{ marginBottom: '15px', fontSize: '14px', fontStyle: 'italic' }}>
          Note: Clients can sign up themselves. You can edit their names or remove them here.
        </p>
        <div className="clients-list">
          {clients.length === 0 ? (
            <p>No clients found.</p>
          ) : (
            <table className="clients-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.map(client => (
                  <tr key={client.id}>
                    <td>
                      {editingClientId === client.id ? (
                        <input
                          type="text"
                          value={editingClientName}
                          onChange={(e) => setEditingClientName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit();
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                          autoFocus
                        />
                      ) : (
                        client.name || 'N/A'
                      )}
                    </td>
                    <td>{client.email}</td>
                    <td>{client.role}</td>
                    <td>
                      {editingClientId === client.id ? (
                        <>
                          <button
                            onClick={handleSaveEdit}
                            className="btn-primary"
                            style={{ marginRight: '5px' }}
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="btn-secondary"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEditClient(client)}
                            className="btn-secondary"
                            style={{ marginRight: '5px' }}
                          >
                            Edit Name
                          </button>
                          <button
                            onClick={() => handleDeleteClient(client.id)}
                            className="btn-danger"
                          >
                            Remove
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Partners Subsection */}
        <h3 style={{ marginTop: '30px' }}>Partners</h3>
        <div className="partners-list">
          {partners.length === 0 ? (
            <p>No partners found.</p>
          ) : (
            <table className="partners-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {partners.map(partner => (
                  <tr key={partner.id}>
                    <td>{partner.name || 'N/A'}</td>
                    <td>{partner.email}</td>
                    <td>{partner.role}</td>
                    <td>
                      <button
                        onClick={() => handleDeletePartner(partner.id)}
                        className="btn-danger"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Manage Reviews Section */}
      <div className="admin-section">
        <h2>Manage Reviews</h2>
        <div className="reviews-list">
          {reviews.length === 0 ? (
            <p>No reviews found.</p>
          ) : (
            <table className="reviews-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Author</th>
                  <th>Review Text</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map(review => (
                  <tr key={review.id}>
                    <td>{getProjectName(review.projectId)}</td>
                    <td>{getUserName(review.authorId)} ({review.authorRole})</td>
                    <td>{review.text}</td>
                    <td>{new Date(review.createdAt).toLocaleString()}</td>
                    <td>
                      <button
                        onClick={() => handleDeleteReview(review.id)}
                        className="btn-danger"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;