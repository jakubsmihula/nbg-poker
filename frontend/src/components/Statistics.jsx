import React from 'react';
import { desktopStyles, darkTheme } from '../styles/styles';

const Statistics = ({ stats, isDarkMode = false }) => {
    if (!stats) return null;
    const currentStyles = isDarkMode ? darkTheme : desktopStyles;

    return (
        <div style={currentStyles.card}>
            <h3 style={currentStyles.sectionTitle}>📊 Vote Statistics</h3>
            
            <div style={currentStyles.statsGrid}>
                <div style={currentStyles.statCard}>
                    <div style={currentStyles.statValue}>{stats.average}</div>
                    <div style={currentStyles.statLabel}>Average</div>
                </div>

                <div style={currentStyles.statCard}>
                    <div style={currentStyles.statValue}>{stats.agreement}%</div>
                    <div style={currentStyles.statLabel}>Agreement</div>
                </div>

                <div style={currentStyles.statCard}>
                    <div style={currentStyles.statValue}>{stats.totalVotes}</div>
                    <div style={currentStyles.statLabel}>Total Votes</div>
                </div>

                <div style={currentStyles.statCard}>
                    <div style={currentStyles.statValue}>{stats.minVote} - {stats.maxVote}</div>
                    <div style={currentStyles.statLabel}>Range</div>
                </div>
            </div>

            {stats.agreement === 100 && (
                <div style={{
                    background: isDarkMode ? '#2d5a2d' : '#d4edda',
                    border: `1px solid ${isDarkMode ? '#4a7c4a' : '#c3e6cb'}`,
                    borderRadius: '6px',
                    padding: '15px',
                    marginTop: '20px',
                    color: isDarkMode ? '#90ee90' : '#155724',
                    fontWeight: 'bold',
                    textAlign: 'center'
                }}>
                    🎉 Excellent! Team is perfectly aligned!
                </div>
            )}

            {stats.agreement === 0 && stats.totalVotes > 1 && (
                <div style={{
                    background: isDarkMode ? '#5a4a2d' : '#fff3cd',
                    border: `1px solid ${isDarkMode ? '#7c6a4a' : '#ffeaa7'}`,
                    borderRadius: '6px',
                    padding: '15px',
                    marginTop: '20px',
                    color: isDarkMode ? '#ffd700' : '#856404',
                    fontWeight: 'bold',
                    textAlign: 'center'
                }}>
                    ⚠️ Team needs discussion - votes are spread out
                </div>
            )}
        </div>
    );
};

export default Statistics; 