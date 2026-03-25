const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Creates a signed JWT containing the user's ID.
// The token expires after 7 days — after that the user must log in again.
// "Signing" means the token is cryptographically tied to our JWT_SECRET,
// so we can verify it wasn't tampered with when we receive it back.
function generateToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// POST /api/auth/register
// Creates a new user account and returns a token so they're logged in immediately.
router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  // Check if this email is already taken before trying to create a duplicate
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  // bcrypt hashes the password with a "salt" (random noise added before hashing).
  // The number 10 is the "cost factor" — how many rounds of hashing to do.
  // We NEVER store the plain-text password, only this hash.
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { email, name, password: hashedPassword },
  });

  const token = generateToken(user.id);

  // Return the token and basic user info (never return the password hash)
  res.status(201).json({
    token,
    user: { id: user.id, email: user.email, name: user.name },
  });
});

// POST /api/auth/login
// Validates credentials and returns a fresh token.
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // We use the same generic error for "user not found" and "wrong password"
  // so attackers can't tell which one is wrong (user enumeration attack prevention)
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // bcrypt.compare hashes the incoming password the same way and checks
  // if it matches the stored hash — the only correct way to verify a hashed password
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = generateToken(user.id);
  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name },
  });
});

// GET /api/auth/me
// Returns the currently logged-in user's info.
// authMiddleware runs first and sets req.userId if the token is valid.
// The frontend calls this on page load to restore the session.
router.get('/me', authMiddleware, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ id: user.id, email: user.email, name: user.name });
});

module.exports = router;
