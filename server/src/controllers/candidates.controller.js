import fs from 'fs';
import mongoose from 'mongoose';
import Candidate from '../models/Candidate.js';
import { extractTextFromPDF } from '../services/pdf.service.js';

// In-memory fallback cache if MongoDB is offline
const memoryCandidates = new Map();

export async function uploadCandidate(req, res, next) {
  try {
    if (!req.file) {
      const error = new Error('No PDF file uploaded. Please attach a resume PDF.');
      error.statusCode = 400;
      error.code = 'NO_FILE_PROVIDED';
      error.isPublic = true;
      throw error;
    }

    let rawText, pageCount, charCount;
    try {
      const extraction = await extractTextFromPDF(req.file.path);
      rawText = extraction.rawText;
      pageCount = extraction.pageCount;
      charCount = extraction.charCount;
    } finally {
      // Clean up uploaded temporary PDF file immediately to prevent ephemeral disk overflow
      fs.unlink(req.file.path, (unlinkErr) => {
        if (unlinkErr && unlinkErr.code !== 'ENOENT') {
          console.warn(`[Upload Cleanup] Failed to delete temp upload file ${req.file.path}:`, unlinkErr.message);
        }
      });
    }

    const isDbConnected = mongoose.connection.readyState === 1;
    let savedCandidate;

    if (isDbConnected) {
      savedCandidate = await Candidate.create({
        fileName: req.file.originalname,
        filePath: req.file.path,
        fileSize: req.file.size,
        rawText,
        pageCount,
        charCount
      });
    } else {
      const fallbackId = `mem_cand_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      savedCandidate = {
        _id: fallbackId,
        fileName: req.file.originalname,
        filePath: req.file.path,
        fileSize: req.file.size,
        rawText,
        pageCount,
        charCount,
        createdAt: new Date().toISOString()
      };
      memoryCandidates.set(fallbackId, savedCandidate);
    }

    return res.status(201).json({
      candidateId: savedCandidate._id.toString(),
      fileName: savedCandidate.fileName,
      pageCount: savedCandidate.pageCount,
      charCount: savedCandidate.charCount,
      rawTextPreview: rawText.substring(0, 350) + (rawText.length > 350 ? '...' : ''),
      rawText
    });
  } catch (err) {
    next(err);
  }
}

export async function getCandidateById(req, res, next) {
  try {
    const { id } = req.params;
    const isDbConnected = mongoose.connection.readyState === 1;

    let candidate = null;
    if (isDbConnected && mongoose.isValidObjectId(id)) {
      candidate = await Candidate.findById(id);
    } else {
      candidate = memoryCandidates.get(id);
    }

    if (!candidate) {
      const error = new Error(`Candidate with ID ${id} not found`);
      error.statusCode = 404;
      error.code = 'CANDIDATE_NOT_FOUND';
      error.isPublic = true;
      throw error;
    }

    return res.json({
      candidate: {
        _id: candidate._id.toString(),
        fileName: candidate.fileName,
        pageCount: candidate.pageCount,
        charCount: candidate.charCount,
        rawText: candidate.rawText,
        parsedProfile: candidate.parsedProfile,
        createdAt: candidate.createdAt
      }
    });
  } catch (err) {
    next(err);
  }
}

export { memoryCandidates };
