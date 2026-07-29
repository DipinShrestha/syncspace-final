'use client';

import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/types/board';
import { deleteCard } from '@/lib/api';
import toast from 'react-hot-toast';
import TaskDetailsModal from './TaskDetailsModal';
import { IconUsers, IconClock, IconX } from '@/components/icons';

// A due date reads as "overdue" once its calendar day has passed.
const isOverdue = (dueDate?: string) => {
  if (!dueDate) return false;
  const due = new Date(dueDate);
  due.setHours(23, 59, 59, 999);
  return due.getTime() < Date.now();
};

interface BoardCardProps {
  card: Card;
  members?: { _id: string; name: string }[];
  onCardUpdated?: () => void;
  onMoveStage?: (cardId: string, currentList: string) => void;
  currentListTitle?: string;
}

const getNextStage = (currentList: string): string | null => {
  const stages = ['To Do', 'In Progress', 'Review', 'Done'];
  const index = stages.indexOf(currentList);
  if (index === -1 || index === stages.length - 1) return null;
  return stages[index + 1];
};

const BoardCard: React.FC<BoardCardProps> = ({
  card,
  members = [],
  onCardUpdated,
  onMoveStage,
  currentListTitle = '',
}) => {
  const [showEditModal, setShowEditModal] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `card-${card._id}`,
    data: { type: 'card', card },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this card?')) {
      try {
        await deleteCard(card._id);
        toast.success('Card deleted');
        onCardUpdated?.();
      } catch {
        toast.error('Delete failed');
      }
    }
  };

  const handleMoveStage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onMoveStage && currentListTitle) {
      onMoveStage(card._id, currentListTitle);
    }
  };

  const nextStage = getNextStage(currentListTitle);

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className="group bg-white p-3 rounded-md shadow-sm border border-gray-200 transition-all duration-150 hover:shadow-md hover:border-gray-300 hover:-translate-y-0.5 relative"
      >
        {/* Drag handle – small area on the left */}
        <div
          {...attributes}
          {...listeners}
          className="absolute left-1 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 transition-colors"
        >
          ⋮⋮
        </div>
        {/* Main content area – clickable. Opens the single task detail modal
 (code editor + file upload + comments), which enforces that only
 the assigned member can edit — there used to be a second modal
 (CardCodeModal) reachable from this same click that let anyone
 edit code/upload files with no permission check. Removed. */}
        <div className="ml-6 cursor-pointer" onClick={() => setShowEditModal(true)}>
          <p className="text-sm font-medium text-gray-800 pr-12">{card.title}</p>
          {(card.labels && card.labels.length > 0) || card.dueDate || card.assignedTo ? (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {card.labels?.slice(0, 3).map((l) => (
                <span
                  key={l}
                  className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-sage-50 text-sage-900 border border-sage-200"
                >
                  {l}
                </span>
              ))}
              {card.dueDate && (
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                    isOverdue(card.dueDate)
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-dusty-50 text-dusty-900 border border-dusty-200'
                  }`}
                >
                  <IconClock className="w-2.5 h-2.5" />
                  {new Date(card.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              )}
              {card.assignedTo && (
                <span className="inline-flex items-center gap-1 text-[10px] text-gray-500">
                  <IconUsers className="w-3 h-3" />
                </span>
              )}
            </div>
          ) : null}
        </div>
        <div className="absolute top-2 right-2 flex gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
          {nextStage && (
            <button
              onClick={handleMoveStage}
              className="text-gray-400 hover:text-sage-600 text-xs transition-colors p-1"
              title={`Move to ${nextStage}`}
            >
              →
            </button>
          )}
          <button
            onClick={handleDelete}
            className="text-gray-400 hover:text-red-500 transition-colors p-1"
            title="Delete card"
          >
            <IconX className="w-3 h-3" />
          </button>
        </div>
      </div>

      {showEditModal && (
        <TaskDetailsModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          card={card}
          members={members}
          onCardUpdated={onCardUpdated || (() => {})}
        />
      )}
    </>
  );
};

export default BoardCard;
