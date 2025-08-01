// src/components/Kanban/KanbanBoard.js
import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase'; // Adjust path if needed
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const Kanbanboard = ({ user, role }) => {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState({ 
    title: '', 
    description: '', 
    status: 'todo',
    projectId: '', // New field
    deadline: '',  // New field (will be a date string)
    assignedTo: '' // Initialize as empty for admins
  });
  const [selectedProject, setSelectedProject] = useState(''); // For viewing tasks
  const [selectedClient, setSelectedClient] = useState(''); // For client filtering
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]); // New state for projects
  const [reviews, setReviews] = useState([]); // New state for reviews
  const [newReview, setNewReview] = useState(''); // For adding reviews
  const [clientAssignedProjects, setClientAssignedProjects] = useState([]); // Track projects where client has tasks
  const [partnerAssignedProjects, setPartnerAssignedProjects] = useState([]); // Track projects where partner has tasks
  const [allUsers, setAllUsers] = useState([]); // Store all users for name lookup

  // Columns for Kanban board
  const columns = [
    { id: 'todo', title: 'To Do' },
    { id: 'inprogress', title: 'In Progress' },
    { id: 'done', title: 'Done' }
  ];

  // Debug: Log user info when component mounts
  useEffect(() => {
    console.log("Current User Info:", { uid: user.uid, role });
  }, [user.uid, role]);

  // Fetch all users for name lookup (needed for all roles to display names correctly)
  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAllUsers(usersData);
    }, (error) => {
      console.error("Error fetching users:", error);
    });

    return unsubscribe;
  }, []);

  // For clients and partners: Track which projects they have tasks assigned to
  useEffect(() => {
    if (role === 'client' || role === 'partner') {
      const q = query(
        collection(db, 'tasks'), 
        where('assignedTo', '==', user.uid)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const userTasks = snapshot.docs.map(doc => doc.data());
        const assignedProjectIds = [...new Set(userTasks.map(task => task.projectId))];
        
        if (role === 'client') {
          setClientAssignedProjects(assignedProjectIds);
          console.log("Client assigned projects:", assignedProjectIds);
        } else if (role === 'partner') {
          setPartnerAssignedProjects(assignedProjectIds);
          console.log("Partner assigned projects:", assignedProjectIds);
        }
      }, (error) => {
        console.error(`Error fetching ${role}'s assigned projects:`, error);
      });

      return unsubscribe;
    }
  }, [user.uid, role]);

  // Fetch projects (for Admin to select when creating task, and for all to filter tasks)
  useEffect(() => {
    let q;
    if (role === 'client') {
      // For clients, show all projects but they'll be filtered by access later
      q = query(collection(db, 'projects'));
    } else {
      // For admin and partners, show all projects
      q = query(collection(db, 'projects'));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let projectsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // For clients, show projects where they have access (either tasks or should see reviews)
      if (role === 'client') {
        // Option 1: Show only projects where client has tasks
        projectsData = projectsData.filter(project => 
          clientAssignedProjects.includes(project.id)
        );
        
        // Option 2: If you want clients to see all projects for reviews, comment the above and uncomment below:
        // projectsData = projectsData; // Show all projects
      }

      setProjects(projectsData);
      
      // Set default project selection if needed
      if (projectsData.length > 0 && !selectedProject) {
        setSelectedProject(projectsData[0].id);
        // Update newTask projectId if admin
        if (role === 'admin') {
           setNewTask(prev => ({ ...prev, projectId: projectsData[0].id }));
        }
      } else if (projectsData.length === 0 && role === 'client') {
        // If client has no assigned projects, clear selection
        setSelectedProject('');
      }
    }, (error) => {
      console.error("Error fetching projects:", error);
    });

    return unsubscribe;
  }, [role, selectedProject, clientAssignedProjects]);

  // Fetch tasks based on selected project
  useEffect(() => {
    let q;
    if (role === 'admin') {
      console.log("Setting up query for ALL tasks (admin)");
      // Admin sees all tasks, optionally filter by selectedProject
      if (selectedProject) {
         q = query(collection(db, 'tasks'), where('projectId', '==', selectedProject));
      } else {
         q = query(collection(db, 'tasks'));
      }
    } else {
      console.log("Setting up query for tasks assigned to:", user.uid);
      // Client and Partner see only their tasks, optionally filter by project if needed
      if (selectedProject) {
        q = query(
          collection(db, 'tasks'), 
          where('assignedTo', '==', user.uid),
          where('projectId', '==', selectedProject)
        );
      } else {
        q = query(collection(db, 'tasks'), where('assignedTo', '==', user.uid));
      }
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log(`Fetched ${tasksData.length} tasks for ${role}:`, tasksData);
      // Sort tasks by status to ensure consistent order during updates
      const sortedTasks = [...tasksData].sort((a, b) => {
        const statusOrder = { 'todo': 1, 'inprogress': 2, 'done': 3 };
        return statusOrder[a.status] - statusOrder[b.status];
      });
      setTasks(sortedTasks);
    }, (error) => {
      console.error("Error fetching tasks:", error);
    });

    return () => unsubscribe();
  }, [user.uid, role, selectedProject]); // Add selectedProject dependency

  // For admin: fetch clients
  useEffect(() => {
    if (role === 'admin') {
      console.log("Fetching client list for admin");
      const q = query(collection(db, 'users'), where('role', '==', 'client'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const clientsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log(`Fetched ${clientsData.length} clients:`, clientsData);
        setClients(clientsData);
        
        // Set default client selection for admin (if none selected or invalid)
        if (clientsData.length > 0) {
          // If no client is selected or the selected client is no longer valid
          if (!selectedClient || !clientsData.some(c => c.id === selectedClient)) {
            // Select the first client by default
            setSelectedClient(clientsData[0].id);
            // Also update the newTask assignedTo field
            setNewTask(prev => ({ ...prev, assignedTo: clientsData[0].id }));
          }
        } else {
          // If no clients exist, reset selections
          setSelectedClient('');
          setNewTask(prev => ({ ...prev, assignedTo: '' }));
        }
      }, (error) => {
        console.error("Error fetching clients:", error);
      });
      
      return () => unsubscribe();
    } else {
      // For clients, reset client selection state
      setSelectedClient('');
    }
  }, [role, selectedClient]); // Add selectedClient to dependencies

  // Fetch reviews for the selected project (with access control)
  useEffect(() => {
    if (selectedProject) {
      // Check if user has access to this project's reviews
      const hasAccess = role === 'admin' || 
                       (role === 'partner' && partnerAssignedProjects.includes(selectedProject)) ||
                       (role === 'client' && clientAssignedProjects.includes(selectedProject));

      if (hasAccess) {
        const q = query(
          collection(db, 'reviews'), 
          where('projectId', '==', selectedProject),
          orderBy('createdAt', 'desc') // Show newest first
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const reviewsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setReviews(reviewsData);
        }, (error) => {
          console.error("Error fetching reviews:", error);
        });

        return () => unsubscribe();
      } else {
        // Clear reviews if user doesn't have access
        setReviews([]);
      }
    } else {
      setReviews([]);
    }
  }, [selectedProject, role, clientAssignedProjects, partnerAssignedProjects]);

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) {
      console.error('Task title is required');
      alert('Task title is required');
      return;
    }
    
    // For admins, ensure a client is selected for the new task
    if (role === 'admin') {
      if (!newTask.assignedTo) {
        console.error('Please select a client to assign the task to');
        alert('Please select a client to assign the task to');
        return;
      }
      if (!newTask.projectId) {
        alert('Please select a project for the task');
        return;
      }
      // Verify the selected client ID is valid
      if (!clients.some(client => client.id === newTask.assignedTo)) {
        console.error('Selected client is not valid');
        alert('Selected client is not valid. Please select a client from the list.');
        return;
      }
    }

    try {
      // Determine the assignee - admin selects via form, client assigns to themselves
      const assigneeId = role === 'admin' ? newTask.assignedTo : user.uid;
      const projectId = role === 'admin' ? newTask.projectId : selectedProject; // Use selected project for client view if needed
      
      const taskData = {
        title: newTask.title,
        description: newTask.description || "",
        status: newTask.status,
        assignedTo: assigneeId,
        projectId: projectId, // Add projectId
        deadline: newTask.deadline ? new Date(newTask.deadline).toISOString() : null, // Add deadline
        createdAt: new Date().toISOString()
      };

      console.log("Adding task with data:", taskData);
      await addDoc(collection(db, 'tasks'), taskData);
      
      // Reset form, but keep the selected client for admin task assignment dropdown
      setNewTask({ 
        title: '', 
        description: '', 
        status: 'todo',
        projectId: role === 'admin' ? newTask.projectId : '', 
        deadline: '',
        assignedTo: role === 'admin' ? newTask.assignedTo : '' // Keep selected client for next task
      });
    } catch (err) {
      console.error('Error adding task:', err);
      // More specific error messages
      if (err.code === 'permission-denied') {
        alert('Permission denied: You cannot add tasks.');
      } else {
        alert('Failed to add task. Please try again.');
      }
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review?')) {
      return;
    }
    
    try {
      await deleteDoc(doc(db, 'reviews', reviewId));
    } catch (err) {
      console.error('Error deleting review:', err);
      if (err.code === 'permission-denied') {
        alert('Permission denied: You cannot delete this review.');
      } else {
        alert('Failed to delete review. Please try again.');
      }
    }
  };

  const handleAddReview = async (e) => {
    e.preventDefault();
    if (!newReview.trim()) {
      alert('Review text is required');
      return;
    }
    if (!selectedProject) {
      alert('No project selected to add review to');
      return;
    }

    // Check if user has permission to add reviews to this project
    const hasAccess = role === 'partner' && partnerAssignedProjects.includes(selectedProject);

    if (!hasAccess) {
      alert('Partners can only add reviews to their assigned projects');
      return;
    }

    try {
      const reviewData = {
        projectId: selectedProject,
        text: newReview.trim(),
        authorId: user.uid,
        authorRole: role,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'reviews'), reviewData);
      setNewReview(''); // Clear review input
    } catch (err) {
      console.error('Error adding review:', err);
      alert('Failed to add review. Please try again.');
    }
  };

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
      return;
    }

    const task = tasks.find(t => t.id === draggableId);
    if (!task) {
      console.error('Task not found');
      alert('Could not update task. Please refresh the page and try again.');
      return;
    }

    const isOwner = task.assignedTo === user.uid;
    const isAdmin = role === 'admin';
    
    // Only admin and clients (task owners) can update tasks - partners cannot
    if (!isOwner && !isAdmin) {
      console.error('Permission denied: You cannot update this task');
      alert('You do not have permission to update this task.');
      return;
    }

    const validStatuses = ['todo', 'inprogress', 'done'];
    if (!validStatuses.includes(destination.droppableId)) {
      console.error('Error updating task: Invalid destination status', destination.droppableId);
      alert('Invalid task status.');
      return;
    }

    try {
      console.log(`Updating task ${draggableId} status from ${task.status} to ${destination.droppableId}`);
      console.log('Task details:', {
        taskId: draggableId,
        assignedTo: task.assignedTo,
        projectId: task.projectId,
        currentUserId: user.uid,
        userRole: role,
        isOwner,
        isAdmin
      });
      
      await updateDoc(doc(db, 'tasks', draggableId), {
        status: destination.droppableId
      });
      console.log(`Successfully updated task ${draggableId}`);
    } catch (err) {
      console.error('Error updating task:', err);
      console.error('Full error details:', {
        code: err.code,
        message: err.message,
        taskId: draggableId,
        newStatus: destination.droppableId,
        userRole: role,
        isOwner,
        isAdmin
      });
      
      if (err.code === 'permission-denied') {
        alert('Permission denied: You cannot update this task.');
      } else if (err.code === 'not-found') {
        alert('Task not found. It may have been deleted.');
      } else {
        alert('Failed to update task. Please try again.');
      }
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }
    
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
    } catch (err) {
      console.error('Error deleting task:', err);
      if (err.code === 'permission-denied') {
        alert('Permission denied: You cannot delete this task.');
      } else {
        alert('Failed to delete task. Please try again.');
      }
    }
  };

  const getTasksByStatus = (status) => {
    return tasks.filter(task => task.status === status);
  };

  const handleClientSelectChange = (e) => {
    const clientId = e.target.value;
    setSelectedClient(clientId);
    // Also update the newTask assignedTo field so the "Add Task" form reflects the selection
    setNewTask(prev => ({ ...prev, assignedTo: clientId }));
  };

  const handleProjectSelectChange = (e) => {
    const projectId = e.target.value;
    setSelectedProject(projectId);
    // Optionally update newTask projectId for admin
    if (role === 'admin') {
      setNewTask(prev => ({ ...prev, projectId: projectId }));
    }
  };

  const handleTaskAssigneeChange = (e) => {
    const clientId = e.target.value;
    setNewTask(prev => ({ ...prev, assignedTo: clientId }));
  };

  // Helper to get user name by ID for task cards (works for all roles)
  const getUserName = (userId) => {
    const user = allUsers.find(u => u.id === userId);
    return user ? (user.name || user.email) : 'Unknown User';
  };

  // Check if current user can see reviews for the selected project
  const canViewReviews = () => {
    if (role === 'admin') return true;
    if (role === 'partner') return partnerAssignedProjects.includes(selectedProject);
    if (role === 'client') {
      // Allow clients to see reviews for projects they have tasks in
      return clientAssignedProjects.includes(selectedProject);
      
      // Alternative: If you want clients to see reviews for ALL projects, use:
      // return selectedProject !== '';
    }
    return false;
  };

  // Check if current user can add reviews to the selected project
  const canAddReviews = () => {
    return role === 'partner' && partnerAssignedProjects.includes(selectedProject);
  };

  return (
    <div className="kanban-container">
      <header className="kanban-header">
        <h1>Kanban Board</h1>
        {/* Project Selector for all users */}
        {projects.length > 0 && (
          <select 
            value={selectedProject} 
            onChange={handleProjectSelectChange}
            className="client-selector" // Reuse class
          >
            <option value="">Select a project</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        )}
        {/* Client selector for admin (optional - if you want to keep both project and client filtering) */}
        {role === 'admin' && clients.length > 0 && (
          <select 
            value={selectedClient} 
            onChange={handleClientSelectChange}
            className="client-selector"
          >
            <option value="">Select a client to view tasks</option>
            {clients.map(client => (
              <option key={client.id} value={client.id}>
                {client.name || client.email}
              </option>
            ))}
          </select>
        )}
      </header>

      {/* Show message for clients and partners with no assigned projects */}
      {(role === 'client' || role === 'partner') && projects.length === 0 && (
        <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
          <p>No projects assigned to you yet.</p>
        </div>
      )}

      {/* Add Task Form for Admin */}
      {role === 'admin' && selectedProject && (
        <div className="add-task-form">
          <h3>Add New Task</h3>
          <form onSubmit={handleAddTask}>
            <input
              type="text"
              placeholder="Task title"
              value={newTask.title}
              onChange={(e) => setNewTask({...newTask, title: e.target.value})}
              required
            />
            <textarea
              placeholder="Task description"
              value={newTask.description}
              onChange={(e) => setNewTask({...newTask, description: e.target.value})}
            />
            <input
              type="datetime-local"
              placeholder="Deadline"
              value={newTask.deadline}
              onChange={(e) => setNewTask({...newTask, deadline: e.target.value})}
            />
            <select
              value={newTask.status}
              onChange={(e) => setNewTask({...newTask, status: e.target.value})}
            >
              <option value="todo">To Do</option>
              <option value="inprogress">In Progress</option>
              <option value="done">Done</option>
            </select>
            <button type="submit" className="btn-primary">Add Task</button>
          </form>
        </div>
      )}

      {/* Reviews Section - Only show if user has access */}
      {selectedProject && canViewReviews() && (
        <div className="reviews-section" style={{ marginTop: '20px', padding: '15px', border: '1px solid #ccc' }}>
          <h3>Project Reviews</h3>
          {/* Add Review Form - Only partners can add reviews */}
          {canAddReviews() && (
            <form onSubmit={handleAddReview} style={{ marginBottom: '15px' }}>
              <textarea
                placeholder="Add your review..."
                value={newReview}
                onChange={(e) => setNewReview(e.target.value)}
                style={{ width: '100%', minHeight: '60px', marginBottom: '10px' }}
              />
              <button type="submit" className="btn-primary">Add Review</button>
            </form>
          )}
          
          {/* Display Reviews */}
          <div className="reviews-list">
            {reviews.length === 0 ? (
              <p>No reviews yet.</p>
            ) : (
              <ul style={{ listStyleType: 'none', padding: 0 }}>
                {reviews.map(review => (
                  <li key={review.id} style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <p><strong>{review.authorRole.toUpperCase()}:</strong> {review.text}</p>
                        <small>{new Date(review.createdAt).toLocaleString()}</small>
                      </div>
                      {role === 'admin' && (
                        <button 
                          onClick={() => handleDeleteReview(review.id)}
                          className="btn-danger"
                          style={{ marginLeft: '10px', padding: '5px 10px', fontSize: '12px' }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Kanban Board */}
      {selectedProject ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="kanban-board">
            {columns.map(column => (
              <div key={column.id} className="kanban-column">
                <h2>{column.title}</h2>
                <Droppable droppableId={column.id}>
                  {(provided) => (
                    <div 
                      ref={provided.innerRef} 
                      {...provided.droppableProps} 
                      className="kanban-tasks"
                    >
                      {getTasksByStatus(column.id).map((task, index) => {
                        // Determine if this task should be draggable
                        const isDraggable = role === 'admin' || 
                                          (role === 'client' && task.assignedTo === user.uid);
                        
                        return (
                          <Draggable 
                            key={task.id} 
                            draggableId={task.id} 
                            index={index}
                            isDragDisabled={!isDraggable}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`kanban-task ${!isDraggable ? 'task-read-only' : ''} ${snapshot.isDragging ? 'task-dragging' : ''}`}
                                style={{
                                  ...provided.draggableProps.style,
                                  opacity: !isDraggable ? 0.7 : 1,
                                  cursor: !isDraggable ? 'default' : 'grab'
                                }}
                              >
                                <h3>{task.title}</h3>
                                <p>{task.description}</p>
                                {/* Display additional task info */}
                                <p><small><strong>Assigned to:</strong> {getUserName(task.assignedTo)}</small></p>
                                {task.deadline && (
                                  <p><small><strong>Deadline:</strong> {new Date(task.deadline).toLocaleString()}</small></p>
                                )}
                                <p><small><strong>Created:</strong> {new Date(task.createdAt).toLocaleDateString()}</small></p>
                                {role === 'admin' && (
                                  <button 
                                    onClick={() => handleDeleteTask(task.id)}
                                    className="btn-danger"
                                  >
                                    Delete
                                  </button>
                                )}
                                {/* Show read-only indicator for partners */}
                                {role === 'partner' && (
                                  <div style={{ 
                                    fontSize: '12px', 
                                    color: '#666', 
                                    fontStyle: 'italic',
                                    marginTop: '5px'
                                  }}>
                                    Read-only
                                  </div>
                                )}
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      ) : (
        <p>Please select a project to view tasks.</p>
      )}
    </div>
  );
};

export default Kanbanboard;