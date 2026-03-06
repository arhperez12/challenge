"use client";

import { useEffect, useState } from "react";
import { GameState } from "@/lib/types";

export default function StreamDashboard() {
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);

    // Polling game state
    useEffect(() => {
        const fetchState = async () => {
            try {
                const res = await fetch("/api/state");
                if (res.ok) {
                    const state: GameState = await res.json();
                    setGameState(state);
                }
            } catch (e) {
                // ignore
            }
        };
        fetchState();
        const interval = setInterval(fetchState, 1000);
        return () => clearInterval(interval);
    }, []);

    // Timer sync
    useEffect(() => {
        if (!gameState || gameState.status !== "PLAYING" || !gameState.roundStartTime) return;
        const interval = setInterval(() => {
            const passed = Math.floor((Date.now() - gameState.roundStartTime!) / 1000);
            const remaining = Math.max(0, gameState.timeLimit - passed);
            setTimeLeft(remaining);
        }, 500);
        return () => clearInterval(interval);
    }, [gameState]);

    if (!gameState || gameState.status === "LOBBY") {
        return (
            <div className="min-h-screen bg-transparent flex items-center justify-center text-white font-mono">
                <div className="bg-black/80 p-8 rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(59,130,246,0.3)]">
                    <h1 className="text-4xl font-bold animate-pulse text-blue-400">ОЖИДАНИЕ ИГРОКОВ В ЛОББИ...</h1>
                </div>
            </div>
        );
    }

    if (gameState.status === "FINISHED") {
        return (
            <div className="min-h-screen bg-transparent flex items-center justify-center text-white font-mono">
                <div className="bg-black/80 p-12 rounded-3xl border border-green-500/30 shadow-[0_0_80px_rgba(34,197,94,0.3)] text-center">
                    <h1 className="text-6xl font-bold text-green-400 mb-6">ИТОГИ ЧЕЛЛЕНДЖА</h1>
                    <div className="text-3xl space-y-4">
                        <p>Учитель: <span className="text-white font-black">{gameState.players.teacher.score}</span> очков</p>
                        <p>Ученик 1: <span className="text-white font-black">{gameState.players.student1.score}</span> очков</p>
                        <p>Ученик 2: <span className="text-white font-black">{gameState.players.student2.score}</span> очков</p>
                    </div>
                </div>
            </div>
        );
    }

    const { currentRound, players, events = [] } = gameState;
    const recentEvent = events.length > 0 ? events[events.length - 1] : null;

    return (
        <div className="min-h-screen bg-transparent p-8 flex flex-col font-mono text-white">
            {/* Header / Info */}
            <div className="flex justify-between items-center bg-black/70 backdrop-blur-md p-6 rounded-3xl border border-white/10 shadow-2xl mb-8">
                <div className="text-3xl font-black text-blue-400 tracking-widest uppercase">
                    BATTLE: IT vs MATH
                </div>

                <div className={`text-5xl font-black px-8 py-2 rounded-2xl ${timeLeft !== null && timeLeft <= 10 ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-blue-500/20 text-blue-400'}`}>
                    {timeLeft !== null ? `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}` : '00:00'}
                </div>

                <div className="text-2xl font-bold text-gray-300">
                    РАУНД <span className="text-white bg-white/10 px-4 py-1 rounded-xl mx-2">{currentRound} / 5</span>
                </div>
            </div>

            {/* Players Grid */}
            <div className="flex-grow grid grid-cols-3 gap-8">
                {/* Teacher */}
                <PlayerCard
                    role="👨‍🏫 УЧИТЕЛЬ"
                    subject="ИНФОРМАТИКА"
                    player={players.teacher}
                    currentRound={currentRound}
                    color="from-blue-600/50 to-blue-900/50"
                    textColor="text-blue-300"
                    borderColor="border-blue-500/30"
                />

                {/* Student 1 */}
                <PlayerCard
                    role="🧑‍🎓 УЧЕНИК 1"
                    subject="МАТЕМАТИКА"
                    player={players.student1}
                    currentRound={currentRound}
                    color="from-green-600/50 to-green-900/50"
                    textColor="text-green-300"
                    borderColor="border-green-500/30"
                />

                {/* Student 2 */}
                <PlayerCard
                    role="👨‍🎓 УЧЕНИК 2"
                    subject="МАТЕМАТИКА"
                    player={players.student2}
                    currentRound={currentRound}
                    color="from-emerald-600/50 to-emerald-900/50"
                    textColor="text-emerald-300"
                    borderColor="border-emerald-500/30"
                />
            </div>

            {/* Float Event Notification */}
            {recentEvent && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-yellow-400 text-black px-8 py-4 rounded-full shadow-[0_0_40px_rgba(250,204,21,0.6)] font-black text-2xl animate-bounce z-50">
                    ⚡ ИНТЕРАКТИВ: {recentEvent.message || `Событие ${recentEvent.type}`}
                </div>
            )}
        </div>
    );
}

function PlayerCard({ role, subject, player, currentRound, color, textColor, borderColor }: any) {
    const hasAnswered = !!player.answers[currentRound];

    return (
        <div className={`bg-gradient-to-b ${color} backdrop-blur-sm border ${borderColor} rounded-3xl p-8 flex flex-col items-center justify-between shadow-2xl relative overflow-hidden transition-all duration-500 ${hasAnswered ? 'scale-[1.02] ring-4 ring-white/20' : ''}`}>

            {/* Header */}
            <div className="text-center w-full pb-6 border-b border-white/10">
                <h2 className={`text-3xl font-black ${textColor} mb-2`}>{role}</h2>
                <div className="text-sm font-bold tracking-widest bg-black/30 px-4 py-1 rounded-full inline-block">
                    {subject}
                </div>
            </div>

            {/* Score */}
            <div className="my-10 text-center">
                <div className="text-sm font-bold text-gray-400 mb-2 uppercase tracking-widest">Очки</div>
                <div className="text-7xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                    {player.score}
                </div>
            </div>

            {/* Status */}
            <div className="w-full text-center pt-6 border-t border-white/10">
                <div className={`text-2xl font-black ${hasAnswered ? 'text-green-400' : 'text-yellow-400 animate-pulse'}`}>
                    {hasAnswered ? "✅ ОТВЕТ ПРИНЯТ" : "Решает задачу..."}
                </div>
                {hasAnswered && player.timeTaken[currentRound] && (
                    <div className="mt-2 text-sm text-gray-300 font-bold">
                        Время решения: {player.timeTaken[currentRound]} сек
                    </div>
                )}
            </div>

            {/* Overlay if answered */}
            {hasAnswered && (
                <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] pointer-events-none" />
            )}
        </div>
    );
}
