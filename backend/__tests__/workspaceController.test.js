// Unit tests for the workspace permission logic — the stuff most likely to
// have a subtle authorization bug (who can invite, who can remove whom, who
// can leave). Models are mocked with plain objects instead of a real
// database, so these run instantly and test the controller's decisions in
// isolation.
jest.mock('../models/Workspace');
jest.mock('../models/User');
jest.mock('../models/Notification');
jest.mock('../socketInstance', () => ({ getIO: jest.fn(() => null) }));

const Workspace = require('../models/Workspace');
const User = require('../models/User');
const { addMember, removeMember, cancelInvite } = require('../controllers/workspaceController');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function makeWorkspace(overrides = {}) {
  return {
    _id: 'ws-1',
    name: 'Test Workspace',
    owner: 'owner-1',
    members: [{ user: 'owner-1', role: 'admin' }],
    pendingInvites: [],
    save: jest.fn().mockResolvedValue(undefined),
    populate: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('workspaceController.addMember', () => {
  beforeEach(() => jest.clearAllMocks());

  it('invites an email with no SyncSpace account yet by email, not user id', async () => {
    const workspace = makeWorkspace({ members: [{ user: 'owner-1', role: 'admin' }] });
    Workspace.findById.mockResolvedValue(workspace);
    User.findOne.mockResolvedValue(null); // no account exists for this email

    const req = { params: { id: 'ws-1' }, body: { email: 'Friend@Example.com' }, user: { id: 'owner-1' } };
    const res = mockRes();

    await addMember(req, res);

    expect(workspace.pendingInvites).toHaveLength(1);
    expect(workspace.pendingInvites[0]).toMatchObject({
      user: undefined,
      email: 'friend@example.com', // lowercased
    });
    expect(res.status).not.toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("sign up") }),
    );
  });

  it('rejects invites from a non-admin, non-owner member', async () => {
    const workspace = makeWorkspace({
      owner: 'owner-1',
      members: [{ user: 'plain-member', role: 'member' }],
    });
    Workspace.findById.mockResolvedValue(workspace);

    const req = { params: { id: 'ws-1' }, body: { email: 'x@example.com' }, user: { id: 'plain-member' } };
    const res = mockRes();

    await addMember(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(workspace.pendingInvites).toHaveLength(0);
  });

  it('refuses to double-invite the same pending email', async () => {
    const workspace = makeWorkspace({ pendingInvites: [{ email: 'x@example.com', role: 'member' }] });
    Workspace.findById.mockResolvedValue(workspace);
    User.findOne.mockResolvedValue(null);

    const req = { params: { id: 'ws-1' }, body: { email: 'x@example.com' }, user: { id: 'owner-1' } };
    const res = mockRes();

    await addMember(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('workspaceController.removeMember (leave / kick)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lets a plain member remove themselves (leave) with no admin rights', async () => {
    const workspace = makeWorkspace({
      owner: 'owner-1',
      members: [
        { user: 'owner-1', role: 'admin' },
        { user: 'plain-member', role: 'member' },
      ],
    });
    Workspace.findById.mockResolvedValue(workspace);

    const req = { params: { workspaceId: 'ws-1', userId: 'plain-member' }, user: { id: 'plain-member' } };
    const res = mockRes();

    await removeMember(req, res);

    expect(res.status).not.toHaveBeenCalledWith(403);
    expect(workspace.members).toHaveLength(1);
    expect(workspace.members[0].user).toBe('owner-1');
  });

  it('blocks a plain member from removing someone else', async () => {
    const workspace = makeWorkspace({
      owner: 'owner-1',
      members: [
        { user: 'owner-1', role: 'admin' },
        { user: 'plain-member', role: 'member' },
        { user: 'other-member', role: 'member' },
      ],
    });
    Workspace.findById.mockResolvedValue(workspace);

    const req = { params: { workspaceId: 'ws-1', userId: 'other-member' }, user: { id: 'plain-member' } };
    const res = mockRes();

    await removeMember(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(workspace.members).toHaveLength(3); // untouched
  });

  it("blocks the owner from leaving their own workspace via this route", async () => {
    const workspace = makeWorkspace({
      owner: 'owner-1',
      members: [{ user: 'owner-1', role: 'admin' }],
    });
    Workspace.findById.mockResolvedValue(workspace);

    const req = { params: { workspaceId: 'ws-1', userId: 'owner-1' }, user: { id: 'owner-1' } };
    const res = mockRes();

    await removeMember(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(workspace.members).toHaveLength(1); // untouched
  });

  it('lets an admin remove a different plain member', async () => {
    const workspace = makeWorkspace({
      owner: 'owner-1',
      members: [
        { user: 'owner-1', role: 'admin' },
        { user: 'admin-2', role: 'admin' },
        { user: 'plain-member', role: 'member' },
      ],
    });
    Workspace.findById.mockResolvedValue(workspace);

    const req = { params: { workspaceId: 'ws-1', userId: 'plain-member' }, user: { id: 'admin-2' } };
    const res = mockRes();

    await removeMember(req, res);

    expect(res.status).not.toHaveBeenCalledWith(403);
    expect(workspace.members.find((m) => m.user === 'plain-member')).toBeUndefined();
  });
});

describe('workspaceController.cancelInvite', () => {
  beforeEach(() => jest.clearAllMocks());

  it('cancels an invite matched by email when no account exists yet', async () => {
    const workspace = makeWorkspace({
      owner: 'owner-1',
      pendingInvites: [{ email: 'notyet@example.com', role: 'member' }],
    });
    Workspace.findById.mockResolvedValue(workspace);

    const req = {
      params: { id: 'ws-1', userId: encodeURIComponent('notyet@example.com') },
      user: { id: 'owner-1' },
    };
    const res = mockRes();

    await cancelInvite(req, res);

    expect(res.status).not.toHaveBeenCalledWith(404);
    expect(workspace.pendingInvites).toHaveLength(0);
  });

  it('cancels an invite matched by user id when an account already exists', async () => {
    const workspace = makeWorkspace({
      owner: 'owner-1',
      pendingInvites: [{ user: 'invited-user-1', role: 'member' }],
    });
    Workspace.findById.mockResolvedValue(workspace);

    const req = { params: { id: 'ws-1', userId: 'invited-user-1' }, user: { id: 'owner-1' } };
    const res = mockRes();

    await cancelInvite(req, res);

    expect(res.status).not.toHaveBeenCalledWith(404);
    expect(workspace.pendingInvites).toHaveLength(0);
  });
});
