'use client';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface MemberStats {
  userId: string;
  name: string;
  tasksAssigned: number;
  tasksCompleted: number;
  completionRate: number;
  messagesSent: number;
  documentsEdited: number;
}

interface AnalyticsData {
  summary: {
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    totalMessages: number;
    totalDocuments: number;
  };
  members: MemberStats[];
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

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in-up">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
          <p className="text-xl sm:text-2xl font-bold text-black">{data.summary.completionRate}%</p>
        </div>
        <div className="glass p-3 sm:p-4 rounded-xl transition-transform hover:scale-[1.02]">
          <h3 className="text-xs sm:text-sm text-gray-500">Total Messages</h3>
          <p className="text-xl sm:text-2xl font-bold text-black">{data.summary.totalMessages}</p>
        </div>
      </div>

      {/* Member table */}
      <div className="glass p-4 rounded-xl">
        <h2 className="text-lg sm:text-xl font-semibold text-black mb-4">Member Contributions</h2>
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
                <tr key={member.userId} className="border-b border-gray-200">
                  <td className="px-4 py-2 font-medium">{member.name}</td>
                  <td className="px-4 py-2">{member.tasksAssigned}</td>
                  <td className="px-4 py-2">{member.tasksCompleted}</td>
                  <td className="px-4 py-2">{member.completionRate}%</td>
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
