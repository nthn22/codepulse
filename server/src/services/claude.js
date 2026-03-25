const Anthropic = require('@anthropic-ai/sdk');

// The Anthropic client handles auth and HTTP to the Claude API.
// It reads ANTHROPIC_API_KEY from the environment automatically.
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// The system prompt shapes Claude's behavior for every review.
// It's sent as a "system" message — separate from the user's code —
// so Claude always knows its role regardless of what code is submitted.
const SYSTEM_PROMPT = `You are an expert code reviewer. Analyze the provided code and give a thorough review covering:

1. **Bugs & Errors** — Identify any bugs, logic errors, or potential runtime issues
2. **Security** — Flag security vulnerabilities (injection, XSS, auth issues, etc.)
3. **Performance** — Suggest performance improvements if applicable
4. **Best Practices** — Note deviations from language-specific conventions and best practices
5. **Readability** — Suggest improvements for clarity, naming, and structure

Format your response in markdown. Be specific — reference line numbers or code snippets when pointing out issues. Be constructive and educational, explaining *why* something is an issue and how to fix it.

If the code is well-written, acknowledge what's done well before suggesting improvements.`;

// streamReview is an async generator function.
// An async generator uses "yield" to produce values one at a time,
// and the caller uses "for await...of" to receive them.
// This lets us forward chunks to the HTTP response as soon as Claude produces them,
// rather than waiting for the entire response before sending anything.
async function* streamReview(code, language) {
  // client.messages.stream opens a persistent connection to the Claude API
  // and returns an async iterable of streaming events.
  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Review the following ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\``,
      },
    ],
  });

  // The stream emits many event types (message_start, ping, content_block_delta, etc.)
  // We only care about content_block_delta with text_delta — these are the actual
  // text chunks that make up the review.
  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      yield event.delta.text; // hand one chunk up to the route handler
    }
  }
}

module.exports = { streamReview };
