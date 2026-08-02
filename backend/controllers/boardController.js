// backend/controllers/boardController.js
const Board = require('../models/Board');
const Card = require('../models/Card');
const Workspace = require('../models/Workspace');
const { getIO } = require('../socketInstance');

// @desc    Create a new board inside a workspace
// @route   POST /api/boards
// @access  Private
const createBoard = async (req, res) => {
  try {
    const { title, workspaceId } = req.body;
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }
    const isMember = workspace.members.some(m => m.user.toString() === req.user.id);
    if (workspace.owner.toString() !== req.user.id && !isMember) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const board = await Board.create({
      title,
      workspace: workspaceId,
      createdBy: req.user.id,
      lists: [
        { title: 'To Do', cards: [] },
        { title: 'In Progress', cards: [] },
        { title: 'Review', cards: [] },
        { title: 'Done', cards: [] },
      ],
    });

    workspace.boards.push(board._id);
    await workspace.save();

    res.status(201).json(board);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all boards in a workspace
// @route   GET /api/boards/workspace/:workspaceId
// @access  Private
const getBoardsByWorkspace = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    // Just a permission check, never mutated/saved — .lean() here too.
    const workspace = await Workspace.findById(workspaceId).lean();
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }
    const isMember = workspace.members.some(m => m.user.toString() === req.user.id);
    if (workspace.owner.toString() !== req.user.id && !isMember) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // .lean() — read-only response, no .save() happens after this fetch.
    const boards = await Board.find({ workspace: workspaceId })
      .populate('createdBy', 'name email')
      .populate('lists.cards')
      .lean();
    res.json(boards);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single board by ID (with full cards)
// @route   GET /api/boards/:id
// @access  Private
const getBoardById = async (req, res) => {
  try {
    const board = await Board.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('lists.cards')
      .lean();
    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }
    const workspace = await Workspace.findById(board.workspace).lean();
    const isMember = workspace.members.some(m => m.user.toString() === req.user.id);
    if (workspace.owner.toString() !== req.user.id && !isMember) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    res.json(board);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update board title
// @route   PUT /api/boards/:id
// @access  Private
const updateBoard = async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }
    const workspace = await Workspace.findById(board.workspace).lean();
    const isMember = workspace.members.some(m => m.user.toString() === req.user.id);
    if (workspace.owner.toString() !== req.user.id && !isMember) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const { title } = req.body;
    board.title = title || board.title;
    const updated = await board.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete board (and all its cards)
// @route   DELETE /api/boards/:id
// @access  Private
const deleteBoard = async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }
    const workspace = await Workspace.findById(board.workspace);
    const isAdmin = workspace.members.some(m => m.user.toString() === req.user.id && m.role === 'admin');
    if (workspace.owner.toString() !== req.user.id && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    await Card.deleteMany({ board: board._id });
    workspace.boards = workspace.boards.filter(b => b.toString() !== board._id.toString());
    await workspace.save();
    await board.deleteOne();
    res.json({ message: 'Board deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ========== List operations ==========

// @desc    Add a new list to a board
// @route   POST /api/boards/:boardId/lists
// @access  Private
const addList = async (req, res) => {
  try {
    const { title } = req.body;
    const board = await Board.findById(req.params.boardId);
    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }
    const workspace = await Workspace.findById(board.workspace).lean();
    const isMember = workspace.members.some(m => m.user.toString() === req.user.id);
    if (workspace.owner.toString() !== req.user.id && !isMember) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    board.lists.push({ title, cards: [] });
    await board.save();
    res.status(201).json(board.lists[board.lists.length - 1]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update list title
// @route   PUT /api/boards/:boardId/lists/:listIndex
// @access  Private
const updateList = async (req, res) => {
  try {
    const { boardId, listIndex } = req.params;
    const { title } = req.body;
    const board = await Board.findById(boardId);
    if (!board) return res.status(404).json({ message: 'Board not found' });
    if (!board.lists[listIndex]) return res.status(404).json({ message: 'List not found' });
    board.lists[listIndex].title = title;
    await board.save();
    res.json(board.lists[listIndex]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a list and its cards
// @route   DELETE /api/boards/:boardId/lists/:listIndex
// @access  Private
const deleteList = async (req, res) => {
  try {
    const { boardId, listIndex } = req.params;
    const board = await Board.findById(boardId);
    if (!board) return res.status(404).json({ message: 'Board not found' });
    if (!board.lists[listIndex]) return res.status(404).json({ message: 'List not found' });
    const cardIds = board.lists[listIndex].cards;
    await Card.deleteMany({ _id: { $in: cardIds } });
    board.lists.splice(listIndex, 1);
    await board.save();
    res.json({ message: 'List deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ========== Card operations ==========

// @desc    Create a new card in a specific list
// @route   POST /api/boards/:boardId/lists/:listIndex/cards
// @access  Private
const addCard = async (req, res) => {
  try {
    const { boardId, listIndex } = req.params;
    const { title, description, startDate, dueDate, labels, assignedTo } = req.body;
    const board = await Board.findById(boardId);
    if (!board) return res.status(404).json({ message: 'Board not found' });
    if (!board.lists[listIndex]) return res.status(404).json({ message: 'List not found' });

    // Card creation is restricted to the workspace owner only (per explicit
    // product decision — this is stricter than every other board/list action
    // above, which also allow admins/members).
    const workspace = await Workspace.findById(board.workspace);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });
    if (workspace.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the workspace owner can add cards' });
    }

    const card = await Card.create({
      title,
      description,
      startDate,
      dueDate,
      labels,
      assignedTo,
      board: boardId,
      position: board.lists[listIndex].cards.length,
      list: board.lists[listIndex].title, // store the list title so analytics can read it
    });
    board.lists[listIndex].cards.push(card._id);
    await board.save();
    res.status(201).json(card);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a card (title, description, labels, assignee, position, code, codeFileUrl, list)
// @route   PUT /api/cards/:cardId
// @access  Private
const updateCard = async (req, res) => {
  try {
    const card = await Card.findById(req.params.cardId);
    if (!card) return res.status(404).json({ message: 'Card not found' });

    const { title, description, startDate, dueDate, labels, assignedTo, position, code, codeFileUrl, list } = req.body;

    if (title !== undefined) card.title = title;
    if (description !== undefined) card.description = description;
    if (startDate !== undefined) card.startDate = startDate;
    if (dueDate !== undefined) card.dueDate = dueDate;
    if (labels !== undefined) card.labels = labels;
    if (assignedTo !== undefined) card.assignedTo = assignedTo;
    if (position !== undefined) card.position = position;
    if (code !== undefined) card.code = code;
    if (codeFileUrl !== undefined) card.codeFileUrl = codeFileUrl;
    if (list !== undefined) card.list = list;

    const updated = await card.save();

    // Push the change live to everyone viewing this workspace (best-effort —
    // never let a socket hiccup break the actual save response).
    try {
      const io = getIO();
      if (io) {
        const board = await Board.findById(updated.board).select('workspace');
        if (board) {
          io.to(board.workspace.toString()).emit('card-updated', updated);
        }
      }
    } catch (emitErr) {
      console.error('card-updated emit failed:', emitErr.message);
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a card
// @route   DELETE /api/cards/:cardId
// @access  Private
const deleteCard = async (req, res) => {
  try {
    const card = await Card.findById(req.params.cardId);
    if (!card) return res.status(404).json({ message: 'Card not found' });

    const board = await Board.findById(card.board);
    if (board) {
      for (const list of board.lists) {
        // BUG FIX: indexOf() compares ObjectIds by reference — always returns -1.
        // Use findIndex() with .equals() for correct MongoDB ObjectId comparison.
        const index = list.cards.findIndex(id => id.equals(card._id));
        if (index !== -1) {
          list.cards.splice(index, 1);
          break;
        }
      }
      await board.save();
    }
    await card.deleteOne();
    res.json({ message: 'Card deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Move card to a different list and/or position
// @route   PATCH /api/cards/:cardId/move
// @access  Private
const moveCard = async (req, res) => {
  try {
    const { targetBoardId, targetListIndex, newPosition } = req.body;
    const card = await Card.findById(req.params.cardId);
    if (!card) return res.status(404).json({ message: 'Card not found' });

    // Remove card from old board/list
    const oldBoard = await Board.findById(card.board);
    if (oldBoard) {
      for (const list of oldBoard.lists) {
        // BUG FIX: same indexOf ObjectId reference bug as deleteCard above.
        const idx = list.cards.findIndex(id => id.equals(card._id));
        if (idx !== -1) {
          list.cards.splice(idx, 1);
          break;
        }
      }
      await oldBoard.save();
    }

    // Add to new board/list
    const newBoard = await Board.findById(targetBoardId);
    if (!newBoard) return res.status(404).json({ message: 'Target board not found' });
    if (!newBoard.lists[targetListIndex]) return res.status(404).json({ message: 'Target list not found' });

    if (newPosition === undefined || newPosition >= newBoard.lists[targetListIndex].cards.length) {
      newBoard.lists[targetListIndex].cards.push(card._id);
    } else {
      newBoard.lists[targetListIndex].cards.splice(newPosition, 0, card._id);
    }

    card.board = targetBoardId;
    // Keep card.list in sync with the target list title
    card.list = newBoard.lists[targetListIndex].title;
    await card.save();
    await newBoard.save();
    res.json({ message: 'Card moved', card });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createBoard,
  getBoardsByWorkspace,
  getBoardById,
  updateBoard,
  deleteBoard,
  addList,
  updateList,
  deleteList,
  addCard,
  updateCard,
  deleteCard,
  moveCard,
};