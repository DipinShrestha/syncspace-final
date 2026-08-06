'use client';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

// ... interfaces same ...

export default function Analytics({ workspaceId }: { workspaceId: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('No authentication token found');
          setLoading(false);
          return;
        }

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/analytics/${workspaceId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`HTTP ${res.status}: ${errText}`);
        }

        const json = await res.json();
        console.log('✅ Analytics data:', json);

        // Validate shape – provide defaults if missing
        const safeData: AnalyticsData = {
          summary: json.summary || { totalTasks: 0, completedTasks: 0, completionRate: 0, totalMessages: 0, totalDocuments: 0 },
          members: json.members || [],
        };

        setData(safeData);
      } catch (err: any) {
        console.error('❌ Analytics fetch error:', err);
        setError(err.message || 'Failed to load analytics');
        toast.error('Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    if (workspaceId) fetchAnalytics();
  }, [workspaceId]);

  // --- loading / error states ---
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-dusty-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-gray-600 text-sm">Loading workspace analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="glass p-8 rounded-xl text-center">
          <p className="text-red-600 font-medium">⚠️ {error}</p>
          <p className="text-sm text-gray-400 mt-2">Please try refreshing or check your connection.</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="glass p-8 rounded-xl text-center">
          <p className="text-gray-600">No analytics data available for this workspace yet.</p>
          <p className="text-sm text-gray-400 mt-2">Start adding tasks and messages to see insights.</p>
        </div>
      </div>
    );
  }

  // --- rest of your UI (same as the polished version) ---
  const { summary, members } = data;
  // ... continue with the rest of the component ...