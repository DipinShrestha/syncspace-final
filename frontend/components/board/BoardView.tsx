'use client';

import React, { useEffect, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  defaultDropAnimationSideEffects,
  pointerWithin,
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
import { IconLayers } from '@/components/icons';

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

interface Member {
  _id: string;
  name: string;
  email: string;
}

interface BoardViewProps {
  workspaceId: string;
}

// ------------------------------------------------------------------
// Sub‑components (local)
// ------------------------------------------------------------------

function FilterBar({
  members,
  filterAssignee,
  setFilterAssignee,
  filterLabel,
  setFilterLabel,
  filterDueDate,
  setFilterDueDate,
  clearFilters,
}: {
  members: Member[];
  filterAssignee: string;
  setFilterAssignee: (v: string) => void;
  filterLabel: string;
  setFilterLabel: (v: string) => void;
  filterDueDate: string;
  setFilterDueDate: (v: string) => void;
  clearFilters: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 sm:gap-4 mb-4 p-2 glass rounded-lg">
      <select
        value={filterAssignee}
        onChange={(e) => setFilterAssignee(e.target.value)}
        className="glass-input rounded px-2 py-1.5 text-black text-sm transition-colors"
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
        className="glass-input rounded px-2 py-1.5 text-black text-sm transition-colors"
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
        className="glass-input rounded px-2 py-1.5 text-black text-sm transition-colors"
      />
      <button
        onClick={clearFilters}
        className="px-2 py-1.5 glass-outline rounded text-sm transition-all active:scale-95"
      >
        Clear Filters
      </button>
    </div>
  );
}

function NewBoardModal({
  isOpen,
  onClose,
  onCreate,
  title,
  setTitle,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: () => void;
  title: string;
  setTitle: (v: string) => void;
}) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="modal-panel glass rounded-3xl p-6 w-full max-w-96">
        <h2 className="text-xl mb-4 text-black font-semibold">Create New Board</h2>
        <input
          type="text"
          placeholder="Board title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full glass-input rounded-lg p-2 mb-4 transition-colors"
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 glass-outline rounded-full transition-all active:scale-95 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onCreate}
            className="px-4 py-2 glass-btn rounded-full transition-all active:scale-95 text-sm font-medium"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Main component
// ------------------------------------------------------------------

export default function BoardView({ workspaceId }: BoardViewProps) {
  const { user } = useAuth();
  const socket = useSocket();

  // ---------- state ----------
  const [boards, setBoards] = useState<Board[]>([]);
  const [currentBoard, setCurrentBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewBoardModal, setShowNewBoardModal] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [newListTitle, setNewListTitle] = useState('');
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterLabel, setFilterLabel] = useState('');
  const [filterDueDate, setFilterDueDate] = useState('');
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);

  // ---------- sensors ----------
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // ---------- fetch functions ----------
  const fetchMembers = async () => {
    try {
      const res = await getWorkspaceById(workspaceId);
      const workspaceMembers = res.data.members.map((m: any) => m.user);
      setMembers(workspaceMembers);
      const ownerId = res.data.owner?._id || res.data.owner;
      setIsOwner(!!ownerId && ownerId === user?._id);
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

  // ---------- effects ----------
  useEffect(() => {
    if (workspaceId) {
      fetchBoards();
      fetchMembers();
    }
  }, [workspaceId]);

  // Join socket room for live updates
  useEffect(() => {
    if (!socket || !workspaceId || !user?._id) return;

    socket.emit('join-workspace', workspaceId, user._id, (_res: unknown) => {
      // no-op
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

  // ---------- board / list / card handlers ----------
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
    description?: string,
    startDate?: string,
    dueDate?: string,
  ) => {
    const tempCardId = `temp-${Date.now()}`;
    const tempCard: Card = {
      _id: tempCardId,
      title: cardTitle,
      description: description || '',
      startDate,
      dueDate,
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
        description,
        startDate,
        dueDate,
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

  // ---------- drag‑and‑drop helpers ----------
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

  const findListIndex = (id: string): number => {
    if (!currentBoard) return -1;
    const match = id.match(/^list-(\d+)$/);
    if (match) return parseInt(match[1], 10);
    const pos = findCardPosition(id);
    return pos ? pos.listIndex : -1;
  };

  // ---------- drag handlers ----------
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

    if (!activeId.startsWith('card-')) return;

    const activePos = findCardPosition(activeId);
    if (!activePos) return;

    let targetListIndex: number;
    let targetCardIndex: number;

    if (overId.startsWith('card-')) {
      const overPos = findCardPosition(overId);
      if (!overPos) return;
      targetListIndex = overPos.listIndex;
      targetCardIndex = overPos.cardIndex;
    } else {
      targetListIndex = findListIndex(overId);
      if (targetListIndex === -1) return;
      targetCardIndex = currentBoard.lists[targetListIndex].cards.length;
    }

    const { listIndex: sourceListIndex, cardIndex: sourceCardIndex } = activePos;
    const movedCard = currentBoard.lists[sourceListIndex].cards[sourceCardIndex];

    if (sourceListIndex !== targetListIndex && movedCard.assignedTo !== user?._id) {
      toast.error('Only the assigned member can move this card between columns');
      return;
    }

    const newLists = currentBoard.lists.map((list) => ({
      ...list,
      cards: [...list.cards],
    }));

    if (sourceListIndex === targetListIndex) {
      if (sourceCardIndex === targetCardIndex) return;
      newLists[sourceListIndex].cards = arrayMove(
        newLists[sourceListIndex].cards,
        sourceCardIndex,
        targetCardIndex,
      );
    } else {
      const updatedCard = {
        ...movedCard,
        list: currentBoard.lists[targetListIndex].title,
      };
      newLists[sourceListIndex].cards.splice(sourceCardIndex, 1);
      const insertAt = Math.min(targetCardIndex, newLists[targetListIndex].cards.length);
      newLists[targetListIndex].cards.splice(insertAt, 0, updatedCard);
    }

    const updatedBoard = { ...currentBoard, lists: newLists };
    setCurrentBoard(updatedBoard);
    setBoards((prev) => prev.map((b) => (b._id === currentBoard._id ? updatedBoard : b)));

    try {
      if (sourceListIndex === targetListIndex) {
        await updateCard(movedCard._id, { position: targetCardIndex });
      } else {
        await moveCard(movedCard._id, {
          targetBoardId: currentBoard._id,
          targetListIndex,
          newPosition: targetCardIndex,
        });
        await updateCard(movedCard._id, {
          list: currentBoard.lists[targetListIndex].title,
        });
      }
    } catch (err) {
      console.error('Failed to persist card move', err);
      fetchBoards();
    }
  };

  const getDraggableListIds = () => {
    if (!currentBoard) return [];
    return currentBoard.lists.map((_, index) => `list-${index}`);
  };

  // ---------- render helpers ----------
  const clearFilters = () => {
    setFilterAssignee('');
    setFilterLabel('');
    setFilterDueDate('');
  };

  const renderLoading = () => (
    <div className="animate-pulse">
      <div className="flex gap-2 mb-4 border-b border-gray-200 pb-4">
        <div className="h-8 w-24 bg-gray-200 rounded-lg" />
        <div className="h-8 w-24 bg-gray-200 rounded-lg" />
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-gray-100 rounded-md p-3 w-80 flex-shrink-0 space-y-2">
            <div className="h-4 w-20 bg-gray-200 rounded mb-2" />
            <div className="h-16 bg-gray-200 rounded" />
            <div className="h-16 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  );

  const renderNoBoard = () => (
    <div>
      <div className="flex flex-col items-center justify-center text-center py-16">
        <div className="w-14 h-14 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mb-4">
          <IconLayers className="w-7 h-7" />
        </div>
        <p className="text-black font-medium mb-1">No boards yet</p>
        <p className="text-sm text-gray-500 mb-4">Create a board to start organizing tasks.</p>
        <button
          onClick={() => setShowNewBoardModal(true)}
          className="px-4 py-2 glass-btn rounded-full text-sm font-medium transition-all active:scale-95"
        >
          + Create your first board
        </button>
      </div>
      <NewBoardModal
        isOpen={showNewBoardModal}
        onClose={() => setShowNewBoardModal(false)}
        onCreate={handleCreateBoard}
        title={newBoardTitle}
        setTitle={setNewBoardTitle}
      />
    </div>
  );

  const renderBoardContent = () => (
    <>
      {/* Filter Bar */}
      <FilterBar
        members={members}
        filterAssignee={filterAssignee}
        setFilterAssignee={setFilterAssignee}
        filterLabel={filterLabel}
        setFilterLabel={setFilterLabel}
        filterDueDate={filterDueDate}
        setFilterDueDate={setFilterDueDate}
        clearFilters={clearFilters}
      />

      {/* Board tabs + Add List */}
      <div className="flex flex-col sm:flex-row flex-wrap justify-between sm:items-center gap-3 mb-4 border-b border-gray-200 pb-4">
        <div className="flex flex-wrap gap-2 overflow-x-auto scrollbar-none">
          {boards.map((board) => (
            <button
              key={board._id}
              onClick={() => setCurrentBoard(board)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                currentBoard._id === board._id
                  ? 'glass-active text-black'
                  : 'glass text-black hover:bg-gray-100 active:scale-95'
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
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin} // allows dropping on empty list containers
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
                  onAddCard={(title, assigneeId, description, startDate, dueDate) =>
                    handleAddCard(
                      currentBoard._id,
                      listIndex,
                      title,
                      assigneeId,
                      description,
                      startDate,
                      dueDate,
                    )
                  }
                  members={members}
                  canAddCard={isOwner}
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
      <NewBoardModal
        isOpen={showNewBoardModal}
        onClose={() => setShowNewBoardModal(false)}
        onCreate={handleCreateBoard}
        title={newBoardTitle}
        setTitle={setNewBoardTitle}
      />
    </>
  );

  // ---------- main render ----------
  if (loading) return renderLoading();
  if (!currentBoard) return renderNoBoard();
  return renderBoardContent();
}