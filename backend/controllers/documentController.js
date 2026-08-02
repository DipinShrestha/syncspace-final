const Document = require('../models/Document');
const Workspace = require('../models/Workspace');

// Helper: check if user has access to workspace
const checkWorkspaceAccess = async (workspaceId, userId) => {
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) throw new Error('Workspace not found');
  const isMember = workspace.members.some(m => m.user.toString() === userId);
  const isOwner = workspace.owner.toString() === userId;
  if (!isMember && !isOwner) throw new Error('Not authorized');
  return workspace;
};

// @desc    Create a new document in a workspace
// @route   POST /api/documents
// @access  Private
const createDocument = async (req, res) => {
  try {
    const { title, content, workspaceId } = req.body;
    await checkWorkspaceAccess(workspaceId, req.user.id);
    const document = await Document.create({
      title: title || 'Untitled',
      content: content || '',
      workspace: workspaceId,
      createdBy: req.user.id,
      lastEditedBy: req.user.id,
    });
    // Add document reference to workspace
    const workspace = await Workspace.findById(workspaceId);
    workspace.documents.push(document._id);
    await workspace.save();
    res.status(201).json(document);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all documents in a workspace
// @route   GET /api/documents/workspace/:workspaceId
// @access  Private
const getDocumentsByWorkspace = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    await checkWorkspaceAccess(workspaceId, req.user.id);
    const documents = await Document.find({ workspace: workspaceId })
      .populate('createdBy', 'name email')
      .populate('lastEditedBy', 'name email')
      .sort({ updatedAt: -1 })
      .lean();
    res.json(documents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single document by ID
// @route   GET /api/documents/:id
// @access  Private
const getDocumentById = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('lastEditedBy', 'name email')
      .lean();
    if (!document) return res.status(404).json({ message: 'Document not found' });
    await checkWorkspaceAccess(document.workspace, req.user.id);
    res.json(document);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update document (title, content)
// @route   PUT /api/documents/:id
// @access  Private
const updateDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) return res.status(404).json({ message: 'Document not found' });
    await checkWorkspaceAccess(document.workspace, req.user.id);
    const { title, content } = req.body;
    if (title !== undefined) document.title = title;
    if (content !== undefined) document.content = content;
    document.lastEditedBy = req.user.id;
    const updated = await document.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete document
// @route   DELETE /api/documents/:id
// @access  Private
const deleteDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) return res.status(404).json({ message: 'Document not found' });
    const workspace = await checkWorkspaceAccess(document.workspace, req.user.id);
    await document.deleteOne();
    // Remove reference from workspace
    workspace.documents = workspace.documents.filter(d => d.toString() !== document._id.toString());
    await workspace.save();
    res.json({ message: 'Document deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createDocument,
  getDocumentsByWorkspace,
  getDocumentById,
  updateDocument,
  deleteDocument,
};