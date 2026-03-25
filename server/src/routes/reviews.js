const express = require('express');
const router = express.Router();
const { streamReview } = require('../services/claude');
const prisma = require('../lib/prisma');
const { optionalAuth, authMiddleware } = require('../middleware/auth');

// POST /api/reviews
// Streams an AI code review using Server-Sent Events (SSE).
// Uses optionalAuth so both guests and logged-in users can get reviews.
// If the user is logged in (req.userId is set), the completed review is saved to the DB.
router.post('/', optionalAuth, async (req, res) => {
  const { code, language } = req.body;

  if (!code || !code.trim()) {
    return res.status(400).json({ error: 'Code is required' });
  }

  // SSE setup — these headers tell the browser this is a streaming response,
  // not a normal one-shot JSON response.
  // The browser keeps the connection open and reads data as it arrives.
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');       // don't cache streaming data
  res.setHeader('Connection', 'keep-alive');         // keep the HTTP connection open
  res.flushHeaders(); // send headers immediately so the client knows streaming has started

  try {
    let fullResponse = '';

    // streamReview is an async generator — it yields chunks of text one at a time
    // as Claude produces them. We forward each chunk to the browser immediately.
    for await (const chunk of streamReview(code, language || 'javascript')) {
      fullResponse += chunk;

      // SSE format: each message is "data: <payload>\n\n"
      // The browser's EventSource API (or our manual reader) parses this format.
      res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
    }

    // Once streaming is done, save to the database if the user is logged in.
    // Guests get the review but it isn't persisted.
    if (req.userId) {
      await prisma.review.create({
        data: {
          code,
          language: language || 'javascript',
          response: fullResponse,
          userId: req.userId,
        },
      });
    }

    // Signal the client that streaming is complete
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  } catch (error) {
    console.error('Review error:', error.message);
    res.write(`data: ${JSON.stringify({ type: 'error', content: 'Failed to generate review. Please check your API key.' })}\n\n`);
    res.end();
  }
});

// GET /api/reviews
// Returns the current user's full review history, newest first.
// authMiddleware blocks this route for guests.
router.get('/', authMiddleware, async (req, res) => {
  const reviews = await prisma.review.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: 'desc' },
    // select only the fields the frontend needs — avoids over-fetching
    select: {
      id: true,
      language: true,
      createdAt: true,
      code: true,
      response: true,
    },
  });
  res.json(reviews);
});

// GET /api/reviews/:id
// Returns a single review — but only if it belongs to the logged-in user.
// The findFirst with userId prevents users from reading each other's reviews.
router.get('/:id', authMiddleware, async (req, res) => {
  const review = await prisma.review.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!review) {
    return res.status(404).json({ error: 'Review not found' });
  }
  res.json(review);
});

module.exports = router;
