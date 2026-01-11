"use client";

import { useState } from "react";
import BattleSelector from "./components/BattleSelector";
import ReplayUploader from "./components/ReplayUploader";

type AppMode = "upload" | "view";

export default function Home() {
  const [mode, setMode] = useState<AppMode>("view");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUploadComplete = () => {
    // Trigger refresh of battle list
    setRefreshTrigger(prev => prev + 1);
    // Switch to view mode after upload
    setMode("view");
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
        </div>
      </div>

      {/* Content */}
      {mode === "upload" ? (
        <ReplayUploader onUploadComplete={handleUploadComplete} />
      ) : (
        <BattleSelector key={refreshTrigger} />
      )}
    </div>
  );
}
