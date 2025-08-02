class SquadManager {
    constructor() {
        this.squads = new Map(); // squadId -> SquadData
    }

    // Get or create squad data
    getSquadData(squadId) {
        if (!this.squads.has(squadId)) {
            this.squads.set(squadId, {
                users: {},
                votes: {},
                myVote: null,
                voteCount: 0,
                totalUsers: 0,
                stats: null,
                isRevealed: false
            });
        }
        return this.squads.get(squadId);
    }

    // Update users for a specific squad
    updateUsers(squadId, users) {
        const squadData = this.getSquadData(squadId);
        squadData.users = users;
        squadData.totalUsers = Object.keys(users).length;
    }

    // Update votes for a specific squad
    updateVotes(squadId, votes) {
        const squadData = this.getSquadData(squadId);
        squadData.votes = votes;
        squadData.voteCount = Object.keys(votes).length;
    }

    // Set my vote for a specific squad
    setMyVote(squadId, vote) {
        const squadData = this.getSquadData(squadId);
        squadData.myVote = vote;
        squadData.votes = vote;
    }

    // Update stats for a specific squad
    updateStats(squadId, stats) {
        console.log('SquadManager.updateStats called with:', { squadId, stats });
        const squadData = this.getSquadData(squadId);
        squadData.stats = stats;
        squadData.isRevealed = true;
        console.log('After updateStats, squad data:', { ...squadData });
    }

    // Reset votes for a specific squad
    resetVotes(squadId) {
        console.log('SquadManager.resetVotes called with squadId:', squadId);
        const squadData = this.getSquadData(squadId);
        console.log('Before reset:', { ...squadData });
        squadData.votes = {};
        squadData.myVote = null;
        squadData.voteCount = 0;
        squadData.stats = null;
        squadData.isRevealed = false;
        console.log('After reset:', { ...squadData });
    }

    // Update vote count for a specific squad
    updateVoteCount(squadId, voteCount, totalUsers) {
        const squadData = this.getSquadData(squadId);
        squadData.voteCount = voteCount;
        squadData.totalUsers = totalUsers;
    }

    // Remove a squad completely
    removeSquad(squadId) {
        this.squads.delete(squadId);
    }

    // Get all squads data (for debugging)
    getAllSquads() {
        return Object.fromEntries(this.squads);
    }
}

export default SquadManager; 