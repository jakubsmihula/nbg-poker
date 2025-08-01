import React from 'react';
import { fullScreenStyles } from '../styles/styles';

export default function ResultsList({ votes = {} , users = {}}) {
    return (
        <ul style={fullScreenStyles.resultsList}>
            {Object.entries(votes).map(([id, vote], index) => (
                <li key={index} style={fullScreenStyles.resultItem}>
                    <span>{users[id] || id}</span>
                    <span>{vote}</span>
                </li>
            ))}
        </ul>

    );
}
