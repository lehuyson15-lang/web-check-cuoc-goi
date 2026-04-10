const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const xss = require('xss');
const { validationResult } = require('express-validator');

// Common options
const rateLimitWindow = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;

// Global Rate Limiter: 100 requests per window per IP
const globalLimiter = rateLimit({
  windowMs: rateLimitWindow,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests from this IP, please try again later.' }
});

// Login Rate Limiter: strict rules against brute force (5 requests per window)
const loginLimiter = rateLimit({
  windowMs: rateLimitWindow,
  max: parseInt(process.env.RATE_LIMIT_MAX_LOGIN) || 5, 
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts from this IP, please try again after 15 minutes.' }
});

// API Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many API requests, please try again later.' }
});

// XSS Sanitizer middleware
const sanitizeInput = (req, res, next) => {
  if (req.body) {
    for (let key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = xss(req.body[key]);
      }
    }
  }
  if (req.query) {
    for (let key in req.query) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = xss(req.query[key]);
      }
    }
  }
  if (req.params) {
    for (let key in req.params) {
      if (typeof req.params[key] === 'string') {
        req.params[key] = xss(req.params[key]);
      }
    }
  }
  next();
};

// Express Validator error checker
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Error handler to hide internal error messages in production
const errorHandler = (err, req, res, next) => {
  console.error('[Error Details]', err);
  if (process.env.NODE_ENV === 'production') {
    res.status(err.status || 500).json({ message: 'Internal Server Error' });
  } else {
    res.status(err.status || 500).json({ message: err.message, stack: err.stack });
  }
};

module.exports = {
  helmetOptions: helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production',
    crossOriginResourcePolicy: { policy: "cross-origin" }
  }),
  globalLimiter,
  loginLimiter,
  apiLimiter,
  sanitizeInput,
  validateRequest,
  errorHandler
};
