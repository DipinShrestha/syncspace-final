// Unit tests for Google-only sign-in — the single most security-sensitive
// endpoint in the app (it mints the JWT everything else trusts). All
// external dependencies (Google's verifier, Mongoose models, JWT signing)
// are mocked so this runs instantly with no network/database access.
jest.mock('../models/User');
jest.mock('../models/Workspace');
jest.mock('../models/Notification');
jest.mock('../socketInstance', () => ({ getIO: jest.fn(() => null) }));
jest.mock('jsonwebtoken');

const mockVerifyIdToken = jest.fn();
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}));

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Workspace = require('../models/Workspace');
const Notification = require('../models/Notification');
const { googleAuth } = require('../controllers/authController');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function mockGooglePayload(payload) {
  mockVerifyIdToken.mockResolvedValue({ getPayload: () => payload });
}

describe('authController.googleAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.JWT_SECRET = 'test-secret';
    jwt.sign.mockReturnValue('signed.jwt.token');
    Workspace.find.mockResolvedValue([]); // no pending invites by default
  });

  it('rejects a request with no credential', async () => {
    const req = { body: {} };
    const res = mockRes();
    await googleAuth(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('creates a brand-new account and reports isNewUser: true', async () => {
    mockGooglePayload({ sub: 'google-1', email: 'new@example.com', name: 'New Person', picture: 'pic.png' });
    User.findOne.mockResolvedValue(null); // no existing account by googleId or email
    const created = { _id: 'user-new', name: 'New Person', email: 'new@example.com', avatar: 'pic.png' };
    User.create.mockResolvedValue(created);

    const req = { body: { credential: 'abc' } };
    const res = mockRes();
    await googleAuth(req, res);

    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'new@example.com', googleId: 'google-1' }),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'user-new', isNewUser: true, token: 'signed.jwt.token' }),
    );
  });

  it('logs an existing (already-linked) account straight in as isNewUser: false', async () => {
    mockGooglePayload({ sub: 'google-existing', email: 'returning@example.com', name: 'Returning' });
    const existing = { _id: 'user-existing', name: 'Returning', email: 'returning@example.com', googleId: 'google-existing' };
    User.findOne.mockResolvedValueOnce(existing); // found directly by googleId

    const req = { body: { credential: 'abc' } };
    const res = mockRes();
    await googleAuth(req, res);

    expect(User.create).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'user-existing', isNewUser: false }),
    );
  });

  it('links a pre-Google-switch account by email instead of duplicating it', async () => {
    mockGooglePayload({ sub: 'google-2', email: 'old@example.com', name: 'Old Timer', picture: 'pic.png' });
    User.findOne
      .mockResolvedValueOnce(null) // no match by googleId
      .mockResolvedValueOnce({
        _id: 'user-old',
        name: 'Old Timer',
        email: 'old@example.com',
        avatar: 'https://via.placeholder.com/150',
        save: jest.fn().mockResolvedValue(undefined),
      });

    const req = { body: { credential: 'abc' } };
    const res = mockRes();
    await googleAuth(req, res);

    expect(User.create).not.toHaveBeenCalled();
    // Linking an existing (pre-Google) account to Google isn't a fresh
    // sign-up — the account already existed, so this must NOT trigger the
    // onboarding flow the way a truly new account does.
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ _id: 'user-old', isNewUser: false }));
  });

  it('links a pending email invite to the newly created account', async () => {
    mockGooglePayload({ sub: 'google-3', email: 'invitee@example.com', name: 'Invitee' });
    User.findOne.mockResolvedValue(null);
    const created = { _id: 'user-invitee', name: 'Invitee', email: 'invitee@example.com' };
    User.create.mockResolvedValue(created);

    const pendingWorkspace = {
      _id: 'ws-1',
      name: 'Team Alpha',
      pendingInvites: [{ email: 'invitee@example.com', user: null }],
      save: jest.fn().mockResolvedValue(undefined),
    };
    Workspace.find.mockResolvedValue([pendingWorkspace]);

    const req = { body: { credential: 'abc' } };
    const res = mockRes();
    await googleAuth(req, res);

    expect(pendingWorkspace.pendingInvites[0].user).toBe('user-invitee');
    expect(pendingWorkspace.save).toHaveBeenCalled();
    expect(Notification.create).toHaveBeenCalledWith(
      expect.objectContaining({ recipient: 'user-invitee', type: 'workspace_invite' }),
    );
  });
});
