// src/components/Targets/Targets.js
import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase.js';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

const Targets = ({ user }) => {
  const [targets, setTargets] = useState([]);
  const [newTarget, setNewTarget] = useState('');

  // Fetch targets
  useEffect(() => {
    const q = query(collection(db, 'targets'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const targetsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTargets(targetsData);
    });

    return unsubscribe;
  }, [user.uid]);

  const handleAddTarget = async (e) => {
    e.preventDefault();
    if (!newTarget.trim()) return;

    try {
      await addDoc(collection(db, 'targets'), {
        text: newTarget,
        completed: false,
        userId: user.uid,
        createdAt: new Date()
      });
      setNewTarget('');
    } catch (err) {
      console.error('Error adding target:', err);
    }
  };

  const toggleTarget = async (targetId, completed) => {
    try {
      await updateDoc(doc(db, 'targets', targetId), {
        completed: !completed
      });
    } catch (err) {
      console.error('Error updating target:', err);
    }
  };

  const handleDeleteTarget = async (targetId) => {
    try {
      await deleteDoc(doc(db, 'targets', targetId));
    } catch (err) {
      console.error('Error deleting target:', err);
    }
  };

  return (
    <div className="targets-container">
      <header className="targets-header">
        <h1>Target Tracker</h1>
      </header>

      <div className="add-target-form">
        <h3>Add New Target</h3>
        <form onSubmit={handleAddTarget}>
          <input
            type="text"
            placeholder="What do you want to achieve?"
            value={newTarget}
            onChange={(e) => setNewTarget(e.target.value)}
            required
          />
          <button type="submit" className="btn-primary">Add Target</button>
        </form>
      </div>

      <div className="targets-list">
        <h3>Your Targets</h3>
        {targets.length === 0 ? (
          <p>No targets yet. Add your first target!</p>
        ) : (
          <ul>
            {targets.map(target => (
              <li key={target.id} className={`target-item ${target.completed ? 'completed' : ''}`}>
                <input
                  type="checkbox"
                  checked={target.completed}
                  onChange={() => toggleTarget(target.id, target.completed)}
                />
                <span className="target-text">{target.text}</span>
                <button 
                  onClick={() => handleDeleteTarget(target.id)} 
                  className="btn-danger"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Targets;