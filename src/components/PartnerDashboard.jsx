// src/components/Partner/PartnerDashboard.js
import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot, addDoc, orderBy, doc, getDoc } from 'firebase/firestore';
import { useParams, Link } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';

const PartnerDashboard = ({ user, role }) => {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState('');
  const [clients, setClients] = useState([]);
  const [activeGame, setActiveGame] = useState(null);
  const [loading, setLoading] = useState(true); // Added missing loading state
  const [error, setError] = useState(null); // Added error state

  // Columns for Kanban board (non-interactive)
  const columns = [
    { id: 'todo', title: 'To Do' },
    { id: 'inprogress', title: 'In Progress' },
    { id: 'done', title: 'Done' }
  ];

  // Validate user assignment to project
  useEffect(() => {
    const validateProjectAccess = async () => {
      if (!user || !projectId) {
        setError('User not authenticated or project not specified');
        setLoading(false);
        return;
      }

      try {
        // Fetch user data to verify project assignment
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists()) {
          setError('User data not found');
          setLoading(false);
          return;
        }

        const userData = userDoc.data();
        if (userData.role !== 'partner') {
          setError('Access denied: User is not a partner');
          setLoading(false);
          return;
        }

        if (userData.assignedProjectId !== projectId) {
          setError('Access denied: Project not assigned to this partner');
          setLoading(false);
          return;
        }

        setLoading(false);
      } catch (err) {
        console.error("Error validating project access:", err);
        setError('Failed to validate project access');
        setLoading(false);
      }
    };

    validateProjectAccess();
  }, [user, projectId]);

  // Fetch project details
  useEffect(() => {
    if (!projectId || loading || error) return;

    const docRef = doc(db, 'projects', projectId);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setProject({ id: docSnap.id, ...docSnap.data() });
      } else {
        console.error("Project not found!");
        setProject(null);
      }
    }, (error) => {
      console.error("Error fetching project:", error);
    });

    return () => unsubscribe();
  }, [projectId, loading, error]);

  // Fetch tasks for the project
  useEffect(() => {
    if (!projectId || loading || error) return;

    const q = query(collection(db, 'tasks'), where('projectId', '==', projectId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      const sortedTasks = [...tasksData].sort((a, b) => {
        const statusOrder = { 'todo': 1, 'inprogress': 2, 'done': 3 };
        return statusOrder[a.status] - statusOrder[b.status];
      });
      setTasks(sortedTasks);
    }, (error) => {
      console.error("Error fetching tasks:", error);
    });

    return () => unsubscribe();
  }, [projectId, loading, error]);

  // Fetch reviews for the project
  useEffect(() => {
    if (!projectId || loading || error) return;

    const q = query(
      collection(db, 'reviews'),
      where('projectId', '==', projectId),
      orderBy('createdAt', 'desc')
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
  }, [projectId, loading, error]);

  // Fetch clients for name display
  useEffect(() => {
    if (loading || error) return;

    const q = query(collection(db, 'users'), where('role', '==', 'client'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const clientsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setClients(clientsData);
    }, (error) => {
      console.error("Error fetching clients:", error);
    });

    return () => unsubscribe();
  }, [loading, error]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error logging out:', error);
      alert('Failed to log out. Please try again.');
    }
  };

  const handleAddReview = async (e) => {
    e.preventDefault();
    if (!newReview.trim()) {
      alert('Review text is required');
      return;
    }
    if (!projectId) {
      alert('Project ID is missing');
      return;
    }
    if (!user) {
      alert('User not authenticated');
      return;
    }

    try {
      const reviewData = {
        projectId: projectId,
        text: newReview.trim(),
        authorId: user.uid,
        authorRole: role, // Should be 'partner'
        createdAt: new Date().toISOString()
      };
      
      await addDoc(collection(db, 'reviews'), reviewData);
      setNewReview(''); // Clear the input field
      alert('Review added successfully!');
    } catch (err) {
      console.error('Error adding review:', err);
      alert('Failed to add review. Please try again.');
    }
  };

  const getTasksByStatus = (status) => {
    return tasks.filter(task => task.status === status);
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client ? (client.name || client.email) : 'Unknown Client';
  };

  // --- Simple 2048 Game Component ---
  const Game2048 = () => {
    const [board, setBoard] = useState([]);
    const [score, setScore] = useState(0);
    const [gameKey, setGameKey] = useState(0); // For resetting

    // Initialize board
    const initializeBoard = () => {
      const newBoard = Array(4).fill().map(() => Array(4).fill(0));
      addRandomTile(newBoard);
      addRandomTile(newBoard);
      return newBoard;
    };

    const addRandomTile = (board) => {
      const emptyCells = [];
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          if (board[i][j] === 0) {
            emptyCells.push([i, j]);
          }
        }
      }
      if (emptyCells.length > 0) {
        const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        board[randomCell[0]][randomCell[1]] = Math.random() < 0.9 ? 2 : 4;
      }
    };

    const moveLeft = (board) => {
      const newBoard = board.map(row => [...row]);
      let moved = false;
      let newScore = 0;
      for (let i = 0; i < 4; i++) {
        const row = newBoard[i].filter(cell => cell !== 0);
        for (let j = 0; j < row.length - 1; j++) {
          if (row[j] === row[j + 1]) {
            row[j] *= 2;
            newScore += row[j];
            row[j + 1] = 0;
          }
        }
        const filteredRow = row.filter(cell => cell !== 0);
        while (filteredRow.length < 4) {
          filteredRow.push(0);
        }
        for (let j = 0; j < 4; j++) {
          if (newBoard[i][j] !== filteredRow[j]) {
            moved = true;
          }
          newBoard[i][j] = filteredRow[j];
        }
      }
      return { board: newBoard, moved, score: newScore };
    };

    const rotateBoard = (board) => {
      const newBoard = Array(4).fill().map(() => Array(4).fill(0));
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          newBoard[j][3 - i] = board[i][j];
        }
      }
      return newBoard;
    };

    const move = (direction) => {
      if (!board || board.length === 0) return;
      let currentBoard = board.map(row => [...row]);
      // Rotate board to make all moves equivalent to left move
      for (let i = 0; i < direction; i++) {
        currentBoard = rotateBoard(currentBoard);
      }
      const result = moveLeft(currentBoard);
      // Rotate back
      for (let i = 0; i < (4 - direction) % 4; i++) {
        result.board = rotateBoard(result.board);
      }
      if (result.moved) {
        addRandomTile(result.board);
        setBoard(result.board);
        setScore(prev => prev + result.score);
      }
    };

    // Initialize board on component mount and when gameKey changes
    useEffect(() => {
      setBoard(initializeBoard());
    }, [gameKey]);

    useEffect(() => {
      const handleKeyPress = (e) => {
        if (!board || board.length === 0) return;
        switch (e.key) {
          case 'ArrowLeft':
            e.preventDefault();
            move(0);
            break;
          case 'ArrowUp':
            e.preventDefault();
            move(1);
            break;
          case 'ArrowRight':
            e.preventDefault();
            move(2);
            break;
          case 'ArrowDown':
            e.preventDefault();
            move(3);
            break;
          default:
            break;
        }
      };
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }, [board]);

    const resetGame = () => {
      setScore(0);
      setGameKey(prev => prev + 1); // Triggers board re-initialization
    };

    // Don't render until board is initialized
    if (!board || board.length === 0) {
      return <div style={{ textAlign: 'center', padding: '20px' }}>Loading game...</div>;
    }

    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <h3>2048 Game</h3>
        <p>Score: {score}</p>
        <p>Use arrow keys to play</p>
        <div style={{ display: 'inline-block', backgroundColor: '#bbada0', padding: '10px', borderRadius: '6px' }}>
          {board.map((row, i) => (
            <div key={i} style={{ display: 'flex' }}>
              {row.map((cell, j) => {
                const getCellColor = (value) => {
                  const colors = {
                    0: '#cdc1b4',
                    2: '#eee4da',
                    4: '#ede0c8',
                    8: '#f2b179',
                    16: '#f59563',
                    32: '#f67c5f',
                    64: '#f65e3b',
                    128: '#edcf72',
                    256: '#edcc61',
                    512: '#edc850',
                    1024: '#edc53f',
                    2048: '#edc22e'
                  };
                  return colors[value] || '#3c3a32';
                };
                return (
                  <div
                    key={`${i}-${j}`}
                    style={{
                      width: '60px',
                      height: '60px',
                      backgroundColor: getCellColor(cell),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '2px',
                      borderRadius: '3px',
                      fontSize: '18px',
                      fontWeight: 'bold',
                      color: cell > 4 ? '#fff' : '#776e65'
                    }}
                  >
                    {cell || ''}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <br />
        <button onClick={resetGame} className="btn-secondary" style={{ marginTop: '10px' }}>
          Reset Game
        </button>
      </div>
    );
  };

  // --- End 2048 Game Component ---

  // --- Simple Snake Game Component ---
  const SnakeGame = () => {
    // Fixed the initialization of snake state
    const [snake, setSnake] = useState([[10, 10]]); // Initialize with a single segment at position [10,10]
    const [food, setFood] = useState([5, 5]);
    const [direction, setDirection] = useState([0, 1]); // Start moving right
    const [gameOver, setGameOver] = useState(false);
    const [score, setScore] = useState(0);

    const resetGame = () => {
      // Fixed the resetGame function as well
      setSnake([[10, 10]]); // Reset to initial position with a single segment
      setFood([Math.floor(Math.random() * 20), Math.floor(Math.random() * 20)]);
      setDirection([0, 1]); // Reset direction
      setGameOver(false);
      setScore(0);
    };

    useEffect(() => {
      const handleKeyPress = (e) => {
        // Prevent default behavior for arrow keys to avoid page scrolling
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
        }
        // Prevent direction reversal
        switch (e.key) {
          case 'ArrowUp':
            setDirection(prev => prev[0] !== 1 ? [-1, 0] : prev); // Not down
            break;
          case 'ArrowDown':
            setDirection(prev => prev[0] !== -1 ? [1, 0] : prev); // Not up
            break;
          case 'ArrowLeft':
            setDirection(prev => prev[1] !== 1 ? [0, -1] : prev); // Not right
            break;
          case 'ArrowRight':
            setDirection(prev => prev[1] !== -1 ? [0, 1] : prev); // Not left
            break;
          default:
            break;
        }
      };
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }, []);

    useEffect(() => {
      if (!gameOver) {
        const gameInterval = setInterval(() => {
          setSnake(prevSnake => {
            const newSnake = [...prevSnake];
            const head = [newSnake[0][0] + direction[0], newSnake[0][1] + direction[1]];
            // Check wall collision
            if (head[0] < 0 || head[0] >= 20 || head[1] < 0 || head[1] >= 20) {
              setGameOver(true);
              return prevSnake;
            }
            // Check self collision
            for (let segment of newSnake) {
              if (head[0] === segment[0] && head[1] === segment[1]) {
                setGameOver(true);
                return prevSnake;
              }
            }
            newSnake.unshift(head);
            // Check food collision
            if (head[0] === food[0] && head[1] === food[1]) {
              setScore(prev => prev + 10);
              // Generate new food, ensuring it's not on the snake
              let newFood;
              do {
                newFood = [Math.floor(Math.random() * 20), Math.floor(Math.random() * 20)];
              } while (newSnake.some(segment => segment[0] === newFood[0] && segment[1] === newFood[1]));
              setFood(newFood);
            } else {
              newSnake.pop();
            }
            return newSnake;
          });
        }, 150); // Game speed
        return () => clearInterval(gameInterval);
      }
    }, [direction, food, gameOver]);

    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <h3>Snake Game</h3>
        <p>Score: {score}</p>
        <p>Use arrow keys to play</p>
        {gameOver && <p style={{ color: 'red' }}>Game Over!</p>}
        <div style={{
          display: 'inline-block',
          backgroundColor: '#000',
          padding: '2px',
          border: '2px solid #333'
        }}>
          {Array(20).fill().map((_, row) => (
            <div key={row} style={{ display: 'flex' }}>
              {Array(20).fill().map((_, col) => {
                // Fixed the snake segment checking
                const isSnake = snake.some(segment => segment[0] === row && segment[1] === col);
                const isFood = food[0] === row && food[1] === col;
                return (
                  <div
                    key={`${row}-${col}`}
                    style={{
                      width: '15px',
                      height: '15px',
                      backgroundColor: isSnake ? '#0f0' : isFood ? '#f00' : '#000',
                      border: '1px solid #333'
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <br />
        <button onClick={resetGame} className="btn-secondary" style={{ marginTop: '10px' }}>
          Reset Game
        </button>
      </div>
    );
  };

  // --- End Snake Game Component ---

  if (loading) {
    return <div className="dashboard-container"><p>Loading...</p></div>;
  }

  if (error) {
    return <div className="dashboard-container"><p>Error: {error}</p></div>;
  }

  if (!projectId) {
    return <div className="dashboard-container"><p>Project ID not specified.</p></div>;
  }

  if (!project) {
    return <div className="dashboard-container"><p>Loading project...</p></div>;
  }

  return (
    <div className="dashboard-container" style={{ backgroundColor: '#ffffff' }}>
      {/* Enhanced Header with Logout */}
      <header className="dashboard-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        borderBottom: '1px solid #dee2e6',
        padding: '10px 20px'
      }}>
        <h1 style={{ color: '#212529', margin: 0 }}>Project: {project.name} - Partner View</h1>
        <nav style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={handleLogout}
            className="btn-secondary"
            style={{
              backgroundColor: '#6c757d',
              borderColor: '#6c757d',
              color: '#ffffff',
              padding: '8px 16px',
              borderRadius: '4px',
              border: '1px solid #6c757d',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </nav>
      </header>
      <main style={{ padding: '20px' }}>
        {/* Kanban Board (View Only) - Main Focus */}
        <section>
          <h2 style={{ color: '#212529', marginBottom: '20px' }}>Project Progress</h2>
          <div className="kanban-board" style={{
            display: 'flex',
            gap: '20px',
            overflowX: 'auto',
            marginBottom: '30px',
            backgroundColor: '#f8f9fa',
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid #dee2e6'
          }}>
            {columns.map(column => (
              <div key={column.id} className="kanban-column" style={{
                minWidth: '300px',
                backgroundColor: '#ffffff',
                padding: '15px',
                borderRadius: '6px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ color: '#212529', marginBottom: '15px' }}>{column.title}</h3>
                <div className="kanban-tasks">
                  {getTasksByStatus(column.id).map((task) => (
                    <div key={task.id} className="kanban-task" style={{
                      opacity: 1,
                      cursor: 'default',
                      backgroundColor: '#f8f9fa',
                      padding: '15px',
                      borderRadius: '4px',
                      marginBottom: '10px',
                      border: '1px solid #dee2e6'
                    }}>
                      <h4 style={{ color: '#212529', marginBottom: '8px' }}>{task.title}</h4>
                      <p style={{ color: '#495057', marginBottom: '4px' }}>{task.description}</p>
                      <p style={{ color: '#6c757d', fontSize: '0.9em' }}><strong>Client:</strong> {getClientName(task.assignedTo)}</p>
                      {task.deadline && (
                        <p style={{ color: '#6c757d', fontSize: '0.9em' }}><strong>Deadline:</strong> {new Date(task.deadline).toLocaleString()}</p>
                      )}
                      <p style={{ color: '#6c757d', fontSize: '0.9em' }}><strong>Created:</strong> {new Date(task.createdAt).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
        {/* Entertainment Section (Always Visible) */}
        <section style={{
          backgroundColor: '#f8f9fa',
          padding: '20px',
          marginBottom: '20px',
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <h2 style={{ color: '#212529', marginBottom: '20px' }}>Entertainment Center</h2>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveGame('2048')}
              className="btn-secondary"
              style={{
                backgroundColor: activeGame === '2048' ? '#007bff' : '#6c757d',
                borderColor: '#6c757d',
                color: '#ffffff',
                padding: '8px 16px',
                borderRadius: '4px',
                border: '1px solid #6c757d',
                cursor: 'pointer'
              }}
            >
              2048 Game
            </button>
            <button
              onClick={() => setActiveGame('snake')}
              className="btn-secondary"
              style={{
                backgroundColor: activeGame === 'snake' ? '#007bff' : '#6c757d',
                borderColor: '#6c757d',
                color: '#ffffff',
                padding: '8px 16px',
                borderRadius: '4px',
                border: '1px solid #6c757d',
                cursor: 'pointer'
              }}
            >
              Snake Game
            </button>
            <button
              onClick={() => setActiveGame('videos')}
              className="btn-secondary"
              style={{
                backgroundColor: activeGame === 'videos' ? '#007bff' : '#6c757d',
                borderColor: '#6c757d',
                color: '#ffffff',
                padding: '8px 16px',
                borderRadius: '4px',
                border: '1px solid #6c757d',
                cursor: 'pointer'
              }}
            >
              YouTube Videos
            </button>
            <button
              onClick={() => setActiveGame(null)}
              className="btn-secondary"
              style={{
                backgroundColor: '#6c757d',
                borderColor: '#6c757d',
                color: '#ffffff',
                padding: '8px 16px',
                borderRadius: '4px',
                border: '1px solid #6c757d',
                cursor: 'pointer'
              }}
            >
              Close All
            </button>
          </div>
          {/* Game/Video Content */}
          {activeGame === '2048' && <Game2048 />}
          {activeGame === 'snake' && <SnakeGame />}
          {activeGame === 'videos' && (
            <div style={{ textAlign: 'center' }}>
              <h3>Relaxing Videos</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
                {/* Video 1 */}
                <div>
                  <h4>Why to Choose Us</h4>
                  <h6>a relaxing video for our partners</h6>
                  <iframe
                    key="video1"
                    width="560"
                    height="315"
                    src="https://www.youtube.com/embed/jfKfPfyJRdk?si=Example1"
                    title="Lofi Hip Hop Music"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{ maxWidth: '100%' }}
                  ></iframe>
                </div>
                {/* Video 2 */}
                <div>
                  <h4>Why Choose Web24 Agency?</h4>
                  <p>
                    Web24 Agency offers cutting-edge digital solutions tailored to elevate your online presence. 
                    From sleek websites to robust web applications, we specialize in user-focused, scalable, and 
                    modern development. Our dedicated team ensures quality delivery, transparency, and long-term results 
                    for your business growth.
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>
        {/* Reviews Section */}
        <section className="reviews-section">
  <h2 style={{
    color: '#000000',
    textTransform: 'uppercase',
    letterSpacing: '2px',
    marginBottom: '20px',
    fontWeight: 'bold',
    fontSize: '24px'
  }}>Project Reviews</h2>

  <form onSubmit={handleAddReview} className="review-form">
    <textarea
      placeholder="Add your review or feedback for this project..."
      value={newReview}
      onChange={(e) => setNewReview(e.target.value)}
      required
      style={{
        width: '100%',
        minHeight: '150px',
        padding: '15px',
        border: '2px solid #000000',
        borderRadius: '3px',
        fontSize: '14px',
        fontFamily: 'Courier New, monospace',
        marginBottom: '15px',
        resize: 'vertical'
      }}
    />
    <button type="submit" className="btn-primary">Submit Review</button>
  </form>

  <div className="reviews-list">
    {reviews.length === 0 ? (
      <p style={{
        color: '#666666',
        fontStyle: 'italic',
        textAlign: 'center',
        padding: '20px'
      }}>No reviews yet for this project.</p>
    ) : (
      <ul className="reviews-container">
        {reviews.map(review => (
          <li key={review.id} className="review-item">
            <div className="review-header">
              <strong style={{
                color: '#000000',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginRight: '10px'
              }}>
                {review.authorRole.toUpperCase()}
                {review.authorId === user.uid ? ' (You)' : ''}
              </strong>
              <small style={{
                color: '#666666',
                fontSize: '12px'
              }}>
                {new Date(review.createdAt).toLocaleString()}
              </small>
            </div>
            <p style={{
              color: '#000000',
              lineHeight: '1.6',
              marginBottom: '10px'
            }}>
              {review.text}
            </p>
          </li>
        ))}
      </ul>
    )}
  </div>
</section>
      </main>
    </div>
  );
};

export default PartnerDashboard;