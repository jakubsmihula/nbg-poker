import React from 'react';
import { fullScreenStyles } from '../styles/styles';

export default function ParticipantsList({ users }) {
    return (
        <ul style={fullScreenStyles.participantList}>
            {Object.values(users).map((user, index) => (
                <li key={index} style={fullScreenStyles.participantItem}>
                    {user}
                </li>
            ))}
        </ul>
    );
}
