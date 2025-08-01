import React from 'react';
import { fullScreenStyles } from '../styles/styles';

const RoomList = ({ rooms, onJoinRoom, onCreateRoom, username, setUsername, roomName, setRoomName }) => {
    return (
        <div style={fullScreenStyles.form}>
            <h2 style={fullScreenStyles.roomInfo}>Available Rooms</h2>
            
            {/* Create Room Section */}
            <div style={{ marginBottom: '30px', padding: '20px', background: '#fff5f2', borderRadius: '15px' }}>
                <h3 style={fullScreenStyles.subtitle}>Create New Room</h3>
                <input
                    placeholder="Your name"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={fullScreenStyles.input}
                />
                <input
                    placeholder="Room name (optional)"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    style={fullScreenStyles.input}
                />
                <button 
                    style={fullScreenStyles.button}
                    onClick={onCreateRoom}
                    disabled={!username.trim()}
                >
                    Create Room
                </button>
            </div>

            {/* Join Room Section */}
            <div style={{ marginBottom: '30px', padding: '20px', background: '#fff5f2', borderRadius: '15px' }}>
                <h3 style={fullScreenStyles.subtitle}>Join Existing Room</h3>
                {rooms.length === 0 ? (
                    <p style={{ color: '#ff6b35', textAlign: 'center' }}>No rooms available. Create one above!</p>
                ) : (
                    <div style={{ display: 'grid', gap: '10px' }}>
                        {rooms.map(room => (
                            <div 
                                key={room.id} 
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '15px',
                                    background: 'white',
                                    borderRadius: '10px',
                                    border: '2px solid #ffd7c4',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease'
                                }}
                                onClick={() => onJoinRoom(room.id)}
                                onMouseEnter={(e) => {
                                    e.target.style.borderColor = '#ff6b35';
                                    e.target.style.transform = 'translateY(-2px)';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.borderColor = '#ffd7c4';
                                    e.target.style.transform = 'none';
                                }}
                            >
                                <div>
                                    <h4 style={{ margin: 0, color: '#ff6b35', fontWeight: '600' }}>
                                        {room.name}
                                    </h4>
                                    <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>
                                        ID: {room.id}
                                    </p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <span style={{ 
                                        background: '#ff6b35', 
                                        color: 'white', 
                                        padding: '5px 10px', 
                                        borderRadius: '15px',
                                        fontSize: '12px',
                                        fontWeight: 'bold'
                                    }}>
                                        {room.userCount} {room.userCount === 1 ? 'user' : 'users'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RoomList; 