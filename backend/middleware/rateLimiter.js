// backend/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

// Applied to the whole /api/auth router. Google sign-in itself is protected
// by Google's own verification, but without a limiter here nothing stops a
// script from hammering /api/auth/google with garbage credentials all day —
// wasted compute at best, an easy DoS vector at worst.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests per IP per window is generous for real users, not for a script
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many auth requests — please try again in a few minutes.' },
});

module.exports = { authLimiter };
