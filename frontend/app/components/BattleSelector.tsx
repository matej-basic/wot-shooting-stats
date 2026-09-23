"use client";

import { useState, useEffect } from "react";
import StatsTable from "./StatsTable";

interface Battle {
    id: number;
    arena_unique_id: number;
    battle_name: string;
    created_at: string;
    player_count: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function BattleSelector() {
    const [battles, setBattles] = useState<Battle[]>([]);
    const [selectedBattle, setSelectedBattle] = useState<number | null>(null);
    const [stats, setStats] = useState<any[]>([]);
    const [teamAverages, setTeamAverages] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Fetch all battles on mount
    useEffect(() => {
        fetchBattles();
    }, []);

    const fetchBattles = async () => {
        try {
            const res = await fetch(`${API_URL}/battles`);
            if (!res.ok) throw new Error("Failed to fetch battles");
            const data = await res.json();
            setBattles(data.battles || []);
        } catch (err: any) {
            setError(err.message || "Failed to fetch battles");
        }
    };

    const handleSelectBattle = async (battleId: number) => {
        setLoading(true);
        setError("");
        setStats([]);
        setTeamAverages([]);

        try {
            const res = await fetch(`${API_URL}/battles/${battleId}`);
            if (!res.ok) throw new Error("Failed to fetch battle details");
            const data = await res.json();

            if (data.stats && Array.isArray(data.stats)) {
                setStats(data.stats);
                setTeamAverages(data.team_averages || []);
                setSelectedBattle(battleId);
            } else {
                setError("Invalid battle data received");
            }
        } catch (err: any) {
            setError(err.message || "Failed to load battle");
        } finally {
            setLoading(false);
        }
    };

    // Renaming and deleting a battle go through PUT and DELETE /battles/{id},
    // which require the backend's ADMIN_TOKEN. There is no way to hold that
    // token in the browser without handing it to every visitor, so those two
    // actions belong on the command line rather than in this UI.

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    if (battles.length === 0 && !selectedBattle) {
        return (
            <div className="p-6 bg-gray-900 min-h-screen text-gray-200">
                <h1 className="text-3xl font-bold mb-6 text-center text-white">WoT Shooting Stats</h1>
                <div className="max-w-2xl mx-auto bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <p className="text-center text-gray-400">No battles found. Upload a replay to get started.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-gray-900 min-h-screen text-gray-200">
            <h1 className="text-3xl font-bold mb-6 text-center text-white">WoT Shooting Stats</h1>

            {selectedBattle ? (
                <>
                    <button
                        onClick={() => {
                            setSelectedBattle(null);
                            setStats([]);
                        }}
                        className="mb-6 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    >
                        ← Back to Battle List
                    </button>
                    <StatsTable stats={stats} teamAverages={teamAverages} />
                </>
            ) : (
                <div className="max-w-4xl mx-auto">
                    <div className="mb-6">
                        <h2 className="text-xl font-semibold text-gray-100 mb-4">Select a Battle</h2>
                        <div className="grid gap-3">
                            {battles.map(battle => (
                                <div
                                    key={battle.id}
                                    className="w-full p-4 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 hover:border-blue-500 transition-all"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1" onClick={() => handleSelectBattle(battle.id)}>
                                            <h3 className="font-semibold text-gray-100">
                                                {battle.battle_name || "Battle"}
                                            </h3>
                                            <p className="text-sm text-gray-400">
                                                {formatDate(battle.created_at)} • {battle.player_count} players
                                            </p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <span className="text-xs px-3 py-1 bg-blue-600 text-white rounded-full">
                                                Battle #{battle.id}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    {error && (
                        <div className="p-4 bg-red-900/30 border border-red-700 text-red-200 rounded-lg">
                            {error}
                        </div>
                    )}
                </div>
            )}

        </div>
    );
}
