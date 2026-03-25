const jwt = require('jsonwebtoken');

// Middleware is a function Express calls before your route handler.
// It receives the request (req), response (res), and a next() function.
// Calling next() passes control to the next middleware or route handler.
// If you don't call next(), the request stops here.

// authMiddleware: REQUIRED auth — blocks the request if no valid token.
// Use this on routes that must be logged in (e.g. GET /api/reviews).
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  // Tokens are sent in the Authorization header as: "Bearer <token>"
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  // Split "Bearer eyJhbG..." → take the part after the space
  const token = authHeader.split(' ')[1];

  try {
    // jwt.verify checks the token's signature using our secret key.
    // If the token was tampered with or signed with a different secret,
    // it throws an error and we return 401.
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach the userId to req so route handlers can use it
    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// optionalAuth: OPTIONAL auth — attaches userId if a valid token is present,
// but doesn't block the request if there isn't one.
// Use this on routes that work for both guests and logged-in users
// (e.g. POST /api/reviews — guests can still get a review, it just won't be saved).
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
      req.userId = decoded.userId;
    } catch {
      // Invalid token — treat as a guest, continue without setting userId
    }
  }

  next();
}

module.exports = { authMiddleware, optionalAuth };
