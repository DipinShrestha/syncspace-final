'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

interface MemberStats {
  userId: string;
  name: string;
  tasksAssigned: number;
  tasksCompleted: number;
  completionRate: number | string;
  messagesSent: number;
  documentsEdited: number;
}

interface AnalyticsData {
  summary: {
    totalTasks: number;
    completedTasks: number;
    completionRate: number | string;
    totalMessages: number;
    totalDocuments: number;
  };
  members: MemberStats[];
}

function ProgressPie({ completed, total }: { completed: number; total: number }) {
  const safeTotal = Math.max(total, 0);
  const safeCompleted = Math.min(Math.max(completed, 0), safeTotal || completed);
  const rate = safeTotal ? Math.round((safeCompleted / safeTotal) * 100) : 0;
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const completedLength = (rate / 100) * circumference;
  const pending = Math.max(safeTotal - safeCompleted, 0);

  return (
    <div className="glass p-5 sm:p-6 rounded-2xl h-full">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-gray-400">Project progress</p>
          <h2 className="text-lg sm:text-xl font-semibold text-black mt-1">Task Completion Pie Chart</h2>
        </div>
        <span className="text-xs rounded-full bg-sage-50 text-sage-800 px-2.5 py-1 font-medium">
          {rate}% complete
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8">
        <div className="relative w-44 h-44 flex-shrink-0">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90" role="img" aria-label={`${rate}% of tasks completed`}>
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="18"
              className="text-gray-200"
            />
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="18"
              strokeLinecap="butt"
              strokeDasharray={`${completedLength} ${circumference - completedLength}`}
              className="text-sage-600 transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-bold text-black">{rate}%</span>
            <span className="text-xs text-gray-500 mt-0.5">completed</span>
          </div>
        </div>

        <div className="w-full max-w-xs space-y-3">
          <div className="flex items-center justify-between border border-black/10 rounded-xl px-4 py-3 bg-white/60">
            <span className="flex items-center gap-2 text-sm text-gray-700">
              <span className="w-2.5 h-2.5 rounded-sm bg-sage-600" /> Completed
            </span>
            <span className="font-semibold text-black">{safeCompleted}</span>
          </div>
          <div className="flex items-center justify-between border border-black/10 rounded-xl px-4 py-3 bg-white/60">
            <span className="flex items-center gap-2 text-sm text-gray-700">
              <span className="w-2.5 h-2.5 rounded-sm bg-gray-300" /> Pending
            </span>
            <span className="font-semibold text-black">{pending}</span>
          </div>
          <div className="flex items-center justify-between border border-black/10 rounded-xl px-4 py-3 bg-white/60">
            <span className="text-sm text-gray-700">Total tasks</span>
            <span className="font-semibold text-black">{safeTotal}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskHistogram({ members }: { members: MemberStats[] }) {
  const chartMembers = useMemo(() => members.slice(0, 10), [members]);
  const maxTasks = Math.max(
    1,
    ...chartMembers.map((member) => Math.max(Number(member.tasksAssigned) || 0, Number(member.tasksCompleted) || 0)),
  );

  return (
    <div className="glass p-5 sm:p-6 rounded-2xl h-full">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-gray-400">Member progress</p>
          <h2 className="text-lg sm:text-xl font-semibold text-black mt-1">Task Progress Histogram</h2>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-dusty-300" /> Assigned
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-sage-600" /> Completed
          </span>
        </div>
      </div>

      {chartMembers.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-sm text-gray-500">No member task data yet.</div>
      ) : (
        <div className="overflow-x-auto scrollbar-none pb-2">
          <div className="min-w-[520px] h-72 flex items-end gap-3 border-l border-b border-black/15 pl-3 pr-2 pt-5">
            {chartMembers.map((member) => {
              const assigned = Number(member.tasksAssigned) || 0;
              const completed = Number(member.tasksCompleted) || 0;
              const assignedHeight = Math.max(assigned ? (assigned / maxTasks) * 190 : 3, 3);
              const completedHeight = Math.max(completed ? (completed / maxTasks) * 190 : 3, 3);

              return (
                <div key={member.userId} className="flex-1 min-w-[62px] h-full flex flex-col justify-end items-center group">
                  <div className="w-full flex items-end justify-center gap-1.5 h-[205px]">
                    <div className="relative w-5 sm:w-6 flex items-end h-full">
                      <div
                        className="w-full bg-dusty-300 rounded-t-sm transition-all duration-700 group-hover:bg-dusty-400"
                        style={{ height: `${assignedHeight}px` }}
                        title={`${member.name}: ${assigned} assigned`}
                      />
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-gray-500">{assigned}</span>
                    </div>
                    <div className="relative w-5 sm:w-6 flex items-end h-full">
                      <div
                        className="w-full bg-sage-600 rounded-t-sm transition-all duration-700 group-hover:bg-sage-700"
                        style={{ height: `${completedHeight}px` }}
                        title={`${member.name}: ${completed} completed`}
                      />
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-gray-500">{completed}</span>
                    </div>
                  </div>
                  <div className="h-12 mt-2 flex items-start justify-center w-full">
                    <span className="text-[10px] sm:text-xs text-gray-600 text-center leading-tight line-clamp-2 px-1" title={member.name}>
                      {member.name}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Analytics({ workspaceId }: { workspaceId: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/analytics/${workspaceId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        if (!res.ok) throw new Error();
        const json = await res.json();
        setData(json);
      } catch {
        toast.error('Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    if (workspaceId) fetchAnalytics();
  }, [workspaceId]);

  if (loading) return <div className="p-8 text-black">Loading analytics...</div>;
  if (!data) return <div className="p-8 text-black">No data available</div>;

  const completionRate = Number(data.summary.completionRate) || 0;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in-up">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
        <div className="glass p-3 sm:p-4 rounded-xl transition-transform hover:scale-[1.02]">
          <h3 className="text-xs sm:text-sm text-gray-500">Total Tasks</h3>
          <p className="text-xl sm:text-2xl font-bold text-black">{data.summary.totalTasks}</p>
        </div>
        <div className="glass p-3 sm:p-4 rounded-xl transition-transform hover:scale-[1.02]">
          <h3 className="text-xs sm:text-sm text-gray-500">Completed Tasks</h3>
          <p className="text-xl sm:text-2xl font-bold text-black">{data.summary.completedTasks}</p>
        </div>
        <div className="glass p-3 sm:p-4 rounded-xl transition-transform hover:scale-[1.02]">
          <h3 className="text-xs sm:text-sm text-gray-500">Completion Rate</h3>
          <p className="text-xl sm:text-2xl font-bold text-black">{completionRate}%</p>
        </div>
        <div className="glass p-3 sm:p-4 rounded-xl transition-transform hover:scale-[1.02]">
          <h3 className="text-xs sm:text-sm text-gray-500">Total Messages</h3>
          <p className="text-xl sm:text-2xl font-bold text-black">{data.summary.totalMessages}</p>
        </div>
        <div className="glass p-3 sm:p-4 rounded-xl transition-transform hover:scale-[1.02] col-span-2 md:col-span-1">
          <h3 className="text-xs sm:text-sm text-gray-500">Documents</h3>
          <p className="text-xl sm:text-2xl font-bold text-black">{data.summary.totalDocuments}</p>
        </div>
      </div>

      {/* Visual progress charts */}
      <div className="grid xl:grid-cols-2 gap-4 sm:gap-6">
        <ProgressPie completed={data.summary.completedTasks} total={data.summary.totalTasks} />
        <TaskHistogram members={data.members} />
      </div>

      {/* Member table */}
      <div className="glass p-4 sm:p-5 rounded-xl">
        <div className="mb-4">
          <p className="text-xs uppercase tracking-[0.16em] text-gray-400">Detailed activity</p>
          <h2 className="text-lg sm:text-xl font-semibold text-black mt-1">Member Contributions</h2>
        </div>
        <div className="overflow-x-auto scrollbar-none">
          <table className="w-full text-sm text-left text-black">
            <thead className="text-xs uppercase bg-gray-100">
              <tr>
                <th className="px-4 py-2">Member</th>
                <th className="px-4 py-2">Tasks Assigned</th>
                <th className="px-4 py-2">Tasks Completed</th>
                <th className="px-4 py-2">Completion %</th>
                <th className="px-4 py-2">Messages</th>
                <th className="px-4 py-2">Doc Edits</th>
              </tr>
            </thead>
            <tbody>
              {data.members.map((member) => (
                <tr key={member.userId} className="border-b border-gray-200 hover:bg-white/60 transition-colors">
                  <td className="px-4 py-2 font-medium">{member.name}</td>
                  <td className="px-4 py-2">{member.tasksAssigned}</td>
                  <td className="px-4 py-2">{member.tasksCompleted}</td>
                  <td className="px-4 py-2">{Number(member.completionRate) || 0}%</td>
                  <td className="px-4 py-2">{member.messagesSent}</td>
                  <td className="px-4 py-2">{member.documentsEdited}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
