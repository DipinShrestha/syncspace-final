const Workspace = require('../models/Workspace');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { getIO } = require('../socketInstance');

// Push a notification to a user — persists it and, if they're currently
// connected, delivers it live to their personal socket room.
const notify = async ({ recipient, type, message, workspace, card }) => {
  const notification = await Notification.create({ recipient, type, message, workspace, card });
  const io = getIO();
  if (io) io.to(`user-${recipient}`).emit('notification', notification);
  return notification;
};
// @desc    Create a new workspace
// @route   POST /api/workspaces
// @access  Private

// @desc    Remove a member from workspace
// @route   DELETE /api/workspaces/:workspaceId/members/:userId
// @access  Private (owner or admin)

const createWorkspace = async (req, res) => {
  try {
    const { name, description } = req.body;
    const workspace = await Workspace.create({
      name,
      description,
      owner: req.user.id,
      members: [{ user: req.user.id, role: 'admin' }],
    });
    res.status(201).json(workspace);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all workspaces for the logged-in user
// @route   GET /api/workspaces
// @access  Private
const getWorkspaces = async (req, res) => {
  try {
    // Find workspaces where user is owner or member
    // .lean() — this response is serialized straight to JSON and never
    // saved back, so there's no need to pay for full Mongoose document
    // hydration (getters/setters/change-tracking) on every dashboard load.
    const workspaces = await Workspace.find({
      $or: [
        { owner: req.user.id },
        { 'members.user': req.user.id }
      ]
    }).populate('owner', 'name email').populate('members.user', 'name email').lean();
    res.json(workspaces);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single workspace by ID
// @route   GET /api/workspaces/:id
// @access  Private (only members)
const getWorkspaceById = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('members.user', 'name email avatar')
      .populate('pendingInvites.user', 'name email avatar')
      .lean();
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }
    // Check if user is member or owner
    const isMember = workspace.members.some(m => m.user._id.toString() === req.user.id);
    if (workspace.owner._id.toString() !== req.user.id && !isMember) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    res.json(workspace);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update workspace
// @route   PUT /api/workspaces/:id
// @access  Private (admin or owner)
const updateWorkspace = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }
    // Only owner or admin can update
    const isAdmin = workspace.members.some(m => m.user.toString() === req.user.id && m.role === 'admin');
    if (workspace.owner.toString() !== req.user.id && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const { name, description } = req.body;
    workspace.name = name || workspace.name;
    workspace.description = description || workspace.description;
    const updated = await workspace.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete workspace
// @route   DELETE /api/workspaces/:id
// @access  Private (owner only)
const deleteWorkspace = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }
    if (workspace.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only owner can delete' });
    }
    await workspace.deleteOne();
    res.json({ message: 'Workspace removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Invite a member to workspace by email — they must accept before
//          they become a real member (see acceptInvite/declineInvite below).
// @route   POST /api/workspaces/:id/members
// @access  Private (admin or owner)
const addMember = async (req, res) => {
  try {
    const { email, role } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

    const isOwner = workspace.owner.toString() === req.user.id;
    const isAdmin = workspace.members.some(m => m.user.toString() === req.user.id && m.role === 'admin');
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // The invited email may not have a SyncSpace account yet — that's fine.
    // We still record the invite (by email); it gets linked to their user
    // record automatically the moment they sign up with a matching Google
    // account (see googleAuth in authController.js), and they'll see it in
    // their notifications as soon as they do.
    const userToAdd = await User.findOne({ email });

    if (userToAdd) {
      if (userToAdd._id.toString() === workspace.owner.toString()) {
        return res.status(400).json({ message: 'User already owns this workspace' });
      }
      const alreadyMember = workspace.members.some(
        (m) => m.user.toString() === userToAdd._id.toString()
      );
      if (alreadyMember) return res.status(400).json({ message: 'User already in workspace' });
    }

    const alreadyInvited = workspace.pendingInvites.some((p) =>
      userToAdd ? p.user?.toString() === userToAdd._id.toString() : p.email === email.toLowerCase()
    );
    if (alreadyInvited) return res.status(400).json({ message: 'Already invited' });

    workspace.pendingInvites.push({
      user: userToAdd?._id,
      email: userToAdd ? undefined : email.toLowerCase(),
      role: role || 'member',
      invitedBy: req.user.id,
    });
    await workspace.save();
    await workspace.populate('pendingInvites.user', 'name email avatar');

    if (userToAdd) {
      await notify({
        recipient: userToAdd._id,
        type: 'workspace_invite',
        message: `You've been invited to join "${workspace.name}"`,
        workspace: workspace._id,
      });
      res.json({ message: 'Invitation sent', workspace });
    } else {
      res.json({
        message: "Invitation sent — they'll see it as soon as they sign up with this email",
        workspace,
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Accept a pending workspace invite (the logged-in user accepts
//          their own invite — no separate ID needed).
// @route   POST /api/workspaces/:id/accept-invite
// @access  Private
const acceptInvite = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

    const inviteIndex = workspace.pendingInvites.findIndex(
      (p) => p.user.toString() === req.user.id
    );
    if (inviteIndex === -1) return res.status(404).json({ message: 'No pending invite found' });

    const { role, invitedBy } = workspace.pendingInvites[inviteIndex];
    workspace.pendingInvites.splice(inviteIndex, 1);
    workspace.members.push({ user: req.user.id, role });
    await workspace.save();

    if (invitedBy) {
      await notify({
        recipient: invitedBy,
        type: 'invite_accepted',
        message: `${req.user.name} accepted your invite to "${workspace.name}"`,
        workspace: workspace._id,
      });
    }

    res.json({ message: 'Invite accepted', workspace });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Decline a pending workspace invite
// @route   POST /api/workspaces/:id/decline-invite
// @access  Private
const declineInvite = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

    const inviteIndex = workspace.pendingInvites.findIndex(
      (p) => p.user.toString() === req.user.id
    );
    if (inviteIndex === -1) return res.status(404).json({ message: 'No pending invite found' });

    const { invitedBy } = workspace.pendingInvites[inviteIndex];
    workspace.pendingInvites.splice(inviteIndex, 1);
    await workspace.save();

    if (invitedBy) {
      await notify({
        recipient: invitedBy,
        type: 'invite_declined',
        message: `${req.user.name} declined your invite to "${workspace.name}"`,
        workspace: workspace._id,
      });
    }

    res.json({ message: 'Invite declined' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Cancel a pending invite (owner/admin revokes it before it's
//          accepted). :userId is either a real user id (invite linked to an
//          existing account) or the invited email address (invite still
//          only has an email, no account yet) — matched against both.
// @route   DELETE /api/workspaces/:id/invites/:userId
// @access  Private (admin or owner)
const cancelInvite = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

    const isOwner = workspace.owner.toString() === req.user.id;
    const isAdmin = workspace.members.some(m => m.user.toString() === req.user.id && m.role === 'admin');
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const identifier = decodeURIComponent(req.params.userId).toLowerCase();
    const inviteIndex = workspace.pendingInvites.findIndex(
      (p) => p.user?.toString() === req.params.userId || p.email === identifier
    );
    if (inviteIndex === -1) return res.status(404).json({ message: 'Invite not found' });

    workspace.pendingInvites.splice(inviteIndex, 1);
    await workspace.save();
    res.json({ message: 'Invite cancelled' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const removeMember = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.workspaceId);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

    const isOwner = workspace.owner.toString() === req.user.id;
    const isAdmin = workspace.members.some(m => m.user.toString() === req.user.id && m.role === 'admin');
    // Anyone can remove themselves ("Leave workspace") — that used to
    // require admin/owner, which meant a plain member had no way to leave
    // a workspace on their own. The owner still can't leave their own
    // workspace this way (delete it, or transfer ownership, instead).
    const isSelfLeaving = req.params.userId === req.user.id;
    if (isSelfLeaving && isOwner) {
      return res.status(400).json({
        message: 'Workspace owners can\'t leave — delete the workspace instead',
      });
    }
    if (!isOwner && !isAdmin && !isSelfLeaving) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const memberIndex = workspace.members.findIndex(m => m.user.toString() === req.params.userId);
    if (memberIndex === -1) return res.status(404).json({ message: 'Member not found' });

    workspace.members.splice(memberIndex, 1);
    await workspace.save();
    res.json({ message: 'Member removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createWorkspace,
  getWorkspaces,
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
  addMember,
  removeMember,
  acceptInvite,
  declineInvite,
  cancelInvite,
};
