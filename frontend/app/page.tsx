"use client";

import { useState } from "react";
import BattleSelector from "./components/BattleSelector";
import ReplayUploader from "./components/ReplayUploader";
import UserList from "./components/UserList";
import UserStats from "./components/UserStats";

type AppMode = "upload" | "view" | "players";

export default function Home() {
  const [mode, setMode] = useState<AppMode>("view");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUserDateRange, setSelectedUserDateRange] = useState<{ startDate: string; endDate: string }>({ startDate: "", endDate: "" });

  const handleUploadComplete = () => {
    // Trigger refresh of battle list
    setRefreshTrigger(prev => prev + 1);
    // Switch to view mode after upload
    setMode("view");
  };

  const handleUserSelect = (accountId: number, startDate: string, endDate: string) => {
    setSelectedUserId(accountId);
    setSelectedUserDateRange({ startDate, endDate });
  };

  const handleCloseUserStats = () => {
    setSelectedUserId(null);
  };

  return (
    <div>
      {/* Mode Toggle Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex gap-4">
          <button
            onClick={() => setMode("upload")}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${mode === "upload"
              ? "bg-blue-600 text-white"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
          >
            Upload Replay
          </button>
          <button
            onClick={() => setMode("view")}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${mode === "view"
              ? "bg-blue-600 text-white"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
          >
            View Battles
          </button>
          <button
            onClick={() => setMode("players")}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${mode === "players"
              ? "bg-blue-600 text-white"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
          >
            Players
          </button>
        </div>
      </div>

      {/* Content */}
      {mode === "upload" ? (
        <ReplayUploader onUploadComplete={handleUploadComplete} />
      ) : mode === "players" ? (
        <UserList onUserSelect={handleUserSelect} />
      ) : (
        <BattleSelector key={refreshTrigger} />
      )}

      {/* User Stats Modal */}
      {selectedUserId !== null && (
        <UserStats
          accountId={selectedUserId}
          onClose={handleCloseUserStats}
          startDate={selectedUserDateRange.startDate}
          endDate={selectedUserDateRange.endDate}
        />
      )}
    </div>
  );
}
