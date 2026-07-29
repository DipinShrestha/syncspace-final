const express = require('express');
const {
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
} = require('../controllers/workspaceController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/')
  .post(protect, createWorkspace)
  .get(protect, getWorkspaces);

router.route('/:id')
  .get(protect, getWorkspaceById)
  .put(protect, updateWorkspace)
  .delete(protect, deleteWorkspace);

router.post('/:id/members', protect, addMember);
router.delete('/:workspaceId/members/:userId', protect, removeMember); // moved after router definition

router.post('/:id/accept-invite', protect, acceptInvite);
router.post('/:id/decline-invite', protect, declineInvite);
router.delete('/:id/invites/:userId', protect, cancelInvite);

module.exports = router;