import mongoose from 'mongoose';

const { Schema } = mongoose;

const commitSchema = new Schema(
  { sha: String, message: String, author: String, date: Date },
  { _id: false }
);

const projectSchema = new Schema(
  {
    repoKey: { type: String, required: true, index: true }, // "owner/name", lowercased
    repoUrl: { type: String, required: true },
    owner: { type: String, required: true },
    name: { type: String, required: true },
    defaultBranch: { type: String, required: true },
    metadata: {
      description: String,
      homepage: String,
      language: String,
      topics: [String],
      stars: Number,
      forks: Number,
      openIssues: Number,
      license: String,
      archived: Boolean,
      repoCreatedAt: Date,
      pushedAt: Date,
      languages: [{ _id: false, name: String, percent: Number }],
    },
    commits: [commitSchema], // sanitized, authors anonymized
    contributorCount: Number,
    fileTree: [String], // sanitized, capped
    totalFiles: Number,
    treeTruncated: Boolean,
    signals: Schema.Types.Mixed,
    documentation: {
      source: { type: String, enum: ['none', 'text', 'file', 'both'], default: 'none' },
      filename: String,
      content: String, // sanitized + length-limited text
      truncated: Boolean,
    },
    docHash: { type: String, required: true },
    // Cache window: a project (and its report) is reused until this time passes.
    // Not a TTL index on purpose - reports reference projects and must stay readable after refresh.
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

projectSchema.index({ repoKey: 1, docHash: 1, createdAt: -1 });

export default mongoose.model('Project', projectSchema);
