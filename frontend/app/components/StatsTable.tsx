"use client";

import { useState } from "react";

interface PlayerStats {
    name: string;
    team: number;
    clanAbbrev?: string;
    vehicleName: string;
    shots: number;
    hits: number;
    penetrations: number;
    damageDealt: number;
    accuracy: number;
    penetrationRate: number;
    penToShotRatio: number;
    mapDisplayName?: string;
    playerName?: string;
}

interface StatsTableProps {
    stats: PlayerStats[];
    metadata?: {
        mapDisplayName?: string;
        playerName?: string;
    } | null;
    teamAverages?: Array<{
        team: number;
        avg_accuracy: number;
        avg_penetration_rate: number;
        avg_pen_to_shot_ratio: number;
        player_count: number;
    }>;
}

export default function StatsTable({ stats, metadata, teamAverages }: StatsTableProps) {
    const [sortConfig, setSortConfig] = useState<{ key: keyof PlayerStats | null; direction: "asc" | "desc" }>({ key: null, direction: "asc" });
    const [teamFilter, setTeamFilter] = useState<number | null>(null);

    if (!stats || !Array.isArray(stats) || stats.length === 0) {
        return (
            <div className="p-6 bg-gray-900 min-h-screen text-gray-200">
                <h1 className="text-3xl font-bold mb-6 text-center text-white">WoT Shooting Stats</h1>
                <div className="p-4 text-center text-gray-400">No stats available</div>
            </div>
        );
    }

    const getTeamAverage = (team: number) => {
        return teamAverages?.find(ta => ta.team === team);
    };

    const getAccuracyColor = (accuracy: number): string => {
        if (accuracy >= 80) return "text-green-400";
        if (accuracy >= 60) return "text-blue-400";
        if (accuracy >= 40) return "text-yellow-400";
        return "text-red-400";
    };

    const requestSort = (key: keyof PlayerStats) => {
        let direction: "asc" | "desc" = "asc";
        if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
        setSortConfig({ key, direction });
    };

    const sortedData = [...stats].sort((a, b) => {
        if (!sortConfig.key) return 0;
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];

        if (typeof aVal === "number" && typeof bVal === "number") {
            return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
        }
        return sortConfig.direction === "asc"
            ? String(aVal).localeCompare(String(bVal))
            : String(bVal).localeCompare(String(aVal));
    });

    const filteredData = teamFilter
        ? sortedData.filter(item => item.team === teamFilter)
        : sortedData;

    return (
        <div className="p-6 bg-gray-900 min-h-screen text-gray-200">
            <h1 className="text-3xl font-bold mb-6 text-center text-white">WoT Shooting Stats</h1>

            {metadata && (
                <div className="max-w-4xl mx-auto mb-6 grid gap-3 md:grid-cols-2 text-center">
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                        <div className="text-sm uppercase tracking-wide text-gray-400">Map</div>
                        <div className="text-lg font-semibold text-gray-100">{metadata.mapDisplayName || "—"}</div>
                    </div>
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                        <div className="text-sm uppercase tracking-wide text-gray-400">Player</div>
                        <div className="text-lg font-semibold text-gray-100">{metadata.playerName || "—"}</div>
                    </div>
                </div>
            )}

            {teamAverages && teamAverages.length > 0 && (
                <div className="max-w-4xl mx-auto mb-6">
                    <h3 className="text-lg font-semibold text-gray-300 mb-3 text-center">Team Averages</h3>
                    <div className="grid gap-3 md:grid-cols-2">
                        {teamAverages.map(ta => (
                            <div key={ta.team} className={`border rounded-lg p-4 ${ta.team === 1 ? 'bg-red-900/20 border-red-700' : 'bg-green-900/20 border-green-700'}`}>
                                <div className="text-sm uppercase tracking-wide text-gray-400 mb-2">
                                    Team {ta.team} ({ta.player_count} players)
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <div className="text-xs text-gray-400">Avg Accuracy</div>
                                        <div className={`text-xl font-bold ${getAccuracyColor(ta.avg_accuracy)}`}>
                                            {ta.avg_accuracy}%
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-400">Avg Pen Rate</div>
                                        <div className={`text-xl font-bold ${getAccuracyColor(ta.avg_penetration_rate)}`}>
                                            {ta.avg_penetration_rate}%
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-400">Avg Pen/Shot</div>
                                        <div className={`text-xl font-bold ${getAccuracyColor(ta.avg_pen_to_shot_ratio)}`}>
                                            {ta.avg_pen_to_shot_ratio}%
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex justify-center mb-6">
                <div className="flex gap-3">
                    <button
                        onClick={() => setTeamFilter(null)}
                        className={`px-6 py-2 rounded-lg font-semibold transition-colors ${teamFilter === null
                            ? "bg-blue-600 text-white"
                            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                            }`}
                    >
                        All Teams
                    </button>
                    <button
                        onClick={() => setTeamFilter(1)}
                        className={`px-6 py-2 rounded-lg font-semibold transition-colors ${teamFilter === 1
                            ? "bg-red-600 text-white"
                            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                            }`}
                    >
                        Team 1
                    </button>
                    <button
                        onClick={() => setTeamFilter(2)}
                        className={`px-6 py-2 rounded-lg font-semibold transition-colors ${teamFilter === 2
                            ? "bg-green-600 text-white"
                            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                            }`}
                    >
                        Team 2
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto shadow-lg rounded-lg">
                <table className="min-w-full bg-gray-800 rounded-lg border border-gray-700">
                    <thead className="bg-gray-700 sticky top-0 z-10">
                        <tr>
                            {[
                                { key: "name", label: "Player" },
                                { key: "clanAbbrev", label: "Clan" },
                                { key: "vehicleName", label: "Vehicle" },
                                { key: "shots", label: "Shots" },
                                { key: "hits", label: "Hits" },
                                { key: "penetrations", label: "Penetrations" },
                                { key: "damageDealt", label: "Damage" },
                                { key: "accuracy", label: "Accuracy %" },
                                { key: "penetrationRate", label: "Pen Rate %" },
                                { key: "penToShotRatio", label: "Pen/Shot %" },
                            ].map(col => (
                                <th
                                    key={col.key}
                                    onClick={() => requestSort(col.key as keyof PlayerStats)}
                                    className="cursor-pointer px-4 py-3 text-center font-semibold text-gray-200 border-b border-gray-600 hover:bg-gray-600 transition-colors"
                                >
                                    {col.label}
                                    {sortConfig.key === col.key ? (sortConfig.direction === "asc" ? " ↑" : " ↓") : null}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.map((row, i) => (
                            <tr
                                key={i}
                                className={`text-center ${i % 2 === 0 ? "bg-gray-800" : "bg-gray-700"} hover:bg-gray-600 transition-colors`}
                            >
                                <td className="px-4 py-2 border-b border-gray-600 text-left">{row.name}</td>
                                <td className="px-4 py-2 border-b border-gray-600 text-left">{row.clanAbbrev || "—"}</td>
                                <td className="px-4 py-2 border-b border-gray-600 text-left">{row.vehicleName}</td>
                                <td className="px-4 py-2 border-b border-gray-600">{row.shots}</td>
                                <td className="px-4 py-2 border-b border-gray-600">{row.hits}</td>
                                <td className="px-4 py-2 border-b border-gray-600">{row.penetrations}</td>
                                <td className="px-4 py-2 border-b border-gray-600">{row.damageDealt}</td>
                                <td className={`px-4 py-2 border-b border-gray-600 font-semibold ${getAccuracyColor(row.accuracy)}`}>
                                    {row.accuracy.toFixed(1)}%
                                </td>
                                <td className={`px-4 py-2 border-b border-gray-600 font-semibold ${getPenRateColor(row.penetrationRate)}`}>
                                    {row.penetrationRate.toFixed(1)}%
                                </td>
                                <td className={`px-4 py-2 border-b border-gray-600 font-semibold ${getPenRatioColor(row.penToShotRatio)}`}>
                                    {row.penToShotRatio.toFixed(1)}%
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// Color functions for stat highlighting
function getAccuracyColor(accuracy: number): string {
    if (accuracy >= 80) return "text-green-400";
    if (accuracy >= 60) return "text-blue-400";
    if (accuracy >= 40) return "text-yellow-400";
    return "text-red-400";
}

function getPenRateColor(penRate: number): string {
    if (penRate >= 80) return "text-green-400";
    if (penRate >= 60) return "text-blue-400";
    if (penRate >= 40) return "text-yellow-400";
    return "text-red-400";
}

function getPenRatioColor(penRatio: number): string {
    if (penRatio >= 70) return "text-green-400";
    if (penRatio >= 50) return "text-blue-400";
    if (penRatio >= 30) return "text-yellow-400";
    return "text-red-400";
}
