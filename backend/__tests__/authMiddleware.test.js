// Unit tests for the JWT auth gate every protected route depends on.
// Models/JWT are mocked so this runs instantly with no real database.
jest.mock('../models/User');
jest.mock('jsonwebtoken');

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('authMiddleware.protect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
  });

  it('rejects requests with no Authorization header', async () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Not authorized, no token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a malformed/expired token', async () => {
    jwt.verify.mockImplementation(() => {
      throw new Error('invalid signature');
    });
    const req = { headers: { authorization: 'Bearer garbage.token.here' } };
    const res = mockRes();
    const next = jest.fn();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Not authorized, token failed' });
    expect(next).not.toHaveBeenCalled();
  });

  it('attaches req.user and calls next() for a valid token', async () => {
    jwt.verify.mockReturnValue({ id: 'user-123' });
    const fakeUser = { _id: 'user-123', name: 'Ada' };
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(fakeUser) });

    const req = { headers: { authorization: 'Bearer valid.token.here' } };
    const res = mockRes();
    const next = jest.fn();

    await protect(req, res, next);

    expect(User.findById).toHaveBeenCalledWith('user-123');
    expect(req.user).toEqual(fakeUser);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
