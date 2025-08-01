class ClassManager {
    constructor() {
        this.classes = new Map(); // classId -> ClassData
    }

    // Get or create class data
    getClassData(classId) {
        if (!this.classes.has(classId)) {
            this.classes.set(classId, {
                users: {},
                votes: {},
                myVote: null,
                voteCount: 0,
                totalUsers: 0,
                stats: null,
                isRevealed: false
            });
        }
        return this.classes.get(classId);
    }

    // Update users for a specific class
    updateUsers(classId, users) {
        const classData = this.getClassData(classId);
        classData.users = users;
        classData.totalUsers = Object.keys(users).length;
    }

    // Update votes for a specific class
    updateVotes(classId, votes) {
        const classData = this.getClassData(classId);
        classData.votes = votes;
        classData.voteCount = Object.keys(votes).length;
    }

    // Set my vote for a specific class
    setMyVote(classId, vote) {
        const classData = this.getClassData(classId);
        classData.myVote = vote;
        classData.votes = vote;
    }

    // Update stats for a specific class
    updateStats(classId, stats) {
        console.log('ClassManager.updateStats called with:', { classId, stats });
        const classData = this.getClassData(classId);
        classData.stats = stats;
        classData.isRevealed = true;
        console.log('After updateStats, class data:', { ...classData });
    }

    // Reset votes for a specific class
    resetVotes(classId) {
        console.log('ClassManager.resetVotes called with classId:', classId);
        const classData = this.getClassData(classId);
        console.log('Before reset:', { ...classData });
        classData.votes = {};
        classData.myVote = null;
        classData.voteCount = 0;
        classData.stats = null;
        classData.isRevealed = false;
        console.log('After reset:', { ...classData });
    }

    // Update vote count for a specific class
    updateVoteCount(classId, voteCount, totalUsers) {
        const classData = this.getClassData(classId);
        classData.voteCount = voteCount;
        classData.totalUsers = totalUsers;
    }

    // Remove a class completely
    removeClass(classId) {
        this.classes.delete(classId);
    }

    // Get all classes data (for debugging)
    getAllClasses() {
        return Object.fromEntries(this.classes);
    }
}

export default ClassManager; 