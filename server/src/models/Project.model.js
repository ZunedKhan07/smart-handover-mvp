import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
    repoUrl: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    owner: {
        type: String,
        required: true
    },
    repoName: {
        type: String,
        required: true
    },
    anonymizedStructure: {
        type: Object,
        required: true
    },
    commitLogs: {
        type: Array,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        // Yeh TTL index 24 ghante (86400 seconds) baad document ko auto-delete kar dega
        expires: 86400 
    }
});

export default mongoose.model('Project', projectSchema);