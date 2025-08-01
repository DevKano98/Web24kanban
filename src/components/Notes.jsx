// src/components/Notes/Notes.js
import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

const Notes = ({ user }) => {
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState({ title: '', content: '' });
  const [editingNote, setEditingNote] = useState(null);
  const [editContent, setEditContent] = useState('');

  // Fetch notes
  useEffect(() => {
    const q = query(collection(db, 'notes'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotes(notesData);
    });

    return unsubscribe;
  }, [user.uid]);

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.title.trim()) return;

    try {
      await addDoc(collection(db, 'notes'), {
        title: newNote.title,
        content: newNote.content,
        userId: user.uid,
        createdAt: new Date()
      });
      setNewNote({ title: '', content: '' });
    } catch (err) {
      console.error('Error adding note:', err);
    }
  };

  const handleUpdateNote = async () => {
    if (!editingNote || !editContent.trim()) return;

    try {
      await updateDoc(doc(db, 'notes', editingNote.id), {
        content: editContent
      });
      setEditingNote(null);
      setEditContent('');
    } catch (err) {
      console.error('Error updating note:', err);
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await deleteDoc(doc(db, 'notes', noteId));
    } catch (err) {
      console.error('Error deleting note:', err);
    }
  };

  return (
    <div className="notes-container">
      <header className="notes-header">
        <h1>Personal Notes</h1>
      </header>

      <div className="add-note-form">
        <h3>Add New Note</h3>
        <form onSubmit={handleAddNote}>
          <input
            type="text"
            placeholder="Note title"
            value={newNote.title}
            onChange={(e) => setNewNote({...newNote, title: e.target.value})}
            required
          />
          <textarea
            placeholder="Note content"
            value={newNote.content}
            onChange={(e) => setNewNote({...newNote, content: e.target.value})}
          />
          <button type="submit" className="btn-primary">Add Note</button>
        </form>
      </div>

      <div className="notes-list">
        {notes.map(note => (
          <div key={note.id} className="note-card">
            {editingNote && editingNote.id === note.id ? (
              <div className="edit-note">
                <h3>{note.title}</h3>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  defaultValue={note.content}
                />
                <div className="note-actions">
                  <button onClick={handleUpdateNote} className="btn-primary">Save</button>
                  <button onClick={() => setEditingNote(null)} className="btn-secondary">Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <h3>{note.title}</h3>
                <p>{note.content}</p>
                <div className="note-actions">
                  <button 
                    onClick={() => {
                      setEditingNote(note);
                      setEditContent(note.content);
                    }} 
                    className="btn-secondary"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDeleteNote(note.id)} 
                    className="btn-danger"
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Notes;