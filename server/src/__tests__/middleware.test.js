const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test_secret';

const { authMiddleware, optionalAuth } = require('../middleware/auth');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function signToken(payload) {
  return jwt.sign(payload, 'test_secret');
}

describe('authMiddleware', () => {
  it('calls next and sets req.userId with a valid token', () => {
    const token = signToken({ userId: 'user-123' });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const next = jest.fn();
    authMiddleware(req, mockRes(), next);
    expect(next).toHaveBeenCalled();
    expect(req.userId).toBe('user-123');
  });

  it('returns 401 when no Authorization header is present', () => {
    const req = { headers: {} };
    const res = mockRes();
    authMiddleware(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'No token provided' });
  });

  it('returns 401 when token is malformed', () => {
    const req = { headers: { authorization: 'Bearer notavalidtoken' } };
    const res = mockRes();
    authMiddleware(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 401 when token is signed with wrong secret', () => {
    const token = jwt.sign({ userId: 'user-123' }, 'wrong_secret');
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    authMiddleware(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe('optionalAuth', () => {
  it('attaches userId when a valid token is present', () => {
    const token = signToken({ userId: 'user-123' });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const next = jest.fn();
    optionalAuth(req, {}, next);
    expect(req.userId).toBe('user-123');
    expect(next).toHaveBeenCalled();
  });

  it('still calls next when no token is present', () => {
    const req = { headers: {} };
    const next = jest.fn();
    optionalAuth(req, {}, next);
    expect(next).toHaveBeenCalled();
    expect(req.userId).toBeUndefined();
  });

  it('still calls next when token is invalid, without setting userId', () => {
    const req = { headers: { authorization: 'Bearer badtoken' } };
    const next = jest.fn();
    optionalAuth(req, {}, next);
    expect(next).toHaveBeenCalled();
    expect(req.userId).toBeUndefined();
  });
});
