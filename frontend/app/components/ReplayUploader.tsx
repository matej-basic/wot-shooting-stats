"use client";

import { useRef, useState } from "react";
import StatsTable from "./StatsTable";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

interface ReplayUploaderProps {
    onUploadComplete?: () => void;
}

export default function ReplayUploader({ onUploadComplete }: ReplayUploaderProps) {
    const [files, setFiles] = useState<File[]>([]);
    const [stats, setStats] = useState<any[]>([]);
    const [metadata, setMetadata] = useState<{ mapDisplayName?: string; playerName?: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files || []);
        if (selectedFiles.length === 0) return;

        const validFiles: File[] = [];
        const errors: string[] = [];

        for (const file of selectedFiles) {
            // Validate file size
            if (file.size > MAX_FILE_SIZE) {
                errors.push(`${file.name}: File too large (max 50MB)`);
                continue;
            }

            // Validate file type
            if (!file.name.endsWith(".wotreplay")) {
                errors.push(`${file.name}: Not a .wotreplay file`);
                continue;
            }

            validFiles.push(file);
        }

        if (errors.length > 0) {
            setError(errors.join(", "));
        } else {
            setError("");
        }

        setFiles(validFiles);
    };

    const handleUpload = async () => {
        if (files.length === 0) return;

        setLoading(true);
        setError("");
        setUploadProgress({ current: 0, total: files.length });

        const errors: string[] = [];
        let successCount = 0;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            setUploadProgress({ current: i + 1, total: files.length });

            const formData = new FormData();
            formData.append("file", file);

            try {
                const res = await fetch(`${API_URL}/upload-replay`, {
                    method: "POST",
                    body: formData,
                });

                if (!res.ok) {
                    throw new Error(`${file.name}: Server error ${res.status}`);
                }

                const data = await res.json();
                if (data.error) {
                    errors.push(`${file.name}: ${data.error}`);
                } else if (data.stats && Array.isArray(data.stats)) {
                    successCount++;
                    // Show stats for the last successful upload
                    if (i === files.length - 1 || successCount === 1) {
                        setStats(data.stats);
                        setMetadata(data.metadata || null);
                    }
                } else {
                    errors.push(`${file.name}: Invalid response format`);
                }
            } catch (err: any) {
                errors.push(`${file.name}: ${err.message || "Upload failed"}`);
            }
        }

        // Reset file input after all uploads
        setFiles([]);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }

        // Show results
        if (errors.length > 0) {
            setError(`${successCount} of ${files.length} uploaded successfully. Errors: ${errors.join("; ")}`);
        } else {
            setError("");
        }

        setLoading(false);
        setUploadProgress(null);

        // Trigger refresh of battle list
        if (onUploadComplete && successCount > 0) {
            onUploadComplete();
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
                    multiple
                    onChange={handleFileChange}
                    className="mb-4 w-full p-3 border border-gray-600 rounded-lg bg-gray-700 text-gray-200 file:text-gray-300 file:bg-gray-600 file:border-0 file:rounded file:mr-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                {files.length > 0 && (
                    <p className="mb-4 text-sm text-gray-300">
                        {files.length} file{files.length !== 1 ? "s" : ""} selected
                    </p>
                )}

                <button
                    onClick={handleUpload}
                    disabled={files.length === 0 || loading}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
                >
                    {loading && uploadProgress
                        ? `Uploading ${uploadProgress.current}/${uploadProgress.total}...`
                        : loading
                            ? "Processing..."
                            : "Upload & Parse"}
                </button>

                {error && <p className="mt-4 p-3 bg-red-900/30 border border-red-700 text-red-200 rounded-lg text-sm">{error}</p>}
            </div>

            {stats.length > 0 && <StatsTable stats={stats} metadata={metadata} />}
        </div>
    );
}
