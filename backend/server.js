import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';


const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
    },
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Serve static files from frontend/dist
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});


const squads = {};
const userSquads = {}; // Track which squads each user has access to
let squadCounter = 1;

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

// Helper function to notify users about squad removal
const notifySquadRemoval = (squadId, squadName) => {
    // Find all users who had access to this squad
    for (const userId in userSquads) {
        if (userSquads[userId] && userSquads[userId].includes(squadId)) {
            const userSocket = io.sockets.sockets.get(userId);
            if (userSocket) {
                // Remove the squad from user's accessible squads
                userSquads[userId] = userSquads[userId].filter(id => id !== squadId);
                
                // Send squadRemoved event
                userSocket.emit('squadRemoved', squadId, squadName);
                
                // Update user's squad list (only include squads that still exist)
                const userAccessibleSquads = userSquads[userId].map(squadId => ({
                    id: squadId,
                    name: squads[squadId]?.name || 'Unknown Squad',
                    userCount: Object.keys(squads[squadId]?.users || {}).length,
                    isOwner: squads[squadId]?.createdBy === userId
                })).filter(squad => squads[squad.id]); // Only include squads that still exist in the squads object
                userSocket.emit('userSquads', userAccessibleSquads);
            }
        }
    }
};

io.on('connection', (socket) => {
    console.log('user connected:', socket.id);

    // Send user's accessible squads
    const sendUserSquads = (userId) => {
        const userAccessibleSquads = userSquads[userId] || [];
        const squadDetails = userAccessibleSquads.map(squadId => ({
            id: squadId,
            name: squads[squadId]?.name || 'Unknown Squad',
            userCount: Object.keys(squads[squadId]?.users || {}).length,
            isOwner: squads[squadId]?.createdBy === userId
        }));
        socket.emit('userSquads', squadDetails);
    };

    socket.on('createSquad', (squadName, username) => {
        const squadId = generateSquadId();
        const finalSquadName = squadName || `Squad ${squadCounter++}`;
        
        squads[squadId] = {
            name: finalSquadName,
            users: {},
            votes: {},
            createdBy: socket.id
        };

        squads[squadId].users[socket.id] = username;
        socket.join(squadId);

        // Add squad to user's accessible squads
        if (!userSquads[socket.id]) {
            userSquads[socket.id] = [];
        }
        userSquads[socket.id].push(squadId);

        socket.emit('squadCreated', squadId, finalSquadName);
        socket.emit('joined');
        sendUserSquads(socket.id);

        io.to(squadId).emit('squadData', squads[squadId].users);
    });

    socket.on('joinSquad', (squadId, username) => {
        if (!squads[squadId]) {
            socket.emit('error', 'Squad not found');
            return;
        }

        squads[squadId].users[socket.id] = username;
        socket.join(squadId);

        // Add squad to user's accessible squads if not already there
        if (!userSquads[socket.id]) {
            userSquads[socket.id] = [];
        }
        if (!userSquads[socket.id].includes(squadId)) {
            userSquads[socket.id].push(squadId);
        }

        socket.emit('joined');
        sendUserSquads(socket.id);
        io.to(squadId).emit('squadData', squads[squadId].users);
    });

    socket.on('vote', (vote, squadId) => {
        if (!squadId || !squads[squadId]) return;

        squads[squadId].votes[socket.id] = vote;

        const votesCount = Object.keys(squads[squadId].votes).length;
        const totalUsers = Object.keys(squads[squadId].users).length;

        io.to(squadId).emit('voteUpdate', votesCount, totalUsers, squadId);
    });

    socket.on('revealVotes', (squadId) => {
        console.log('revealVotes event received for squadId:', squadId);
        if (!squadId || !squads[squadId]) {
            console.log('Squad not found or invalid squadId');
            return;
        }

        const stats = calculateStats(squads[squadId].votes, squads[squadId].users);
        console.log('Emitting revealVotes with data:', {
            votes: squads[squadId].votes,
            users: squads[squadId].users,
            stats,
            squadId
        });
        io.to(squadId).emit('revealVotes', squads[squadId].votes, squads[squadId].users, stats, squadId);
    });

    socket.on('resetVotes', (squadId) => {
        if (!squadId || !squads[squadId]) return;

        squads[squadId].votes = {};
        io.to(squadId).emit('resetVotes', squadId);
    });

    socket.on('getUserSquads', () => {
        sendUserSquads(socket.id);
    });

    socket.on('leaveSquad', (targetSquadId) => {
        if (!squads[targetSquadId] || !squads[targetSquadId].users[socket.id]) {
            return; // User is not in this squad
        }

        const wasOwner = squads[targetSquadId].createdBy === socket.id;
        const squadName = squads[targetSquadId].name;
        
        // Remove user from the specific squad
        delete squads[targetSquadId].users[socket.id];
        delete squads[targetSquadId].votes[socket.id];
        socket.leave(targetSquadId);
        
        // Remove squad from user's accessible squads FIRST
        if (userSquads[socket.id]) {
            userSquads[socket.id] = userSquads[socket.id].filter(id => id !== targetSquadId);
        }

        // If squad is empty, delete it and notify all users
        if (Object.keys(squads[targetSquadId].users).length === 0) {
            delete squads[targetSquadId];
            notifySquadRemoval(targetSquadId, squadName);
        } else {
            // If the owner left, transfer ownership to the first remaining user
            if (wasOwner) {
                const remainingUsers = Object.keys(squads[targetSquadId].users);
                if (remainingUsers.length > 0) {
                    squads[targetSquadId].createdBy = remainingUsers[0];
                }
            }
            io.to(targetSquadId).emit('squadData', squads[targetSquadId].users);

            // Update squad lists for all users who have access to this squad
            for (const userId in userSquads) {
                if (userSquads[userId] && userSquads[userId].includes(targetSquadId)) {
                    const userSocket = io.sockets.sockets.get(userId);
                    if (userSocket) {
                        const userAccessibleSquads = userSquads[userId].map(squadId => ({
                            id: squadId,
                            name: squads[squadId]?.name || 'Unknown Squad',
                            userCount: Object.keys(squads[squadId]?.users || {}).length,
                            isOwner: squads[squadId]?.createdBy === userId
                        })).filter(squad => squads[squad.id]); // Only include squads that still exist
                        userSocket.emit('userSquads', userAccessibleSquads);
                    }
                }
            }
        }

        // Send updated squad list to the user who left
        sendUserSquads(socket.id);
    });

        socket.on('disconnect', () => {
        // Find which squad the user was in
        for (const squadId in squads) {
            if (squads[squadId].users[socket.id]) {
                const wasOwner = squads[squadId].createdBy === socket.id;
                const squadName = squads[squadId].name;
                delete squads[squadId].users[socket.id];
                delete squads[squadId].votes[socket.id];
                
                // If squad is empty, delete it and notify all users
                if (Object.keys(squads[squadId].users).length === 0) {
                    delete squads[squadId];
                    notifySquadRemoval(squadId, squadName);
                } else {
                    // If the owner left, transfer ownership to the first remaining user
                    if (wasOwner) {
                        const remainingUsers = Object.keys(squads[squadId].users);
                        if (remainingUsers.length > 0) {
                            squads[squadId].createdBy = remainingUsers[0];
                        }
                    }
                    io.to(squadId).emit('squadData', squads[squadId].users);

                // Update squad lists for all users who have access to this squad
                for (const userId in userSquads) {
                    if (userSquads[userId] && userSquads[userId].includes(squadId)) {
                        const userSocket = io.sockets.sockets.get(userId);
                        if (userSocket) {
                            const userAccessibleSquads = userSquads[userId].map(squadId => ({
                                id: squadId,
                                name: squads[squadId]?.name || 'Unknown Squad',
                                userCount: Object.keys(squads[squadId]?.users || {}).length,
                                isOwner: squads[squadId]?.createdBy === userId
                            })).filter(squad => squads[squad.id]); // Only include squads that still exist
                            userSocket.emit('userSquads', userAccessibleSquads);
                        }
                    }
                }
                }

                // Remove squad from user's accessible squads
                if (userSquads[socket.id]) {
                    userSquads[socket.id] = userSquads[socket.id].filter(id => id !== squadId);
                }
                break;
            }
        }
        
        // Clean up user's squad access
        delete userSquads[socket.id];
    });
});

function generateSquadId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

server.listen(3000, () => {
    console.log('listening on *:3000');
});
