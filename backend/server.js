import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
    },
});

const classes = {};
const userClasses = {}; // Track which classes each user has access to
let classCounter = 1;

// Helper function to calculate statistics
const calculateStats = (votes, users) => {
    const voteValues = Object.values(votes).filter(vote => vote !== '?' && !isNaN(vote));
    
    if (voteValues.length === 0) {
        return { average: 0, agreement: 0, totalVotes: 0 };
    }

    const average = voteValues.reduce((sum, vote) => sum + parseInt(vote), 0) / voteValues.length;
    
    // Calculate agreement percentage (votes within 1 point of each other)
    const sortedVotes = voteValues.sort((a, b) => a - b);
    const minVote = Math.min(...voteValues);
    const maxVote = Math.max(...voteValues);
    const agreement = maxVote - minVote <= 1 ? 100 : 0;
    
    return {
        average: Math.round(average * 10) / 10,
        agreement,
        totalVotes: voteValues.length,
        minVote,
        maxVote
    };
};

// Helper function to notify users about class removal
const notifyClassRemoval = (classId, className) => {
    // Find all users who had access to this class
    for (const userId in userClasses) {
        if (userClasses[userId] && userClasses[userId].includes(classId)) {
            const userSocket = io.sockets.sockets.get(userId);
            if (userSocket) {
                // Remove the class from user's accessible classes
                userClasses[userId] = userClasses[userId].filter(id => id !== classId);
                
                // Send classRemoved event
                userSocket.emit('classRemoved', classId, className);
                
                // Update user's class list (only include classes that still exist)
                const userAccessibleClasses = userClasses[userId].map(classId => ({
                    id: classId,
                    name: classes[classId]?.name || 'Unknown Class',
                    userCount: Object.keys(classes[classId]?.users || {}).length,
                    isOwner: classes[classId]?.createdBy === userId
                })).filter(cls => classes[cls.id]); // Only include classes that still exist in the classes object
                userSocket.emit('userClasses', userAccessibleClasses);
            }
        }
    }
};

io.on('connection', (socket) => {
    console.log('user connected:', socket.id);

    // Send user's accessible classes
    const sendUserClasses = (userId) => {
        const userAccessibleClasses = userClasses[userId] || [];
        const classDetails = userAccessibleClasses.map(classId => ({
            id: classId,
            name: classes[classId]?.name || 'Unknown Class',
            userCount: Object.keys(classes[classId]?.users || {}).length,
            isOwner: classes[classId]?.createdBy === userId
        }));
        socket.emit('userClasses', classDetails);
    };

    socket.on('createClass', (className, username) => {
        const classId = generateClassId();
        const finalClassName = className || `Class ${classCounter++}`;
        
        classes[classId] = {
            name: finalClassName,
            users: {},
            votes: {},
            createdBy: socket.id
        };

        classes[classId].users[socket.id] = username;
        socket.join(classId);

        // Add class to user's accessible classes
        if (!userClasses[socket.id]) {
            userClasses[socket.id] = [];
        }
        userClasses[socket.id].push(classId);

        socket.emit('classCreated', classId, finalClassName);
        socket.emit('joined');
        sendUserClasses(socket.id);

        io.to(classId).emit('classData', classes[classId].users);
    });

    socket.on('joinClass', (classId, username) => {
        if (!classes[classId]) {
            socket.emit('error', 'Class not found');
            return;
        }

        classes[classId].users[socket.id] = username;
        socket.join(classId);

        // Add class to user's accessible classes if not already there
        if (!userClasses[socket.id]) {
            userClasses[socket.id] = [];
        }
        if (!userClasses[socket.id].includes(classId)) {
            userClasses[socket.id].push(classId);
        }

        socket.emit('joined');
        sendUserClasses(socket.id);
        io.to(classId).emit('classData', classes[classId].users);
    });

    socket.on('vote', (vote, classId) => {
        if (!classId || !classes[classId]) return;

        classes[classId].votes[socket.id] = vote;

        const votesCount = Object.keys(classes[classId].votes).length;
        const totalUsers = Object.keys(classes[classId].users).length;

        io.to(classId).emit('voteUpdate', votesCount, totalUsers, classId);
    });

    socket.on('revealVotes', (classId) => {
        console.log('revealVotes event received for classId:', classId);
        if (!classId || !classes[classId]) {
            console.log('Class not found or invalid classId');
            return;
        }

        const stats = calculateStats(classes[classId].votes, classes[classId].users);
        console.log('Emitting revealVotes with data:', {
            votes: classes[classId].votes,
            users: classes[classId].users,
            stats,
            classId
        });
        io.to(classId).emit('revealVotes', classes[classId].votes, classes[classId].users, stats, classId);
    });

    socket.on('resetVotes', (classId) => {
        if (!classId || !classes[classId]) return;

        classes[classId].votes = {};
        io.to(classId).emit('resetVotes', classId);
    });

    socket.on('getUserClasses', () => {
        sendUserClasses(socket.id);
    });

    socket.on('leaveClass', (targetClassId) => {
        if (!classes[targetClassId] || !classes[targetClassId].users[socket.id]) {
            return; // User is not in this class
        }

        const wasOwner = classes[targetClassId].createdBy === socket.id;
        const className = classes[targetClassId].name;
        
        // Remove user from the specific class
        delete classes[targetClassId].users[socket.id];
        delete classes[targetClassId].votes[socket.id];
        socket.leave(targetClassId);
        
        // Remove class from user's accessible classes FIRST
        if (userClasses[socket.id]) {
            userClasses[socket.id] = userClasses[socket.id].filter(id => id !== targetClassId);
        }

        // If class is empty, delete it and notify all users
        if (Object.keys(classes[targetClassId].users).length === 0) {
            delete classes[targetClassId];
            notifyClassRemoval(targetClassId, className);
        } else {
            // If the owner left, transfer ownership to the first remaining user
            if (wasOwner) {
                const remainingUsers = Object.keys(classes[targetClassId].users);
                if (remainingUsers.length > 0) {
                    classes[targetClassId].createdBy = remainingUsers[0];
                }
            }
            io.to(targetClassId).emit('classData', classes[targetClassId].users);

            // Update class lists for all users who have access to this class
            for (const userId in userClasses) {
                if (userClasses[userId] && userClasses[userId].includes(targetClassId)) {
                    const userSocket = io.sockets.sockets.get(userId);
                    if (userSocket) {
                        const userAccessibleClasses = userClasses[userId].map(classId => ({
                            id: classId,
                            name: classes[classId]?.name || 'Unknown Class',
                            userCount: Object.keys(classes[classId]?.users || {}).length,
                            isOwner: classes[classId]?.createdBy === userId
                        })).filter(cls => classes[cls.id]); // Only include classes that still exist
                        userSocket.emit('userClasses', userAccessibleClasses);
                    }
                }
            }
        }

        // Send updated class list to the user who left
        sendUserClasses(socket.id);
    });

        socket.on('disconnect', () => {
        // Find which class the user was in
        for (const classId in classes) {
            if (classes[classId].users[socket.id]) {
                const wasOwner = classes[classId].createdBy === socket.id;
                const className = classes[classId].name;
                delete classes[classId].users[socket.id];
                delete classes[classId].votes[socket.id];
                
                // If class is empty, delete it and notify all users
                if (Object.keys(classes[classId].users).length === 0) {
                    delete classes[classId];
                    notifyClassRemoval(classId, className);
                } else {
                    // If the owner left, transfer ownership to the first remaining user
                    if (wasOwner) {
                        const remainingUsers = Object.keys(classes[classId].users);
                        if (remainingUsers.length > 0) {
                            classes[classId].createdBy = remainingUsers[0];
                        }
                    }
                    io.to(classId).emit('classData', classes[classId].users);

                // Update class lists for all users who have access to this class
                for (const userId in userClasses) {
                    if (userClasses[userId] && userClasses[userId].includes(classId)) {
                        const userSocket = io.sockets.sockets.get(userId);
                        if (userSocket) {
                            const userAccessibleClasses = userClasses[userId].map(classId => ({
                                id: classId,
                                name: classes[classId]?.name || 'Unknown Class',
                                userCount: Object.keys(classes[classId]?.users || {}).length,
                                isOwner: classes[classId]?.createdBy === userId
                            })).filter(cls => classes[cls.id]); // Only include classes that still exist
                            userSocket.emit('userClasses', userAccessibleClasses);
                        }
                    }
                }
                }

                // Remove class from user's accessible classes
                if (userClasses[socket.id]) {
                    userClasses[socket.id] = userClasses[socket.id].filter(id => id !== classId);
                }
                break;
            }
        }
        
        // Clean up user's class access
        delete userClasses[socket.id];
    });
});

function generateClassId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

server.listen(3000, () => {
    console.log('listening on *:3000');
});
