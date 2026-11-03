import mongoose from 'mongoose';

const { Schema } = mongoose;

const moduleSchema = new Schema(
  {
    module: { type: String, required: true },
    status: { type: String, enum: ['completed', 'in-progress', 'pending', 'unknown'], default: 'unknown' },
    description: String,
    evidence: [String],
  },
  { _id: false }
);

const riskSchema = new Schema(
  {
    description: { type: String, required: true },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  },
  { _id: false }
);

const reportSchema = new Schema(
  {
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    completionPercentage: { type: Number, min: 0, max: 100, required: true },
    completionBasis: String,
    confidence: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
    projectSummary: { type: String, required: true },
    completedTasks: [String],
    pendingTasks: [String],
    moduleBreakdown: [moduleSchema],
    identifiedRisks: [riskSchema],
    recommendations: [String],
    testingStatus: String,
    documentationStatus: String,
    deploymentStatus: String,
    verifiedFacts: [String], // computed by the server from GitHub data
    inferredObservations: [String], // AI inference - not proof
    uncertainties: [String],
    roleBasedTasks: {
      frontend: [String],
      backend: [String],
      database: [String],
      devops: [String],
      general: [String],
    },
    approvalStatus: { type: String, enum: ['pending', 'approved'], default: 'pending' },
    approvedAt: Date,
    isEdited: { type: Boolean, default: false },
    editedAt: Date,
    generatedBy: String,
  },
  { timestamps: true }
);

export default mongoose.model('Report', reportSchema);
