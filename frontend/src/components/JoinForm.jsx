import React from 'react';
import { fullScreenStyles } from '../styles/styles';

export default function JoinForm({
                                     username, setUsername, roomId, setRoomId, created, createRoom, joinRoom
                                 }) {
    return (
        <div style={fullScreenStyles.form}>
            {created && <h2 style={fullScreenStyles.roomInfo}>Room ID: {roomId}</h2>}

            <input
                placeholder="Your name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={fullScreenStyles.input}
            />

            {!created && (
                <input
                    placeholder="Room ID"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                    style={fullScreenStyles.input}
                />
            )}

            {!created ? (
                <>
                    <button style={fullScreenStyles.button} onClick={joinRoom}>Join Room</button>
                    <button
                        style={{ ...fullScreenStyles.button, ...fullScreenStyles.buttonSecondary }}
                        onClick={createRoom}
                    >
                        Create New Room
                    </button>
                </>
            ) : (
                <button style={fullScreenStyles.button} onClick={joinRoom}>
                    Join Created Room
                </button>
            )}
        </div>
    );
}
