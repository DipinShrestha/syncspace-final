'use client';

import React, { useEffect, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  defaultDropAnimationSideEffects,
  DragOverEvent,
  pointerWithin,
  rectIntersection,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import BoardList from './BoardList';
import BoardCard from './BoardCard';
import {
  getBoardsByWorkspace,
  createBoard,
  addList,
  addCard,
  updateCard,
  moveCard,
  getWorkspaceById,
} from '@/lib/api';
import { Card, List, Board } from '@/types/board';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/hooks/useSocket';

interface Member {
  _id: string;
  name: string;
  email: string;
}

interface BoardViewProps {
  workspaceId: string;
}

export default function BoardView({ workspaceId }: BoardViewProps) {
  const { user } = useAuth();
  const socket = useSocket();
  const [boards, setBoards] = useState<Board[]>([]);
  const [currentBoard, setCurrentBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewBoardModal, setShowNewBoardModal] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [newListTitle, setNewListTitle] = useState('');
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [filterAssignee, setFilterAssignee] = useState<string>('');
  const [filterLabel, setFilterLabel] = useState<string>('');
  const [filterDueDate, setFilterDueDate] = useState<string>('');

  // FIX: track live drag state so we can show the card preview in the correct
  // destination list while the user is dragging (enables empty-list drops too).
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Require the user to move 5px before a drag starts so clicks still work.
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (workspaceId) {
      fetchBoards();
      fetchMembers();
    }
  }, [workspaceId]);

  // Join the workspace's socket room and listen for live card updates
  // (e.g. another member uploading a file attachment) so everyone viewing
  // this board sees the change without needing to refresh.
  useEffect(() => {
    if (!socket || !workspaceId || !user?._id) return;

    socket.emit('join-workspace', workspaceId, user._id, (_res: unknown) => {
      // no-op callback; join-workspace already logs/handles errors server-side
    });

    const handleCardUpdated = (updatedCard: Card) => {
      const patchLists = (lists: List[]) =>
        lists.map((list) => ({
          ...list,
          cards: list.cards.map((c) => (c._id === updatedCard._id ? updatedCard : c)),
        }));

      setCurrentBoard((prev) => (prev ? { ...prev, lists: patchLists(prev.lists) } : prev));
      setBoards((prev) => prev.map((b) => ({ ...b, lists: patchLists(b.lists) })));
    };

    socket.on('card-updated', handleCardUpdated);
    return () => {
      socket.off('card-updated', handleCardUpdated);
    };
  }, [socket, workspaceId, user?._id]);

  const fetchMembers = async () => {
    try {
      const res = await getWorkspaceById(workspaceId);
      const workspaceMembers = res.data.members.map((m: any) => m.user);
      setMembers(workspaceMembers);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBoards = async () => {
    setLoading(true);
    try {
      const res = await getBoardsByWorkspace(workspaceId);
      setBoards(res.data);
      if (res.data.length > 0) setCurrentBoard(res.data[0]);
    } catch (err) {
      toast.error('Failed to load boards');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBoard = async () => {
    if (!newBoardTitle.trim()) return toast.error('Board title required');
    try {
      const res = await createBoard({ title: newBoardTitle, workspaceId });
      setBoards([...boards, res.data]);
      setCurrentBoard(res.data);
      setShowNewBoardModal(false);
      setNewBoardTitle('');
      toast.success('Board created');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Creation failed');
    }
  };

  const handleAddList = async (boardId: string, title: string) => {
    if (!title.trim()) return toast.error('List title required');
    try {
      const res = await addList(boardId, title);
      const newList: List = { _id: res.data._id, title: res.data.title, cards: [] };
      setBoards((prev) =>
        prev.map((board) =>
          board._id === boardId ? { ...board, lists: [...board.lists, newList] } : board,
        ),
      );
      if (currentBoard?._id === boardId) {
        setCurrentBoard((prev) => (prev ? { ...prev, lists: [...prev.lists, newList] } : prev));
      }
      setNewListTitle('');
      toast.success('List added');
    } catch (err) {
      toast.error('Failed to add list');
    }
  };

  const handleAddCard = async (
    boardId: string,
    listIndex: number,
    cardTitle: string,
    assigneeId?: string,
  ) => {
    const tempCardId = `temp-${Date.now()}`;
    const tempCard: Card = {
      _id: tempCardId,
      title: cardTitle,
      description: '',
      labels: [],
      assignedTo: assigneeId,
      position: 0,
    };

    const applyOptimistic = (boards: Board[]) =>
      boards.map((board) => {
        if (board._id !== boardId) return board;
        const newLists = [...board.lists];
        newLists[listIndex] = {
          ...newLists[listIndex],
          cards: [...newLists[listIndex].cards, tempCard],
        };
        return { ...board, lists: newLists };
      });

    setBoards(applyOptimistic);
    if (currentBoard?._id === boardId) {
      setCurrentBoard((prev) => (prev ? applyOptimistic([prev])[0] : prev));
    }

    try {
      const res = await addCard(boardId, listIndex, {
        title: cardTitle,
        assignedTo: assigneeId,
      });

      const replaceTemp = (boards: Board[]) =>
        boards.map((board) => {
          if (board._id !== boardId) return board;
          const newLists = [...board.lists];
          newLists[listIndex] = {
            ...newLists[listIndex],
            cards: newLists[listIndex].cards.map((c) => (c._id === tempCardId ? res.data : c)),
          };
          return { ...board, lists: newLists };
        });

      setBoards(replaceTemp);
      if (currentBoard?._id === boardId) {
        setCurrentBoard((prev) => (prev ? replaceTemp([prev])[0] : prev));
      }

      if (assigneeId && assigneeId !== user?._id) {
        socket?.emit('task-assigned', {
          assignedTo: assigneeId,
          cardTitle,
          workspaceId,
          cardId: res.data._id,
        });
      }
    } catch (err) {
      toast.error('Failed to add card');
      fetchBoards();
    }
  };

  const handleMoveStage = async (cardId: string, currentList: string) => {
    const stages = ['To Do', 'In Progress', 'Review', 'Done'];
    const currentIndex = stages.indexOf(currentList);
    if (currentIndex === -1 || currentIndex === stages.length - 1) return;
    const newList = stages[currentIndex + 1];
    try {
      await updateCard(cardId, { list: newList });
      toast.success(`Card moved to ${newList}`);
      fetchBoards();
    } catch {
      toast.error('Failed to move card');
    }
  };

  // ─── helpers ────────────────────────────────────────────────────────────────

  /**
   * Given a dnd-kit id, return { listIndex, cardIndex } within currentBoard.
   * Returns null if not found.
   */
  const findCardPosition = (id: string) => {
    if (!currentBoard) return null;
    for (let li = 0; li < currentBoard.lists.length; li++) {
      const cards = currentBoard.lists[li].cards;
      for (let ci = 0; ci < cards.length; ci++) {
        if (`card-${cards[ci]._id}` === id) {
          return { listIndex: li, cardIndex: ci };
        }
      }
    }
    return null;
  };

  /**
   * Given a dnd-kit id, return the listIndex if the id is a list drop target.
   */
  const findListIndex = (id: string): number => {
    if (!currentBoard) return -1;
    // list-{index} format from useDroppable in BoardList
    const match = id.match(/^list-(\d+)$/);
    if (match) return parseInt(match[1], 10);
    // also try matching by card lookup
    const pos = findCardPosition(id);
    return pos ? pos.listIndex : -1;
  };

  // ─── drag handlers ───────────────────────────────────────────────────────────

  const handleDragStart = (event: any) => {
    if (event.active.data.current?.type === 'card') {
      setActiveCard(event.active.data.current.card);
      setDraggingCardId(event.active.id.toString());
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);
    setDraggingCardId(null);
    if (!over || !currentBoard) return;

    const activeId = active.id.toString();
    const overId = over.id.toString();

    // Only handle card drags
    if (!activeId.startsWith('card-')) return;

    const activePos = findCardPosition(activeId);
    if (!activePos) return;

    // Determine target list and card position
    let targetListIndex: number;
    let targetCardIndex: number;

    if (overId.startsWith('card-')) {
      // Dropped on another card
      const overPos = findCardPosition(overId);
      if (!overPos) return;
      targetListIndex = overPos.listIndex;
      targetCardIndex = overPos.cardIndex;
    } else {
      // FIX: dropped on a list container (empty list or list padding area)
      targetListIndex = findListIndex(overId);
      if (targetListIndex === -1) return;
      // Append to end of the target list
      targetCardIndex = currentBoard.lists[targetListIndex].cards.length;
    }

    const { listIndex: sourceListIndex, cardIndex: sourceCardIndex } = activePos;
    const movedCard = currentBoard.lists[sourceListIndex].cards[sourceCardIndex];

    // Permission check: only assigned member can move between lists
    if (sourceListIndex !== targetListIndex && movedCard.assignedTo !== user?._id) {
      toast.error('Only the assigned member can move this card between columns');
      return;
    }

    // Build updated lists optimistically
    const newLists = currentBoard.lists.map((list) => ({
      ...list,
      cards: [...list.cards],
    }));

    if (sourceListIndex === targetListIndex) {
      // Reorder within same list
      if (sourceCardIndex === targetCardIndex) return;
      newLists[sourceListIndex].cards = arrayMove(
        newLists[sourceListIndex].cards,
        sourceCardIndex,
        targetCardIndex,
      );
    } else {
      // FIX: move across lists — update card.list so analytics stays correct
      const updatedCard = {
        ...movedCard,
        list: currentBoard.lists[targetListIndex].title,
      };
      newLists[sourceListIndex].cards.splice(sourceCardIndex, 1);
      // Clamp index in case we appended-to-end on an empty list
      const insertAt = Math.min(targetCardIndex, newLists[targetListIndex].cards.length);
      newLists[targetListIndex].cards.splice(insertAt, 0, updatedCard);
    }

    const updatedBoard = { ...currentBoard, lists: newLists };
    setCurrentBoard(updatedBoard);
    setBoards((prev) => prev.map((b) => (b._id === currentBoard._id ? updatedBoard : b)));

    // Persist
    try {
      if (sourceListIndex === targetListIndex) {
        await updateCard(movedCard._id, { position: targetCardIndex });
      } else {
        // FIX: was doing activeId.split('-')[0] which produces the wrong id
        // (e.g. 'card' from 'card-abc123'). Use movedCard._id directly.
        await moveCard(movedCard._id, {
          targetBoardId: currentBoard._id,
          targetListIndex,
          newPosition: targetCardIndex,
        });
        // Keep card.list field in sync on the server
        await updateCard(movedCard._id, {
          list: currentBoard.lists[targetListIndex].title,
        });
      }
    } catch (err) {
      console.error('Failed to persist card move', err);
      // Roll back on failure
      fetchBoards();
    }
  };

  const getDraggableListIds = () => {
    if (!currentBoard) return [];
    return currentBoard.lists.map((_, index) => `list-${index}`);
  };

  // ─── render ──────────────────────────────────────────────────────────────────

  if (loading) return <div className="p-8 text-center text-white">Loading boards...</div>;

  if (!currentBoard) {
    return (
      <div>
        <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-4">
          <button
            onClick={() => setShowNewBoardModal(true)}
            className="px-3 py-1 glass-btn rounded-lg text-sm"
          >
            + New Board
          </button>
        </div>
        {showNewBoardModal && (
          <div className="modal-overlay fixed inset-0 bg-black flex items-center justify-center z-50 p-4">
            <div className="modal-panel glass rounded-lg p-6 w-full max-w-96">
              <h2 className="text-xl mb-4 text-white font-semibold">Create New Board</h2>
              <input
                type="text"
                placeholder="Board title"
                value={newBoardTitle}
                onChange={(e) => setNewBoardTitle(e.target.value)}
                className="w-full glass-input rounded-lg p-2 mb-4 text-white placeholder-gray-400"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowNewBoardModal(false)}
                  className="px-4 py-2 glass-outline rounded-lg transition-all active:scale-95 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateBoard}
                  className="px-4 py-2 glass-btn rounded-lg transition-all active:scale-95 text-sm font-medium"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Filter Bar */}
      <div className="flex flex-wrap gap-2 sm:gap-4 mb-4 p-2 glass rounded-lg">
        <select
          value={filterAssignee}
          onChange={(e) => setFilterAssignee(e.target.value)}
          className="glass-input rounded px-2 py-1.5 text-white text-sm transition-colors"
        >
          <option value="">All Assignees</option>
          {members.map((m) => (
            <option key={m._id} value={m._id}>
              {m.name}
            </option>
          ))}
        </select>
        <select
          value={filterLabel}
          onChange={(e) => setFilterLabel(e.target.value)}
          className="glass-input rounded px-2 py-1.5 text-white text-sm transition-colors"
        >
          <option value="">All Labels</option>
          <option value="bug">Bug</option>
          <option value="feature">Feature</option>
          <option value="urgent">Urgent</option>
        </select>
        <input
          type="date"
          value={filterDueDate}
          onChange={(e) => setFilterDueDate(e.target.value)}
          className="glass-input rounded px-2 py-1.5 text-white text-sm transition-colors"
        />
        <button
          onClick={() => {
            setFilterAssignee('');
            setFilterLabel('');
            setFilterDueDate('');
          }}
          className="px-2 py-1.5 glass-outline rounded text-sm transition-all active:scale-95"
        >
          Clear Filters
        </button>
      </div>

      {/* Board tabs + Add List */}
      <div className="flex flex-col sm:flex-row flex-wrap justify-between sm:items-center gap-3 mb-4 border-b border-gray-700 pb-4">
        <div className="flex flex-wrap gap-2 overflow-x-auto scrollbar-none">
          {boards.map((board) => (
            <button
              key={board._id}
              onClick={() => setCurrentBoard(board)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                currentBoard._id === board._id
                  ? 'glass-active text-white'
                  : 'glass text-gray-300 hover:bg-gray-800 active:scale-95'
              }`}
            >
              {board.title}
            </button>
          ))}
          <button
            onClick={() => setShowNewBoardModal(true)}
            className="px-3 py-1.5 glass-btn rounded-lg text-sm font-medium transition-all active:scale-95 whitespace-nowrap"
          >
            + New Board
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="Add a list..."
            value={newListTitle}
            onChange={(e) => setNewListTitle(e.target.value)}
            className="glass-input rounded-md px-2 py-1.5 text-sm flex-1 sm:flex-none sm:w-auto transition-colors"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newListTitle.trim()) {
                handleAddList(currentBoard._id, newListTitle);
              }
            }}
          />
          <button
            onClick={() => {
              if (newListTitle.trim()) handleAddList(currentBoard._id, newListTitle);
            }}
            className="glass-btn rounded-md px-3 py-1.5 text-sm font-medium transition-all active:scale-95 whitespace-nowrap"
          >
            Add List
          </button>
        </div>
      </div>

      {/* Kanban board */}
      {/*
 FIX: use pointerWithin + rectIntersection collision strategy so that
 dragging over an empty list container registers as a valid drop target,
 not just dragging over existing cards.
 */}
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          <SortableContext items={getDraggableListIds()} strategy={horizontalListSortingStrategy}>
            {currentBoard.lists.map((list, listIndex) => {
              let filteredCards = list.cards;
              if (filterAssignee)
                filteredCards = filteredCards.filter((c) => c.assignedTo === filterAssignee);
              if (filterLabel)
                filteredCards = filteredCards.filter((c) => c.labels?.includes(filterLabel));
              if (filterDueDate)
                filteredCards = filteredCards.filter((c) => c.dueDate === filterDueDate);

              return (
                <BoardList
                  key={list._id || listIndex}
                  list={{ ...list, cards: filteredCards }}
                  listIndex={listIndex}
                  onAddCard={(title, assigneeId) =>
                    handleAddCard(currentBoard._id, listIndex, title, assigneeId)
                  }
                  members={members}
                  // FIX: these props were declared but never passed — cards had
                  // no delete, edit, or move-stage buttons working
                  onCardUpdated={fetchBoards}
                  onMoveStage={handleMoveStage}
                />
              );
            })}
          </SortableContext>
        </div>

        <DragOverlay
          dropAnimation={{
            sideEffects: defaultDropAnimationSideEffects({
              styles: { active: { opacity: '0.5' } },
            }),
          }}
        >
          {activeCard ? <BoardCard card={activeCard} /> : null}
        </DragOverlay>
      </DndContext>

      {/* New board modal */}
      {showNewBoardModal && (
        <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
          <div className="glass rounded-lg p-6 w-96">
            <h2 className="text-xl mb-4 text-white">Create New Board</h2>
            <input
              type="text"
              placeholder="Board title"
              value={newBoardTitle}
              onChange={(e) => setNewBoardTitle(e.target.value)}
              className="w-full glass-input rounded-lg p-2 mb-4 text-white"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowNewBoardModal(false)}
                className="px-4 py-2 glass-outline rounded-lg"
              >
                Cancel
              </button>
              <button onClick={handleCreateBoard} className="px-4 py-2 glass-btn rounded-lg">
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
