import mongoose from 'mongoose';

const stageTraceSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'success', 'failed', 'skipped'],
    default: 'pending'
  },
  startedAt: {
    type: Date,
    default: null
  },
  endedAt: {
    type: Date,
    default: null
  },
  durationMs: {
    type: Number,
    default: 0
  },
  inputSummary: {
    type: String,
    default: ''
  },
  output: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  retries: {
    type: Number,
    default: 0
  },
  error: {
    type: String,
    default: null
  },
  provider: {
    type: String,
    default: null
  },
  model: {
    type: String,
    default: null
  },
  fallbackUsed: {
    type: Boolean,
    default: false
  },
  fallbackWarning: {
    type: String,
    default: null
  },
  repairedTruncation: {
    type: Boolean,
    default: false
  }
}, { _id: false });

const workflowRunSchema = new mongoose.Schema({
  candidateId: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  jobDescription: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed'],
    default: 'pending'
  },
  stages: {
    type: [stageTraceSchema],
    default: []
  },
  resumeIntegrity: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  finalReport: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  }
}, {
  timestamps: true
});

const WorkflowRun = mongoose.model('WorkflowRun', workflowRunSchema);

export default WorkflowRun;
