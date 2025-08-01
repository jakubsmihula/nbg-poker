import React, { useState, useEffect, useRef } from 'react';
import { socket } from './socket';
import { desktopStyles, darkTheme } from './styles/styles';
import Sidebar from './components/Sidebar';
import VotePanel from './components/VotePanel';
import Statistics from './components/Statistics';
import ClassManager from './ClassManager';

export default function App() {
    const [username, setUsername] = useState('');
    const [className, setClassName] = useState('');
    const [classId, setClassId] = useState('');
    const [classDisplayName, setClassDisplayName] = useState('');
    const [joined, setJoined] = useState(false);
    const [classes, setClasses] = useState([]);
    const [message, setMessage] = useState('');
    const [forceUpdate, setForceUpdate] = useState(0); // Force re-render when class data changes
    
    // Use ref to maintain ClassManager instance across renders
    const classManagerRef = useRef(new ClassManager());
    const classManager = classManagerRef.current;
    const [showUsernamePrompt, setShowUsernamePrompt] = useState(false);
    const [inviteClassId, setInviteClassId] = useState(null);
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const saved = localStorage.getItem('darkMode');
        return saved ? JSON.parse(saved) : false;
    });
    const [toast, setToast] = useState(null);

    // Save theme preference to localStorage
    useEffect(() => {
        localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
    }, [isDarkMode]);

    // Get current theme styles
    const currentStyles = isDarkMode ? darkTheme : desktopStyles;

    // Auto-hide toast after 5 seconds
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => {
                setToast(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    // Handle URL parameters for invite links
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const classFromUrl = urlParams.get('class');
        const usernameFromUrl = urlParams.get('username');
        
        if (classFromUrl) {
            setInviteClassId(classFromUrl);
            if (usernameFromUrl) {
                setUsername(usernameFromUrl);
                // Auto-join if username is provided
                setTimeout(() => {
                    joinClassFromInvite(classFromUrl, usernameFromUrl);
                }, 1000); // Small delay to ensure socket is connected
            } else {
                setShowUsernamePrompt(true);
            }
        }
    }, []);

    useEffect(() => {
        socket.on('userClasses', (userClasses) => {
            setClasses(userClasses);
        });

        socket.on('classCreated', (newClassId, className) => {
            setClassId(newClassId);
            setClassDisplayName(className);
        });

        socket.on('joined', () => {
            setJoined(true);
            setToast({
                type: 'success',
                message: 'Successfully joined the class!',
                icon: '✅'
            });
        });

        socket.on('classData', (users) => {
            classManager.updateUsers(classId, users);
            setForceUpdate(prev => prev + 1);
        });

        socket.on('voteUpdate', (votesCount, totalUsers, classId) => {
            classManager.updateVoteCount(classId, votesCount, totalUsers);
            setMessage(`Votes received: ${votesCount} / ${totalUsers}`);
            setForceUpdate(prev => prev + 1);
        });

        socket.on('revealVotes', (votes, users, statistics, classId) => {
            console.log('revealVotes event received:', { votes, users, statistics, classId });
            classManager.updateVotes(classId, votes);
            classManager.updateUsers(classId, users);
            classManager.updateStats(classId, statistics);
            setMessage('Votes revealed');
            setForceUpdate(prev => prev + 1);
            console.log('After reveal, class data:', classManager.getClassData(classId));
        });

        socket.on('resetVotes', (classId) => {
            console.log('resetVotes event received with classId:', classId);
            classManager.resetVotes(classId);
            setMessage('');
            setForceUpdate(prev => prev + 1);
            console.log('After reset, class data:', classManager.getClassData(classId));
        });

        socket.on('classRemoved', (removedClassId, className) => {
            // If the user was in the removed class, leave it
            if (classId === removedClassId) {
                setJoined(false);
                setClassId('');
                setClassDisplayName('');
                setMessage('');
            }
            
            // Remove the class from ClassManager
            classManager.removeClass(removedClassId);
            setForceUpdate(prev => prev + 1);
            
            // Show notification
            setToast({
                type: 'info',
                message: `Class "${className}" has been deleted because all users left.`,
                icon: '🏠'
            });
        });

        socket.on('error', (errorMessage) => {
            setToast({
                type: 'error',
                message: errorMessage,
                icon: '❌'
            });
        });

        // Request user's classes on connection
        socket.emit('getUserClasses');

        return () => {
            socket.off('userClasses');
            socket.off('classCreated');
            socket.off('joined');
            socket.off('classData');
            socket.off('voteUpdate');
            socket.off('revealVotes');
            socket.off('resetVotes');
            socket.off('classRemoved');
            socket.off('error');
        };
    }, [classId]);

    const joinClassFromInvite = (targetClassId, targetUsername) => {
        if (!targetUsername.trim()) {
            alert('Please enter your name');
            return;
        }
        
        setClassId(targetClassId);
        socket.emit('joinClass', targetClassId, targetUsername);
        
        // Clear URL parameters after joining
        const url = new URL(window.location);
        url.searchParams.delete('class');
        url.searchParams.delete('username');
        window.history.replaceState({}, '', url);
        
        setShowUsernamePrompt(false);
        setInviteClassId(null);
    };

    const createClass = () => {
        if (!username.trim()) {
            alert('Please enter your name');
            return;
        }
        socket.emit('createClass', className.trim() || null, username);
    };

    const joinClass = (targetClassId) => {
        if (!username.trim()) {
            setToast({
                type: 'error',
                message: 'Please enter your name before joining a class',
                icon: '❌'
            });
            return;
        }
        
        const targetClass = classes.find(cls => cls.id === targetClassId);
        if (targetClass) {
            setClassDisplayName(targetClass.name);
        }
        
        setClassId(targetClassId);
        socket.emit('joinClass', targetClassId, username);
    };

    const sendVote = (vote) => {
        classManager.setMyVote(classId, vote);
        setMessage('Waiting for others...');
        socket.emit('vote', vote, classId);
        setForceUpdate(prev => prev + 1);
    };

    const revealVotes = () => {
        console.log('revealVotes called with classId:', classId);
        socket.emit('revealVotes', classId);
    };

    const resetVotes = () => {
        console.log('resetVotes called with classId:', classId);
        socket.emit('resetVotes', classId);
    };

    const copyLinkToClipboard = () => {
        const url = new URL(window.location);
        url.searchParams.set('class', classId);
        navigator.clipboard.writeText(url.toString())
            .then(() => {
                setToast({
                    type: 'success',
                    message: 'Invitation link copied to clipboard!',
                    icon: '📋'
                });
            })
            .catch(err => {
                console.error('Could not copy link:', err);
                setToast({
                    type: 'error',
                    message: 'Failed to copy link to clipboard',
                    icon: '❌'
                });
            });
    };

    const leaveClass = () => {
        if (classId) {
            socket.emit('leaveClass', classId);
        }
        setJoined(false);
        setClassId('');
        setClassDisplayName('');
        setMessage('');
    };

    const toggleTheme = () => {
        setIsDarkMode(!isDarkMode);
    };

    // Toast notification component
    const Toast = ({ toast }) => {
        if (!toast) return null;

        const getToastStyles = () => {
            const baseStyles = {
                position: 'fixed',
                top: '20px',
                right: '20px',
                padding: '15px 20px',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: 10001,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                maxWidth: '400px',
                animation: 'slideIn 0.3s ease-out',
                fontSize: '14px',
                fontWeight: '500',
            };

            const themeStyles = isDarkMode ? {
                background: toast.type === 'error' ? '#4a2d2d' : toast.type === 'success' ? '#2d4a2d' : '#2d2d4a',
                color: toast.type === 'error' ? '#ff6b6b' : toast.type === 'success' ? '#6bff6b' : '#6b6bff',
                border: `1px solid ${toast.type === 'error' ? '#7c4a4a' : toast.type === 'success' ? '#4a7c4a' : '#4a4a7c'}`,
            } : {
                background: toast.type === 'error' ? '#f8d7da' : toast.type === 'success' ? '#d4edda' : '#d1ecf1',
                color: toast.type === 'error' ? '#721c24' : toast.type === 'success' ? '#155724' : '#0c5460',
                border: `1px solid ${toast.type === 'error' ? '#f5c6cb' : toast.type === 'success' ? '#c3e6cb' : '#bee5eb'}`,
            };

            return { ...baseStyles, ...themeStyles };
        };

        return (
            <div style={getToastStyles()}>
                <span style={{ fontSize: '16px' }}>{toast.icon}</span>
                <span>{toast.message}</span>
                <button
                    onClick={() => setToast(null)}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'inherit',
                        cursor: 'pointer',
                        fontSize: '16px',
                        marginLeft: 'auto',
                        opacity: 0.7,
                    }}
                >
                    ×
                </button>
            </div>
        );
    };

    // Username prompt modal for invite links
    if (showUsernamePrompt) {
        return (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000
            }}>
                <div style={{
                    background: isDarkMode ? '#2d2d2d' : 'white',
                    padding: '40px',
                    borderRadius: '12px',
                    maxWidth: '500px',
                    width: '90%',
                    textAlign: 'center',
                    color: isDarkMode ? '#e0e0e0' : '#2c3e50'
                }}>
                    <h2 style={{ color: isDarkMode ? '#e0e0e0' : '#2c3e50', marginBottom: '20px' }}>
                        🎯 Join Planning Session
                    </h2>
                    <p style={{ color: isDarkMode ? '#bdc3c7' : '#666', marginBottom: '30px' }}>
                        You've been invited to join a planning session. Please enter your name to continue.
                    </p>
                    
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block',
                            fontSize: '14px',
                            color: isDarkMode ? '#bdc3c7' : '#666',
                            marginBottom: '8px',
                            textAlign: 'left'
                        }}>
                            Your Name
                        </label>
                        <input
                            type="text"
                            placeholder="Enter your name"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            style={{
                                ...currentStyles.input,
                                background: isDarkMode ? '#2d2d2d' : 'white',
                                color: isDarkMode ? '#e0e0e0' : '#2c3e50',
                                border: isDarkMode ? '1px solid #404040' : '1px solid #ddd'
                            }}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter' && username.trim()) {
                                    joinClassFromInvite(inviteClassId, username);
                                }
                            }}
                        />
                    </div>
                    
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                        <button
                            style={{
                                ...currentStyles.button,
                                ...currentStyles.buttonPrimary
                            }}
                            onClick={() => joinClassFromInvite(inviteClassId, username)}
                            disabled={!username.trim()}
                        >
                            Join Session
                        </button>
                        <button
                            style={{
                                ...currentStyles.button,
                                ...currentStyles.buttonSecondary
                            }}
                            onClick={() => {
                                setShowUsernamePrompt(false);
                                setInviteClassId(null);
                                const url = new URL(window.location);
                                url.searchParams.delete('class');
                                url.searchParams.delete('username');
                                window.history.replaceState({}, '', url);
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={currentStyles.container}>
            {/* Toast Notification */}
            <Toast toast={toast} />
            
            <Sidebar 
                classes={classes}
                onJoinClass={joinClass}
                onCreateClass={createClass}
                username={username}
                setUsername={setUsername}
                className={className}
                setClassName={setClassName}
                activeClassId={classId}
                isDarkMode={isDarkMode}
                setToast={setToast}
            />
            
            <div style={currentStyles.mainContent}>
                {!joined ? (
                    <div style={currentStyles.content}>
                        <div style={currentStyles.emptyState}>
                            <div style={currentStyles.emptyStateIcon}>🎯</div>
                            <h2 style={{ color: isDarkMode ? '#e0e0e0' : '#2c3e50', marginBottom: '10px' }}>
                                Welcome to Poker Planning
                            </h2>
                            <p style={{ fontSize: '16px', marginBottom: '20px', color: isDarkMode ? '#bdc3c7' : '#666' }}>
                                Create a class or join an existing one to start planning
                            </p>
                            <p style={{ fontSize: '14px', opacity: 0.7, color: isDarkMode ? '#bdc3c7' : '#666' }}>
                                Use the sidebar to manage your classes and invite team members
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        <div style={currentStyles.header}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <div 
                                    style={currentStyles.logo}
                                    onMouseEnter={(e) => {
                                        e.target.style.transform = 'scale(1.05)';
                                        e.target.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.15)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.transform = 'scale(1)';
                                        e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                                    }}
                                >
                                    <div style={{ fontWeight: 'bold', fontSize: '16px' }}>N BROWN</div>
                                    <div style={{ 
                                        width: '100%', 
                                        height: '3px', 
                                        background: '#ff6b35', 
                                        marginTop: '2px',
                                        borderRadius: '1px'
                                    }}></div>
                                </div>
                                <h1 style={currentStyles.headerTitle}>
                                    {classDisplayName}
                                </h1>
                            </div>
                            <div style={currentStyles.headerActions}>
                                <button 
                                    onClick={toggleTheme}
                                    style={{
                                        ...currentStyles.themeToggle,
                                        ...(isDarkMode ? currentStyles.themeToggleHover : {})
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.background = isDarkMode ? '#404040' : '#f5f5f5';
                                        e.target.style.borderColor = '#ff6b35';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.background = isDarkMode ? '#2d2d2d' : 'white';
                                        e.target.style.borderColor = isDarkMode ? '#404040' : '#ddd';
                                    }}
                                >
                                    {isDarkMode ? '☀️' : '🌙'} {isDarkMode ? 'Light' : 'Dark'}
                                </button>
                                <button 
                                    onClick={copyLinkToClipboard}
                                    style={{
                                        ...currentStyles.button,
                                        ...currentStyles.buttonPrimary,
                                        ...currentStyles.buttonSmall
                                    }}
                                >
                                    📋 Copy Invite Link
                                </button>
                                <button 
                                    onClick={leaveClass}
                                    style={{
                                        ...currentStyles.button,
                                        ...currentStyles.buttonDanger,
                                        ...currentStyles.buttonSmall
                                    }}
                                >
                                    🚪 Leave Class
                                </button>
                            </div>
                        </div>

                        <div style={currentStyles.content}>
                            <div style={currentStyles.card}>
                                <h3 style={currentStyles.sectionTitle}>
                                    👥 Participants ({(() => {
                                        const classData = classManager.getClassData(classId);
                                        return classData.totalUsers;
                                    })()})
                                </h3>
                                <div style={currentStyles.participantList}>
                                    {(() => {
                                        const classData = classManager.getClassData(classId);
                                        return Object.values(classData.users).map((user, index) => (
                                            <div key={index} style={currentStyles.participantItem}>
                                                👤 {user}
                                            </div>
                                        ));
                                    })()}
                                </div>
                            </div>

                            {(() => {
                                const classData = classManager.getClassData(classId);
                                console.log('VotePanel render:', {
                                    classId,
                                    classData,
                                    myVote: classData.myVote,
                                    votes: classData.isRevealed ? classData.votes : null,
                                    voteCount: classData.voteCount,
                                    totalUsers: classData.totalUsers,
                                    isRevealed: classData.isRevealed,
                                    shouldShowRevealButton: classData.voteCount > 0 && !classData.isRevealed
                                });
                                return (
                                    <VotePanel
                                        myVote={classData.myVote}
                                        sendVote={sendVote}
                                        votes={classData.isRevealed ? classData.votes : null}
                                        onRevealVotes={revealVotes}
                                        voteCount={classData.voteCount}
                                        totalUsers={classData.totalUsers}
                                        isDarkMode={isDarkMode}
                                        isRevealed={classData.isRevealed}
                                    />
                                );
                            })()}

                            {message && (
                                <div style={currentStyles.messageBox}>
                                    {message}
                                </div>
                            )}
                            
                            {(() => {
                                const classData = classManager.getClassData(classId);
                                return classData.stats ? <Statistics stats={classData.stats} isDarkMode={isDarkMode} /> : null;
                            })()}
                            
                            {(() => {
                                const classData = classManager.getClassData(classId);
                                if (!classData.isRevealed || !classData.votes || Object.keys(classData.votes).length === 0) {
                                    return null;
                                }
                                
                                return (
                                    <div style={currentStyles.card}>
                                        <h3 style={currentStyles.sectionTitle}>📋 Vote Results</h3>
                                        <div style={currentStyles.resultsList}>
                                            {Object.entries(classData.votes).map(([socketId, vote], index) => {
                                                const username = classData.users[socketId] || 'Unknown User';
                                                return (
                                                    <div 
                                                        key={socketId} 
                                                        style={{
                                                            ...currentStyles.resultItem,
                                                            ...(index === Object.entries(classData.votes).length - 1 ? currentStyles.resultItemLast : {})
                                                        }}
                                                    >
                                                        <span>👤 {username}</span>
                                                        <span style={{fontWeight: 'bold', fontSize: '18px'}}>
                                                            {vote}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <button
                                            style={{
                                                ...currentStyles.button,
                                                ...currentStyles.buttonSecondary,
                                                marginTop: '20px'
                                            }}
                                            onClick={resetVotes}
                                        >
                                            🔄 Reset Votes
                                        </button>
                                    </div>
                                );
                            })()}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
