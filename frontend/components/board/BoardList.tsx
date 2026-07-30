'use client';
import React, { useState } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import BoardCard from './BoardCard';
import { List } from '@/types/board';

interface Member {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface BoardListProps {
  list: List;
  listIndex: number;
  onAddCard: (title: string, assigneeId?: string) => void;
  members?: Member[];
  // FIX: added missing props so they can be forwarded to BoardCard
  onCardUpdated?: () => void;
  onMoveStage?: (cardId: string, currentList: string) => void;
}

const BoardList: React.FC<BoardListProps> = ({
  list,
  listIndex,
  onAddCard,
  members = [],
  onCardUpdated,
  onMoveStage,
}) => {
  const [newCardTitle, setNewCardTitle] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  const [isAddingCard, setIsAddingCard] = useState(false);

  // FIX: make the list column itself a drop target so cards can be dragged
  // into empty lists. The droppable id must match the list-{index} format
  // used in BoardView's getDraggableListIds().
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `list-${listIndex}`,
  });

  const handleAddCard = () => {
    if (newCardTitle.trim()) {
      onAddCard(newCardTitle, selectedAssignee || undefined);
      setNewCardTitle('');
      setSelectedAssignee('');
      setIsAddingCard(false);
    }
  };

  return (
    <div className="bg-white/50 backdrop-blur-md border border-white/70 rounded-lg p-3 w-[82vw] sm:w-80 flex-shrink-0 flex flex-col max-h-full transition-shadow shadow-sm">
      <div className="flex items-center gap-2 mb-3 px-1">
        <h3 className="font-semibold text-gray-700 text-sm sm:text-base">{list.title}</h3>
        <span className="text-xs font-medium text-gray-500 bg-gray-200 rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
          {list.cards.length}
        </span>
      </div>

      {/* FIX: attach both the sortable context AND the droppable ref to the
 card container so dropping onto an empty column works correctly. */}
      <div
        ref={setDroppableRef}
        className={`flex-grow overflow-y-auto space-y-2 min-h-[4rem] rounded transition-colors ${
          isOver ? 'bg-sage-50 ring-2 ring-sage-300' : ''
        }`}
      >
        {list.cards.length === 0 && (
          <div className="h-full min-h-[4rem] flex items-center justify-center text-xs text-gray-400 border-2 border-dashed border-gray-200 rounded-md">
            Drop a card here
          </div>
        )}
        <SortableContext
          items={list.cards.map((card) => `card-${card._id}`)}
          strategy={verticalListSortingStrategy}
        >
          {list.cards.map((card) => (
            // FIX: pass all required props to BoardCard (was only passing card)
            <BoardCard
              key={card._id}
              card={card}
              members={members}
              currentListTitle={list.title}
              onCardUpdated={onCardUpdated}
              onMoveStage={onMoveStage}
            />
          ))}
        </SortableContext>
      </div>

      {isAddingCard ? (
        <div className="mt-3">
          <input
            type="text"
            value={newCardTitle}
            onChange={(e) => setNewCardTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCard()}
            placeholder="Enter card title..."
            className="w-full p-2 border border-gray-300 rounded-md text-sm mb-2 text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-dusty-500"
            autoFocus
          />
          {members.length > 0 && (
            <select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md text-sm mb-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-dusty-500"
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.name}
                </option>
              ))}
            </select>
          )}
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={handleAddCard}
              className="bg-dusty-600 text-black px-3 py-1 rounded-md text-sm hover:bg-dusty-700"
            >
              Add
            </button>
            <button
              onClick={() => setIsAddingCard(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        // FIX: was only showing "+ Add a card" for 'To Do' — now shows for ALL lists
        <button
          onClick={() => setIsAddingCard(true)}
          className="mt-3 text-gray-500 hover:text-gray-700 text-sm text-left w-full"
        >
          + Add a card
        </button>
      )}
    </div>
  );
};

export default BoardList;
