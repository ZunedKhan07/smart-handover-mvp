import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    repoUrl: {
        type: String,
        required: true
    },
    completionPercentage: {
        type: Number,
        required: true
    },
    completedTasks: {
        type: [String],
        default: []
    },
    pendingTasks: {
        type: [String],
        default: []
    },
    moduleBreakdown: {
        type: Object,
        default: {}
    },
    isApproved: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('Report', reportSchema);