import mongoose from 'mongoose';

const candidateSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  rawText: {
    type: String,
    required: true
  },
  pageCount: {
    type: Number,
    default: 1
  },
  charCount: {
    type: Number,
    default: 0
  },
  parsedProfile: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  }
}, {
  timestamps: true
});

const Candidate = mongoose.model('Candidate', candidateSchema);

export default Candidate;
