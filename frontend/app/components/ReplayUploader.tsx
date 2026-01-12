"use client";

import { useRef, useState } from "react";
import StatsTable from "./StatsTable";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

interface ReplayUploaderProps {
    onUploadComplete?: () => void;
}

export default function ReplayUploader({ onUploadComplete }: ReplayUploaderProps) {
    const [file, setFile] = useState<File | null>(null);
    const [stats, setStats] = useState<any[]>([]);
    const [metadata, setMetadata] = useState<{ mapDisplayName?: string; playerName?: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        // Validate file size
        if (selectedFile.size > MAX_FILE_SIZE) {
            setError("File too large (max 50MB)");
            setFile(null);
            return;
        }

        // Validate file type
        if (!selectedFile.name.endsWith(".wotreplay")) {
            setError("Please select a valid .wotreplay file");
            setFile(null);
            return;
        }

        setError("");
        setFile(selectedFile);
    };

    const handleUpload = async () => {
        if (!file) return;

        setLoading(true);
        setError("");

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch(`${API_URL}/upload-replay`, {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                throw new Error(`Server error: ${res.status} ${res.statusText}`);
            }

            const data = await res.json();
            if (data.error) {
                setError(data.error);
            } else if (data.stats && Array.isArray(data.stats)) {
                setStats(data.stats);
                setMetadata(data.metadata || null);
                // Reset file input after successful upload
                setFile(null);
                if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                }
                // Trigger refresh of battle list
                if (onUploadComplete) {
                    onUploadComplete();
                }
            } else {
                setError("Invalid response format: missing or invalid stats data");
            }
        } catch (err: any) {
            setError(err.message || "Upload failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 bg-gray-900 min-h-screen text-gray-200">
            <h1 className="text-3xl font-bold mb-6 text-center text-white">WoT Shooting Stats</h1>

            <div className="max-w-md mx-auto bg-gray-800 p-6 rounded-lg border border-gray-700 mb-8">
                <h2 className="text-xl font-semibold mb-4 text-gray-100">Upload Replay</h2>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".wotreplay"
                    onChange={handleFileChange}
                    className="mb-4 w-full p-3 border border-gray-600 rounded-lg bg-gray-700 text-gray-200 file:text-gray-300 file:bg-gray-600 file:border-0 file:rounded file:mr-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />


                <button
                    onClick={handleUpload}
                    disabled={!file || loading}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
                >
                    {loading ? "Processing..." : "Upload & Parse"}
                </button>

                {error && <p className="mt-4 p-3 bg-red-900/30 border border-red-700 text-red-200 rounded-lg text-sm">{error}</p>}
            </div>

            {stats.length > 0 && <StatsTable stats={stats} metadata={metadata} />}
        </div>
    );
}
