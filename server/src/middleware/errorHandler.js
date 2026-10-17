import { ZodError } from 'zod';

export function errorHandler(err, req, res, next) {
  // If response already sent, delegate to default express handler
  if (res.headersSent) {
    return next(err);
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request payload or schema validation failed',
        details: err.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message
        }))
      }
    });
  }

  // Handle Multer upload errors
  if (err.name === 'MulterError') {
    let message = 'File upload error';
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File size exceeds limit of 5MB';
    }
    return res.status(400).json({
      error: {
        code: 'FILE_UPLOAD_ERROR',
        message
      }
    });
  }

  // Handle custom status errors or standard exceptions
  const statusCode = err.status || err.statusCode || 500;
  const errorCode = err.code || (statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_SERVER_ERROR');
  const message = err.isPublic ? err.message : (statusCode === 500 ? 'An unexpected error occurred' : err.message);

  // Mask any accidental exposure of API keys or sensitive strings
  const sanitizedMessage = String(message)
    .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_API_KEY]')
    .replace(/sk-[0-9A-Za-z-_]{20,}/g, '[REDACTED_API_KEY]');

  console.error(`[Error] [${errorCode}]`, err.message || err);

  return res.status(statusCode).json({
    error: {
      code: errorCode,
      message: sanitizedMessage
    }
  });
}
