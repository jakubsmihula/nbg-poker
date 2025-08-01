import React, { useEffect } from 'react';
import { desktopStyles, darkTheme } from '../styles/styles';

export default function VotePanel({ myVote, sendVote, votes, onRevealVotes, voteCount, totalUsers, isDarkMode = false, isRevealed = false }) {
    const options = [1, 2, 3, 5, 8, 13, 21];
    const currentStyles = isDarkMode ? darkTheme : desktopStyles;

    // Force re-render when theme changes to ensure proper styling
    useEffect(() => {
        // This will trigger a re-render when isDarkMode changes
    }, [isDarkMode]);

    const getVoteButtonStyle = (option) => {
        const baseStyle = {
            ...currentStyles.voteButton,
            // Only override the color properties, preserve all other styles
            background: isDarkMode ? '#2d2d2d' : 'white',
            color: isDarkMode ? '#e0e0e0' : '#2c3e50',
            borderColor: isDarkMode ? '#404040' : '#ddd',
        };

        if (myVote === option) {
            return {
                ...baseStyle,
                ...currentStyles.voteButtonSelected,
                background: '#ff6b35',
                color: 'white',
                borderColor: '#ff6b35',
            };
        }

        if (isRevealed) {
            return {
                ...baseStyle,
                ...currentStyles.voteButtonDisabled,
                background: isDarkMode ? '#404040' : '#f5f5f5',
                color: isDarkMode ? '#666' : '#ccc',
                borderColor: isDarkMode ? '#404040' : '#ddd',
            };
        }

        return baseStyle;
    };

    return (
        <div style={currentStyles.card}>
            <h3 style={currentStyles.sectionTitle}>🗳️ Cast Your Vote</h3>

            <div style={currentStyles.voteGrid}>
                {options.map((option) => {
                    const buttonStyle = getVoteButtonStyle(option);

                    return (
                    <button
                        key={option}
                            style={buttonStyle}
                        disabled={isRevealed}
                        onClick={() => sendVote(option)}
                        onMouseEnter={(e) => {
                            if (!isRevealed && myVote !== option) {
                                e.target.style.borderColor = '#3498db';
                                e.target.style.transform = 'scale(1.05)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (myVote !== option) {
                                    // Reset to the proper theme border color
                                    const defaultBorderColor = isDarkMode ? '#404040' : '#ddd';
                                    e.target.style.borderColor = defaultBorderColor;
                                e.target.style.transform = 'none';

                                    // Also reset background and color to ensure proper theme
                                    if (!isRevealed) {
                                        e.target.style.background = isDarkMode ? '#2d2d2d' : 'white';
                                        e.target.style.color = isDarkMode ? '#e0e0e0' : '#2c3e50';
                                    } else {
                                        // Ensure disabled state is properly applied
                                        e.target.style.background = isDarkMode ? '#404040' : '#f5f5f5';
                                        e.target.style.color = isDarkMode ? '#666' : '#ccc';
                                    }
                            }
                        }}
                    >
                        {option}
                    </button>
                    );
                })}
            </div>

            {voteCount > 0 && !isRevealed && (
                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                    <p style={{
                        color: '#3498db',
                        marginBottom: '15px',
                        fontSize: '16px',
                        fontWeight: '500'
                    }}>
                        📊 Votes: {voteCount} / {totalUsers}
                    </p>
                    <button
                        style={{
                            ...currentStyles.button,
                            ...currentStyles.buttonSuccess,
                            padding: '12px 24px',
                            fontSize: '16px'
                        }}
                        onClick={onRevealVotes}
                        onMouseEnter={(e) => {
                            e.target.style.backgroundColor = '#229954';
                            e.target.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.backgroundColor = '#27ae60';
                            e.target.style.transform = 'none';
                        }}
                    >
                        🔍 Reveal Votes
                    </button>
                </div>
            )}
        </div>
    );
}
