"use client";

import { useState, useEffect } from "react";

interface UserStatsProps {
    accountId: number;
    onClose: () => void;
    startDate?: string;
    endDate?: string;
}

interface OverallStats {
    name: string;
    account_id: number;
    clanAbbrev?: string;
    total_battles: number;
    total_shots: number;
    total_hits: number;
    total_penetrations: number;
    total_damage: number;
    avg_accuracy: number;
    avg_penetration_rate: number;
    avg_pen_to_shot_ratio: number;
    overall_accuracy: number;
    overall_pen_rate: number;
    overall_pen_ratio: number;
    personal_rating?: number;
}

interface VehicleStats {
    vehicle_name: string;
    battles: number;
    shots: number;
    hits: number;
    penetrations: number;
    damage: number;
    accuracy: number;
    pen_rate: number;
    pen_ratio: number;
}

interface BattleStats {
    battle_id: number;
    battle_name: string;
    created_at: string;
    vehicle_name: string;
    team: number;
    shots: number;
    hits: number;
    penetrations: number;
    damage: number;
    accuracy: number;
    pen_rate: number;
    pen_ratio: number;
    personal_rating?: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function UserStats({ accountId, onClose, startDate, endDate }: UserStatsProps) {
    const [stats, setStats] = useState<{
        overall: OverallStats;
        per_vehicle: VehicleStats[];
        per_battle: BattleStats[];
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState<"overall" | "vehicles" | "battles">("overall");

    useEffect(() => {
        fetchUserStats();
    }, [accountId]);

    const fetchUserStats = async () => {
        setLoading(true);
        setError("");
        try {
            let url = `${API_URL}/users/${accountId}`;
            const params = new URLSearchParams();
            if (startDate) params.append("start_date", startDate);
            if (endDate) params.append("end_date", endDate);
            if (params.toString()) url += `?${params.toString()}`;

            const res = await fetch(url);
            if (!res.ok) {
                throw new Error(`Failed to fetch user stats: ${res.status}`);
            }
            const data = await res.json();
            if (data.stats) {
                setStats(data.stats);
            } else {
                setError("No stats found for this user");
            }
        } catch (err: any) {
            setError(err.message || "Failed to load user stats");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                <div className="bg-gray-800 p-8 rounded-lg border border-gray-700">
                    <p className="text-gray-200">Loading user stats...</p>
                </div>
            </div>
        );
    }

    if (error || !stats) {
        return (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                <div className="bg-gray-800 p-8 rounded-lg border border-gray-700 max-w-md">
                    <h2 className="text-xl font-bold text-red-400 mb-4">Error</h2>
                    <p className="text-gray-300 mb-4">{error || "Failed to load stats"}</p>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-auto">
            <div className="bg-gray-800 rounded-lg border border-gray-700 max-w-6xl w-full max-h-[90vh] overflow-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-6 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-white">
                            {stats.overall.name}
                            {stats.overall.clanAbbrev && (
                                <span className="ml-2 text-lg text-gray-400">[{stats.overall.clanAbbrev}]</span>
                            )}
                        </h2>
                        <p className="text-gray-400 text-sm mt-1">
                            Account ID: {stats.overall.account_id} • {stats.overall.total_battles} battles
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
                    >
                        ✕ Close
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-700 bg-gray-800 sticky top-[88px]">
                    <button
                        onClick={() => setActiveTab("overall")}
                        className={`flex-1 px-6 py-3 font-semibold transition-colors ${activeTab === "overall"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                            }`}
                    >
                        Overall Stats
                    </button>
                    <button
                        onClick={() => setActiveTab("vehicles")}
                        className={`flex-1 px-6 py-3 font-semibold transition-colors ${activeTab === "vehicles"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                            }`}
                    >
                        By Vehicle ({stats.per_vehicle.length})
                    </button>
                    <button
                        onClick={() => setActiveTab("battles")}
                        className={`flex-1 px-6 py-3 font-semibold transition-colors ${activeTab === "battles"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                            }`}
                    >
                        Battle History ({stats.per_battle.length})
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {activeTab === "overall" && (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            <StatCard label="Total Battles" value={stats.overall.total_battles.toLocaleString()} />
                            <StatCard label="Total Shots" value={stats.overall.total_shots.toLocaleString()} />
                            <StatCard label="Total Hits" value={stats.overall.total_hits.toLocaleString()} />
                            <StatCard label="Total Penetrations" value={stats.overall.total_penetrations.toLocaleString()} />
                            <StatCard label="Total Damage" value={stats.overall.total_damage.toLocaleString()} />
                            <StatCard
                                label="Personal Rating"
                                value={stats.overall.personal_rating?.toLocaleString() || "—"}
                                color={getRatingColor(stats.overall.personal_rating)}
                            />
                            <StatCard
                                label="Overall Accuracy"
                                value={`${stats.overall.overall_accuracy}%`}
                                color={getAccuracyColor(stats.overall.overall_accuracy)}
                            />
                            <StatCard
                                label="Overall Pen Rate"
                                value={`${stats.overall.overall_pen_rate}%`}
                                color={getPenRateColor(stats.overall.overall_pen_rate)}
                            />
                            <StatCard
                                label="Overall Pen Ratio"
                                value={`${stats.overall.overall_pen_ratio}%`}
                                color={getPenRatioColor(stats.overall.overall_pen_ratio)}
                            />
                            <StatCard label="Avg Accuracy (per battle)" value={`${stats.overall.avg_accuracy}%`} />
                        </div>
                    )}

                    {activeTab === "vehicles" && (
                        <div className="overflow-x-auto">
                            <table className="min-w-full bg-gray-700 rounded-lg">
                                <thead className="bg-gray-600">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-gray-200 font-semibold">Vehicle</th>
                                        <th className="px-4 py-3 text-center text-gray-200 font-semibold">Battles</th>
                                        <th className="px-4 py-3 text-center text-gray-200 font-semibold">Shots</th>
                                        <th className="px-4 py-3 text-center text-gray-200 font-semibold">Hits</th>
                                        <th className="px-4 py-3 text-center text-gray-200 font-semibold">Pens</th>
                                        <th className="px-4 py-3 text-center text-gray-200 font-semibold">Damage</th>
                                        <th className="px-4 py-3 text-center text-gray-200 font-semibold">Acc %</th>
                                        <th className="px-4 py-3 text-center text-gray-200 font-semibold">Pen Rate %</th>
                                        <th className="px-4 py-3 text-center text-gray-200 font-semibold">Pen/Shot %</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.per_vehicle.map((vehicle, idx) => (
                                        <tr key={idx} className={idx % 2 === 0 ? "bg-gray-700" : "bg-gray-600"}>
                                            <td className="px-4 py-2 text-left text-gray-200">{vehicle.vehicle_name}</td>
                                            <td className="px-4 py-2 text-center text-gray-200">{vehicle.battles}</td>
                                            <td className="px-4 py-2 text-center text-gray-200">{vehicle.shots}</td>
                                            <td className="px-4 py-2 text-center text-gray-200">{vehicle.hits}</td>
                                            <td className="px-4 py-2 text-center text-gray-200">{vehicle.penetrations}</td>
                                            <td className="px-4 py-2 text-center text-gray-200">{vehicle.damage}</td>
                                            <td className={`px-4 py-2 text-center font-semibold ${getAccuracyColor(vehicle.accuracy)}`}>
                                                {vehicle.accuracy}%
                                            </td>
                                            <td className={`px-4 py-2 text-center font-semibold ${getPenRateColor(vehicle.pen_rate)}`}>
                                                {vehicle.pen_rate}%
                                            </td>
                                            <td className={`px-4 py-2 text-center font-semibold ${getPenRatioColor(vehicle.pen_ratio)}`}>
                                                {vehicle.pen_ratio}%
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === "battles" && (
                        <div className="overflow-x-auto">
                            <table className="min-w-full bg-gray-700 rounded-lg">
                                <thead className="bg-gray-600">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-gray-200 font-semibold">Battle</th>
                                        <th className="px-4 py-3 text-left text-gray-200 font-semibold">Date</th>
                                        <th className="px-4 py-3 text-left text-gray-200 font-semibold">Vehicle</th>
                                        <th className="px-4 py-3 text-center text-gray-200 font-semibold">Rating</th>
                                        <th className="px-4 py-3 text-center text-gray-200 font-semibold">Team</th>
                                        <th className="px-4 py-3 text-center text-gray-200 font-semibold">Shots</th>
                                        <th className="px-4 py-3 text-center text-gray-200 font-semibold">Hits</th>
                                        <th className="px-4 py-3 text-center text-gray-200 font-semibold">Pens</th>
                                        <th className="px-4 py-3 text-center text-gray-200 font-semibold">Damage</th>
                                        <th className="px-4 py-3 text-center text-gray-200 font-semibold">Acc %</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.per_battle.map((battle, idx) => (
                                        <tr key={idx} className={idx % 2 === 0 ? "bg-gray-700" : "bg-gray-600"}>
                                            <td className="px-4 py-2 text-left text-gray-200">{battle.battle_name}</td>
                                            <td className="px-4 py-2 text-left text-gray-300 text-sm">
                                                {new Date(battle.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-2 text-left text-gray-200">{battle.vehicle_name}</td>
                                            <td className={`px-4 py-2 text-center font-semibold ${getRatingColor(battle.personal_rating)}`}>
                                                {battle.personal_rating || "—"}
                                            </td>
                                            <td className="px-4 py-2 text-center text-gray-200">{battle.team}</td>
                                            <td className="px-4 py-2 text-center text-gray-200">{battle.shots}</td>
                                            <td className="px-4 py-2 text-center text-gray-200">{battle.hits}</td>
                                            <td className="px-4 py-2 text-center text-gray-200">{battle.penetrations}</td>
                                            <td className="px-4 py-2 text-center text-gray-200">{battle.damage}</td>
                                            <td className={`px-4 py-2 text-center font-semibold ${getAccuracyColor(battle.accuracy)}`}>
                                                {battle.accuracy}%
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
    return (
        <div className="bg-gray-700 border border-gray-600 rounded-lg p-4">
            <div className="text-sm uppercase tracking-wide text-gray-400 mb-1">{label}</div>
            <div className={`text-2xl font-bold ${color || "text-gray-100"}`}>{value}</div>
        </div>
    );
}

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

function getRatingColor(rating: number | undefined): string {
    if (!rating) return "text-gray-500";
    if (rating >= 7000) return "text-purple-400";
    if (rating >= 5000) return "text-blue-400";
    if (rating >= 3000) return "text-green-400";
    if (rating >= 1500) return "text-yellow-400";
    return "text-orange-400";
}
