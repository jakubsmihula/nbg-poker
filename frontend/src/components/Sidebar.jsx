import React, { useState } from 'react';
import { desktopStyles, darkTheme } from '../styles/styles';

const Sidebar = ({ 
    squads, 
    onJoinSquad, 
    onCreateSquad, 
    username, 
    setUsername, 
    squadName, 
    setSquadName,
    activeSquadId,
    isDarkMode = false,
    setToast
}) => {
    const [isCreating, setIsCreating] = useState(false);
    const [isJoiningByLink, setIsJoiningByLink] = useState(false);
    const [inviteLink, setInviteLink] = useState('');
    const currentStyles = isDarkMode ? darkTheme : desktopStyles;

    const handleCreateSquad = () => {
        if (!username.trim()) {
            setToast({
                type: 'error',
                message: 'Please enter your name before creating a squad',
                icon: '❌'
            });
            return;
        }
        onCreateSquad();
        setIsCreating(false);
        setSquadName('');
    };

    const handleJoinByLink = () => {
        if (!username.trim()) {
            setToast({
                type: 'error',
                message: 'Please enter your name before joining a squad',
                icon: '❌'
            });
            return;
        }
        if (!inviteLink.trim()) {
            setToast({
                type: 'error',
                message: 'Please enter an invite link',
                icon: '❌'
            });
            return;
        }

        try {
            const url = new URL(inviteLink);
            const squadId = url.searchParams.get('squad');
            
            if (!squadId) {
                setToast({
                    type: 'error',
                    message: 'Invalid invite link. Please check the link and try again.',
                    icon: '❌'
                });
                return;
            }

            onJoinSquad(squadId);
            setIsJoiningByLink(false);
            setInviteLink('');
            setToast({
                type: 'success',
                message: `Joining squad ${squadId}...`,
                icon: '🚀'
            });
        } catch (error) {
            setToast({
                type: 'error',
                message: 'Invalid invite link. Please check the link and try again.',
                icon: '❌'
            });
        }
    };

    // Extract squad ID from invite link for display
    const getSquadIdFromLink = (link) => {
        try {
            const url = new URL(link);
            return url.searchParams.get('squad');
        } catch (error) {
            return null;
        }
    };

    const detectedSquadId = getSquadIdFromLink(inviteLink);

    return (
        <div style={currentStyles.sidebar}>
            <div style={currentStyles.sidebarHeader}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                    <h2 style={currentStyles.sidebarTitle}>Poker Planning</h2>
                </div>
            </div>
            
            <div style={currentStyles.sidebarContent}>
                {/* Create Squad Form */}
                <div style={currentStyles.createRoomForm}>
                    <h3 style={currentStyles.formTitle}>Create New Squad</h3>
                    
                    <div style={currentStyles.formGroup}>
                        <label style={currentStyles.formLabel}>Your Name</label>
                        <input
                            type="text"
                            placeholder="Enter your name"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            style={currentStyles.sidebarInput}
                            onFocus={(e) => e.target.style.borderColor = '#ff6b35'}
                            onBlur={(e) => e.target.style.borderColor = isDarkMode ? '#505050' : '#4a5f7a'}
                        />
                    </div>
                    
                    <div style={currentStyles.formGroup}>
                        <label style={currentStyles.formLabel}>Squad Name (Optional)</label>
                        <input
                            type="text"
                            placeholder="Enter squad name"
                            value={squadName}
                            onChange={(e) => setSquadName(e.target.value)}
                            style={currentStyles.sidebarInput}
                            onFocus={(e) => e.target.style.borderColor = '#ff6b35'}
                            onBlur={(e) => e.target.style.borderColor = isDarkMode ? '#505050' : '#4a5f7a'}
                        />
                    </div>
                    
                    <button
                        style={{
                            ...currentStyles.button,
                            ...currentStyles.buttonPrimary,
                            width: '100%'
                        }}
                        onClick={handleCreateSquad}
                        disabled={!username.trim()}
                    >
                        ➕ Create Squad
                    </button>
                </div>

                {/* Join by Link Form */}
                <div style={currentStyles.createRoomForm}>
                    <h3 style={currentStyles.formTitle}>Join by Invite Link</h3>
                    
                    {!isJoiningByLink ? (
                        <button
                            style={{
                                ...currentStyles.button,
                                ...currentStyles.buttonSecondary,
                                width: '100%'
                            }}
                            onClick={() => setIsJoiningByLink(true)}
                        >
                            🔗 Join by Link
                        </button>
                    ) : (
                        <>
                            <div style={currentStyles.formGroup}>
                                <label style={currentStyles.formLabel}>Invite Link</label>
                                <input
                                    type="text"
                                    placeholder="Paste invite link here"
                                    value={inviteLink}
                                    onChange={(e) => setInviteLink(e.target.value)}
                                    style={currentStyles.sidebarInput}
                                    onFocus={(e) => e.target.style.borderColor = '#ff6b35'}
                                    onBlur={(e) => e.target.style.borderColor = isDarkMode ? '#505050' : '#4a5f7a'}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter' && inviteLink.trim() && username.trim()) {
                                            handleJoinByLink();
                                        }
                                    }}
                                />
                                {detectedSquadId && (
                                    <div style={{
                                        fontSize: '11px',
                                        color: isDarkMode ? '#90ee90' : '#27ae60',
                                        marginTop: '4px',
                                        padding: '4px 8px',
                                        background: isDarkMode ? '#2d4a2d' : '#d4edda',
                                        borderRadius: '4px',
                                        border: `1px solid ${isDarkMode ? '#4a7c4a' : '#c3e6cb'}`
                                    }}>
                                        ✅ Detected Squad ID: {detectedSquadId}
                                    </div>
                                )}
                                {inviteLink.trim() && !username.trim() && (
                                    <div style={{
                                        fontSize: '11px',
                                        color: isDarkMode ? '#ff6b6b' : '#e74c3c',
                                        marginTop: '4px',
                                        padding: '4px 8px',
                                        background: isDarkMode ? '#4a2d2d' : '#f8d7da',
                                        borderRadius: '4px',
                                        border: `1px solid ${isDarkMode ? '#7c4a4a' : '#f5c6cb'}`
                                    }}>
                                        ⚠️ Please enter your name above to join this squad
                                    </div>
                                )}
                            </div>
                            
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    style={{
                                        ...currentStyles.button,
                                        ...currentStyles.buttonPrimary,
                                        flex: 1
                                    }}
                                    onClick={handleJoinByLink}
                                    disabled={!username.trim() || !inviteLink.trim()}
                                    title={!username.trim() ? 'Please enter your name first' : !inviteLink.trim() ? 'Please enter an invite link' : ''}
                                >
                                    🚀 Join Squad
                                </button>
                                <button
                                    style={{
                                        ...currentStyles.button,
                                        ...currentStyles.buttonSecondary,
                                        padding: '10px 12px'
                                    }}
                                    onClick={() => {
                                        setIsJoiningByLink(false);
                                        setInviteLink('');
                                    }}
                                >
                                    ✕
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* Squad List */}
                <div>
                    <h3 style={{
                        ...currentStyles.formTitle,
                        marginTop: '30px'
                    }}>
                        Your Squads ({squads.length})
                    </h3>
                    
                    {squads.length === 0 ? (
                        <div style={currentStyles.emptyState}>
                            <div style={currentStyles.emptyStateIcon}>🏠</div>
                            <p style={{ color: isDarkMode ? '#bdc3c7' : '#666' }}>No squads yet</p>
                            <p style={{ fontSize: '12px', opacity: 0.7, color: isDarkMode ? '#bdc3c7' : '#666' }}>
                                Create a squad or join one to get started
                            </p>
                        </div>
                    ) : (
                        <div>
                            {squads.map(squad => (
                                <div
                                    key={squad.id}
                                    style={{
                                        ...currentStyles.roomItem,
                                        ...(activeSquadId === squad.id ? currentStyles.roomItemActive : {})
                                    }}
                                    onClick={() => onJoinSquad(squad.id)}
                                    onMouseEnter={(e) => {
                                        if (activeSquadId !== squad.id) {
                                            e.target.style.background = '#ff6b35';
                                            e.target.style.transform = 'translateY(-1px)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (activeSquadId !== squad.id) {
                                            e.target.style.background = isDarkMode ? '#404040' : '#404040';
                                            e.target.style.transform = 'none';
                                        }
                                    }}
                                >
                                    <div style={currentStyles.roomName}>
                                        {squad.name}
                                        {squad.isOwner && (
                                            <span style={{
                                                ...currentStyles.roomBadge,
                                                background: '#e62222',
                                                marginLeft: '8px'
                                            }}>
                                                Owner
                                            </span>
                                        )}
                                    </div>
                                    <div style={currentStyles.roomInfo}>
                                        <span>{squad.userCount} {squad.userCount === 1 ? 'user' : 'users'}</span>
                                        <span style={{ fontSize: '10px', opacity: 0.7 }}>
                                            ID: {squad.id}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Sidebar; 