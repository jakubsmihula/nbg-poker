import React, { useState, useEffect, useRef } from 'react';
import { socket } from './socket';
import { desktopStyles, darkTheme } from './styles/styles';
import Sidebar from './components/Sidebar';
import VotePanel from './components/VotePanel';
import Statistics from './components/Statistics';
import SquadManager from './SquadManager';

export default function App() {
    const [username, setUsername] = useState('');
    const [squadName, setSquadName] = useState('');
    const [squadId, setSquadId] = useState('');
    const [squadDisplayName, setSquadDisplayName] = useState('');
    const [joined, setJoined] = useState(false);
    const [squads, setSquads] = useState([]);
    const [message, setMessage] = useState('');
    const [forceUpdate, setForceUpdate] = useState(0); // Force re-render when squad data changes
    
    // Use ref to maintain SquadManager instance across renders
    const squadManagerRef = useRef(new SquadManager());
    const squadManager = squadManagerRef.current;
    const [showUsernamePrompt, setShowUsernamePrompt] = useState(false);
    const [inviteSquadId, setInviteSquadId] = useState(null);
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
        const squadFromUrl = urlParams.get('squad');
        const usernameFromUrl = urlParams.get('username');
        
        if (squadFromUrl) {
            setInviteSquadId(squadFromUrl);
            if (usernameFromUrl) {
                setUsername(usernameFromUrl);
                // Auto-join if username is provided
                setTimeout(() => {
                    joinSquadFromInvite(squadFromUrl, usernameFromUrl);
                }, 1000); // Small delay to ensure socket is connected
            } else {
                setShowUsernamePrompt(true);
            }
        }
    }, []);

    useEffect(() => {
        socket.on('userSquads', (userSquads) => {
            setSquads(userSquads);
        });

        socket.on('squadCreated', (newSquadId, squadName) => {
            setSquadId(newSquadId);
            setSquadDisplayName(squadName);
        });

        socket.on('joined', () => {
            setJoined(true);
            setToast({
                type: 'success',
                message: 'Successfully joined the squad!',
                icon: '✅'
            });
        });

        socket.on('squadData', (users) => {
            squadManager.updateUsers(squadId, users);
            setForceUpdate(prev => prev + 1);
        });

        socket.on('voteUpdate', (votesCount, totalUsers, squadId) => {
            squadManager.updateVoteCount(squadId, votesCount, totalUsers);
            setMessage(`Votes received: ${votesCount} / ${totalUsers}`);
            setForceUpdate(prev => prev + 1);
        });

        socket.on('revealVotes', (votes, users, statistics, squadId) => {
            console.log('revealVotes event received:', { votes, users, statistics, squadId });
            squadManager.updateVotes(squadId, votes);
            squadManager.updateUsers(squadId, users);
            squadManager.updateStats(squadId, statistics);
            setMessage('Votes revealed');
            setForceUpdate(prev => prev + 1);
            console.log('After reveal, squad data:', squadManager.getSquadData(squadId));
        });

        socket.on('resetVotes', (squadId) => {
            console.log('resetVotes event received with squadId:', squadId);
            squadManager.resetVotes(squadId);
            setMessage('');
            setForceUpdate(prev => prev + 1);
            console.log('After reset, squad data:', squadManager.getSquadData(squadId));
        });

        socket.on('squadRemoved', (removedSquadId, squadName) => {
            // If the user was in the removed squad, leave it
            if (squadId === removedSquadId) {
                setJoined(false);
                setSquadId('');
                setSquadDisplayName('');
                setMessage('');
            }
            
            // Remove the squad from SquadManager
            squadManager.removeSquad(removedSquadId);
            setForceUpdate(prev => prev + 1);
            
            // Show notification
            setToast({
                type: 'info',
                message: `Squad "${squadName}" has been deleted because all users left.`,
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

        // Request user's squads on connection
        socket.emit('getUserSquads');

        return () => {
            socket.off('userSquads');
            socket.off('squadCreated');
            socket.off('joined');
            socket.off('squadData');
            socket.off('voteUpdate');
            socket.off('revealVotes');
            socket.off('resetVotes');
            socket.off('squadRemoved');
            socket.off('error');
        };
    }, [squadId]);

    const joinSquadFromInvite = (targetSquadId, targetUsername) => {
        if (!targetUsername.trim()) {
            alert('Please enter your name');
            return;
        }
        
        setSquadId(targetSquadId);
        socket.emit('joinSquad', targetSquadId, targetUsername);
        
        // Clear URL parameters after joining
        const url = new URL(window.location);
        url.searchParams.delete('squad');
        url.searchParams.delete('username');
        window.history.replaceState({}, '', url);
        
        setShowUsernamePrompt(false);
        setInviteSquadId(null);
    };

    const createSquad = () => {
        if (!username.trim()) {
            alert('Please enter your name');
            return;
        }
        socket.emit('createSquad', squadName.trim() || null, username);
    };

    const joinSquad = (targetSquadId) => {
        if (!username.trim()) {
            setToast({
                type: 'error',
                message: 'Please enter your name before joining a squad',
                icon: '❌'
            });
            return;
        }
        
        const targetSquad = squads.find(squad => squad.id === targetSquadId);
        if (targetSquad) {
            setSquadDisplayName(targetSquad.name);
        }
        
        setSquadId(targetSquadId);
        socket.emit('joinSquad', targetSquadId, username);
    };

    const sendVote = (vote) => {
        squadManager.setMyVote(squadId, vote);
        setMessage('Waiting for others...');
        socket.emit('vote', vote, squadId);
        setForceUpdate(prev => prev + 1);
    };

    const revealVotes = () => {
        console.log('revealVotes called with squadId:', squadId);
        socket.emit('revealVotes', squadId);
    };

    const resetVotes = () => {
        console.log('resetVotes called with squadId:', squadId);
        socket.emit('resetVotes', squadId);
    };

    const copyLinkToClipboard = () => {
        const url = new URL(window.location);
        url.searchParams.set('squad', squadId);
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

    const leaveSquad = () => {
        if (squadId) {
            socket.emit('leaveSquad', squadId);
        }
        setJoined(false);
        setSquadId('');
        setSquadDisplayName('');
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
                                    joinSquadFromInvite(inviteSquadId, username);
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
                            onClick={() => joinSquadFromInvite(inviteSquadId, username)}
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
                                setInviteSquadId(null);
                                const url = new URL(window.location);
                                url.searchParams.delete('squad');
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
                squads={squads}
                onJoinSquad={joinSquad}
                onCreateSquad={createSquad}
                username={username}
                setUsername={setUsername}
                squadName={squadName}
                setSquadName={setSquadName}
                activeSquadId={squadId}
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
                                Create a squad or join an existing one to start planning
                            </p>
                            <p style={{ fontSize: '14px', opacity: 0.7, color: isDarkMode ? '#bdc3c7' : '#666' }}>
                                Use the sidebar to manage your squads and invite team members
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
                                    {squadDisplayName}
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
                                    onClick={leaveSquad}
                                    style={{
                                        ...currentStyles.button,
                                        ...currentStyles.buttonDanger,
                                        ...currentStyles.buttonSmall
                                    }}
                                >
                                    🚪 Leave Squad
                                </button>
                            </div>
                        </div>

                        <div style={currentStyles.content}>
                            <div style={currentStyles.card}>
                                <h3 style={currentStyles.sectionTitle}>
                                    👥 Participants ({(() => {
                                        const squadData = squadManager.getSquadData(squadId);
                                        return squadData.totalUsers;
                                    })()})
                                </h3>
                                <div style={currentStyles.participantList}>
                                    {(() => {
                                        const squadData = squadManager.getSquadData(squadId);
                                        return Object.values(squadData.users).map((user, index) => (
                                            <div key={index} style={currentStyles.participantItem}>
                                                👤 {user}
                                            </div>
                                        ));
                                    })()}
                                </div>
                            </div>

                            {(() => {
                                const squadData = squadManager.getSquadData(squadId);
                                console.log('VotePanel render:', {
                                    squadId,
                                    squadData,
                                    myVote: squadData.myVote,
                                    votes: squadData.isRevealed ? squadData.votes : null,
                                    voteCount: squadData.voteCount,
                                    totalUsers: squadData.totalUsers,
                                    isRevealed: squadData.isRevealed,
                                    shouldShowRevealButton: squadData.voteCount > 0 && !squadData.isRevealed
                                });
                                return (
                                    <VotePanel
                                        myVote={squadData.myVote}
                                        sendVote={sendVote}
                                        votes={squadData.isRevealed ? squadData.votes : null}
                                        onRevealVotes={revealVotes}
                                        voteCount={squadData.voteCount}
                                        totalUsers={squadData.totalUsers}
                                        isDarkMode={isDarkMode}
                                        isRevealed={squadData.isRevealed}
                                    />
                                );
                            })()}

                            {message && (
                                <div style={currentStyles.messageBox}>
                                    {message}
                                </div>
                            )}
                            
                            {(() => {
                                const squadData = squadManager.getSquadData(squadId);
                                return squadData.stats ? <Statistics stats={squadData.stats} isDarkMode={isDarkMode} /> : null;
                            })()}
                            
                            {(() => {
                                const squadData = squadManager.getSquadData(squadId);
                                if (!squadData.isRevealed || !squadData.votes || Object.keys(squadData.votes).length === 0) {
                                    return null;
                                }
                                
                                return (
                                    <div style={currentStyles.card}>
                                        <h3 style={currentStyles.sectionTitle}>📋 Vote Results</h3>
                                        <div style={currentStyles.resultsList}>
                                            {Object.entries(squadData.votes).map(([socketId, vote], index) => {
                                                const username = squadData.users[socketId] || 'Unknown User';
                                                return (
                                                    <div 
                                                        key={socketId} 
                                                        style={{
                                                            ...currentStyles.resultItem,
                                                            ...(index === Object.entries(squadData.votes).length - 1 ? currentStyles.resultItemLast : {})
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
