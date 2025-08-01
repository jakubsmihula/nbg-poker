import React from 'react';
import { fullScreenStyles } from '../styles/styles';

export default function MessageBox({ message }) {
    return message && <div style={fullScreenStyles.messageBox}>{message}</div>;
}
