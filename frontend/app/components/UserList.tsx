"use client";

import { useState, useEffect } from "react";

interface User {
    account_id: number;
    name: string;
    clanAbbrev?: string;
    battle_count: number;
    overall_accuracy: number;
}

interface UserListProps {
    onUserSelect: (accountId: number, startDate: string, endDate: string) => void;
}

type SortField = "name" | "accuracy";
type SortDirection = "asc" | "desc";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function UserList({ onUserSelect }: UserListProps) {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [sortField, setSortField] = useState<SortField>("name");
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
    const [clanFilter, setClanFilter] = useState<string>("all");
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");

    useEffect(() => {
        fetchUsers();
    }, [startDate, endDate]);

    const fetchUsers = async () => {
        setLoading(true);
        setError("");
        try {
            let url = `${API_URL}/users`;
            const params = new URLSearchParams();
            if (startDate) params.append("start_date", startDate);
            if (endDate) params.append("end_date", endDate);
            if (params.toString()) url += `?${params.toString()}`;

            const res = await fetch(url);
            if (!res.ok) {
                throw new Error(`Failed to fetch users: ${res.status}`);
            }
            const data = await res.json();
            setUsers(data.users || []);
        } catch (err: any) {
            setError(err.message || "Failed to load users");
        } finally {
            setLoading(false);
        }
    };

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            // Toggle direction if clicking the same field
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            // Set new field and default to ascending
            setSortField(field);
            setSortDirection("asc");
        }
    };

    const filteredUsers = users.filter(user => {
        if (clanFilter === "all") return true;
        if (clanFilter === "no-clan") return !user.clanAbbrev;
        return user.clanAbbrev === clanFilter;
    });

    const sortedUsers = [...filteredUsers].sort((a, b) => {
        let comparison = 0;

        if (sortField === "name") {
            comparison = a.name.localeCompare(b.name);
        } else if (sortField === "accuracy") {
            comparison = (a.overall_accuracy || 0) - (b.overall_accuracy || 0);
        }

        return sortDirection === "asc" ? comparison : -comparison;
    });

    const uniqueClans = Array.from(new Set(users.map(u => u.clanAbbrev).filter(Boolean))).sort();

    const getSortIcon = (field: SortField) => {
        if (sortField !== field) return "⇅";
        return sortDirection === "asc" ? "↑" : "↓";
    };

    const getAccuracyColor = (accuracy: number): string => {
        if (!accuracy) return "text-gray-400";
        if (accuracy >= 80) return "text-green-400";
        if (accuracy >= 60) return "text-blue-400";
        if (accuracy >= 40) return "text-yellow-400";
        return "text-red-400";
    };

    return (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Players</h2>

            {/* Filters */}
            <div className="mb-4 flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                    <label className="text-gray-300 text-sm block mb-1">Filter by Clan:</label>
                    <select
                        value={clanFilter}
                        onChange={(e) => setClanFilter(e.target.value)}
                        className="w-full bg-gray-700 text-gray-200 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                    >
                        <option value="all">All Clans</option>
                        <option value="no-clan">No Clan</option>
                        {uniqueClans.map(clan => (
                            <option key={clan} value={clan}>{clan}</option>
                        ))}
                    </select>
                </div>

                <div className="flex-1 min-w-[200px]">
                    <label className="text-gray-300 text-sm block mb-1">Start Date:</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-gray-700 text-gray-200 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                    />
                </div>

                <div className="flex-1 min-w-[200px]">
                    <label className="text-gray-300 text-sm block mb-1">End Date:</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full bg-gray-700 text-gray-200 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                    />
                </div>

                {(startDate || endDate) && (
                    <button
                        onClick={() => { setStartDate(""); setEndDate(""); }}
                        className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors"
                    >
                        Clear Dates
                    </button>
                )}
            </div>

            {loading && <p className="text-gray-400">Loading players...</p>}
            {error && <p className="text-red-400 bg-red-900/20 border border-red-400 rounded px-4 py-2">{error}</p>}

            {!loading && !error && users.length === 0 && (
                <p className="text-gray-400 text-center py-8">No players found. Upload some replays to get started!</p>
            )}

            {!loading && !error && users.length > 0 && sortedUsers.length === 0 && (
                <p className="text-gray-400 text-center py-8">No players match the selected filter.</p>
            )}

            {!loading && !error && users.length > 0 && sortedUsers.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-gray-700 rounded-lg">
                        <thead className="bg-gray-600">
                            <tr>
                                <th
                                    className="px-4 py-3 text-left text-gray-200 font-semibold cursor-pointer hover:bg-gray-500 transition-colors"
                                    onClick={() => handleSort("name")}
                                >
                                    Player Name {getSortIcon("name")}
                                </th>
                                <th className="px-4 py-3 text-center text-gray-200 font-semibold">Clan</th>
                                <th className="px-4 py-3 text-center text-gray-200 font-semibold">Battles</th>
                                <th
                                    className="px-4 py-3 text-center text-gray-200 font-semibold cursor-pointer hover:bg-gray-500 transition-colors"
                                    onClick={() => handleSort("accuracy")}
                                >
                                    Overall Accuracy {getSortIcon("accuracy")}
                                </th>
                                <th className="px-4 py-3 text-center text-gray-200 font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedUsers.map((user, idx) => (
                                <tr key={user.account_id} className={idx % 2 === 0 ? "bg-gray-700" : "bg-gray-600"}>
                                    <td className="px-4 py-2 text-left text-gray-200">{user.name}</td>
                                    <td className="px-4 py-2 text-center text-gray-200">{user.clanAbbrev || "-"}</td>
                                    <td className="px-4 py-2 text-center text-gray-200">{user.battle_count}</td>
                                    <td className={`px-4 py-2 text-center font-semibold ${getAccuracyColor(user.overall_accuracy)}`}>
                                        {user.overall_accuracy ? `${user.overall_accuracy}%` : "-"}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                        <button
                                            onClick={() => onUserSelect(user.account_id, startDate, endDate)}
                                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors"
                                        >
                                            View Stats
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
