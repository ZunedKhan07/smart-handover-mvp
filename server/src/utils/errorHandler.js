
export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export const notFound = (req, res, next) =>
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));

export const errorHandler = (err, req, res, next) => {
  // Temporary debugging: log every error, including operational errors.
  console.error('\n========== API ERROR ==========');
  console.error('Method:', req.method);
  console.error('URL:', req.originalUrl);
  console.error('Name:', err.name);
  console.error('Message:', err.message);
  console.error('Status:', err.statusCode);
  console.error('Stack:', err.stack);
  console.error('================================\n');

  const isProd = process.env.NODE_ENV === 'production';
  let status = err.statusCode || 500;
  let message = err.message;
  let operational = err.isOperational === true;

  if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid identifier.';
    operational = true;
  } else if (err.name === 'ValidationError') {
    status = 400;
    operational = true;
    message =
      Object.values(err.errors || {}).map((e) => e.message).join('; ') ||
      'Validation failed.';
  } else if (
    ['MongooseServerSelectionError', 'MongoNetworkError',
      'MongoServerSelectionError'].includes(err.name)
  ) {
    status = 503;
    message = 'The database is unavailable. Please try again shortly.';
    operational = true;
  } else if (err.name === 'MulterError') {
    operational = true;

    if (err.code === 'LIMIT_FILE_SIZE') {
      status = 413;
      message = 'Uploaded file is too large (max 5 MB).';
    } else {
      status = 400;
      message = `Upload error: ${err.message}`;
    }
  } else if (err.type === 'entity.too.large') {
    status = 413;
    message = 'Request body is too large.';
    operational = true;
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Malformed JSON in request body.';
    operational = true;
  }

  if (!operational && isProd) {
    message = 'Internal server error.';
  }

  res.status(status).json({
    success: false,
    message,
    ...(!isProd && !operational ? { stack: err.stack } : {}),
  });
};
