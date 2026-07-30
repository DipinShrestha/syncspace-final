const User = require('../models/User');
const Workspace = require('../models/Workspace');
const Notification = require('../models/Notification');
const { getIO } = require('../socketInstance');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// @desc    Sign in (or sign up, on first use) with a Google ID token.
//          The frontend gets this token from Google Identity Services —
//          the same button is used for both "Login" and "Register"; which
//          one happens is decided here, not by the button the user clicked.
// @route   POST /api/auth/google
// @access  Public
const googleAuth = async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ message: 'Missing Google credential' });
    }
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({ message: 'Google sign-in is not configured on the server' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    let user = await User.findOne({ googleId });
    let isNewUser = false;

    if (!user) {
      // Not linked yet — but an account with this email may already exist
      // (e.g. from before the Google-only switch). Link it instead of
      // creating a duplicate.
      user = await User.findOne({ email });
      if (user) {
        user.googleId = googleId;
        if (!user.avatar || user.avatar.includes('placeholder')) user.avatar = picture;
        await user.save();
      } else {
        user = await User.create({
          name,
          email,
          googleId,
          avatar: picture || undefined,
        });
        isNewUser = true;
      }

      // Link up any workspace invites that were sent to this email before
      // this person had a SyncSpace account at all (see addMember in
      // workspaceController.js — it stores `email` instead of `user` when
      // the invitee doesn't exist yet). Now that they do, attach their real
      // user id and notify them so it shows up right away.
      try {
        const workspacesWithInvite = await Workspace.find({
          'pendingInvites.email': email.toLowerCase(),
        });
        const io = getIO();
        for (const ws of workspacesWithInvite) {
          let changed = false;
          for (const invite of ws.pendingInvites) {
            if (!invite.user && invite.email === email.toLowerCase()) {
              invite.user = user._id;
              changed = true;
            }
          }
          if (changed) {
            await ws.save();
            const notification = await Notification.create({
              recipient: user._id,
              type: 'workspace_invite',
              message: `You've been invited to join "${ws.name}"`,
              workspace: ws._id,
            });
            if (io) io.to(`user-${user._id}`).emit('notification', notification);
          }
        }
      } catch (linkErr) {
        console.error('Failed to link pending email invites:', linkErr.message);
      }
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      token: generateToken(user._id),
      isNewUser,
    });
  } catch (error) {
    res.status(401).json({ message: 'Google sign-in failed: ' + error.message });
  }
};

// @desc    Get current logged-in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user profile (name, avatar)
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { name, avatar } = req.body;
    if (name) user.name = name;
    if (avatar) user.avatar = avatar;

    const updatedUser = await user.save();
    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      avatar: updatedUser.avatar,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete user account
// @route   DELETE /api/auth/account
// @access  Private
const deleteAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Optionally, we could also delete associated data (workspaces, messages, etc.) but we'll skip for now
    await user.deleteOne();
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  googleAuth,
  getMe,
  updateProfile,
  deleteAccount,
};