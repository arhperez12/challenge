"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GameState, Role, Task } from "@/lib/types";

export default function ChallengePage() {
    const router = useRouter();
    const [role, setRole] = useState<Role | null>(null);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [answer, setAnswer] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [recentEvent, setRecentEvent] = useState<string | null>(null);

    // Interactive Effects State
    const [effectBlur, setEffectBlur] = useState(false);
    const [effectFlip, setEffectFlip] = useState(false);
    const [effectShake, setEffectShake] = useState(false);
    const [activeHint, setActiveHint] = useState<string | null>(null);

    // Track the latest state fields without re-binding effects too often
    const stateRef = useState<GameState | null>(null);
    useEffect(() => {
        const savedRole = localStorage.getItem("ege_role") as Role | null;
        if (!savedRole) {
            router.push("/");
        } else {
            setRole(savedRole);
        }
    }, [router]);

    // Polling game state
    useEffect(() => {
        if (!role) return;
        const interval = setInterval(async () => {
            try {
                const res = await fetch("/api/state");
                if (res.ok) {
                    const state: GameState = await res.json();
                    setGameState(state);
                    if (state.status === "FINISHED") {
                        router.push("/results");
                    }
                }
            } catch (e) {
                // ignore network error
            }
        }, 2000);
        return () => clearInterval(interval);
    }, [role, router]);

    // Timer and Event Effect
    useEffect(() => {
        if (!gameState || gameState.status !== "PLAYING" || !gameState.roundStartTime) return;

        const interval = setInterval(() => {
            const passed = Math.floor((Date.now() - gameState.roundStartTime!) / 1000);
            const remaining = Math.max(0, gameState.timeLimit - passed);
            setTimeLeft(remaining);

            // Fetch current answer status
            const currentRound = gameState.currentRound;
            const hasAnswered = role ? !!gameState.players[role].answers[currentRound] : false;

            if (remaining === 0 && !hasAnswered && !submitting) {
                // Auto submit on timeout
                submitAnswer("⏳ Время вышло!");
            }
        }, 500);

        // Simple event popups
        // Simple event popups and effects
        if (gameState.events && gameState.events.length > 0) {
            const lastEvent = gameState.events[gameState.events.length - 1];

            // We need a way to track if we already processed this event locally so we don't trigger it again on polling.
            // A simple hack without full local storage is just checking if it's new by a ref or just storing the ID.
            const lastProcessed = localStorage.getItem("last_event_id");
            if (lastEvent.id !== lastProcessed) {
                localStorage.setItem("last_event_id", lastEvent.id);

                if (lastEvent.targetRole === "all" || lastEvent.targetRole === role) {
                    // Show notification
                    setRecentEvent(lastEvent.message || `Интерактив: ${lastEvent.type}`);
                    setTimeout(() => setRecentEvent(null), 8000);

                    // Apply visual effects
                    switch (lastEvent.type) {
                        case "blur":
                            setEffectBlur(true);
                            setTimeout(() => setEffectBlur(false), (lastEvent.value || 10) * 1000);
                            break;
                        case "flip":
                            setEffectFlip(true);
                            setTimeout(() => setEffectFlip(false), (lastEvent.value || 10) * 1000);
                            break;
                        case "shake":
                            setEffectShake(true);
                            setTimeout(() => setEffectShake(false), (lastEvent.value || 5) * 1000);
                            break;
                        case "hint":
                            if (lastEvent.message) setActiveHint(lastEvent.message);
                            break;
                        case "add_time":
                        case "reduce_time":
                            // Time changes are handled by the server state naturally
                            break;
                        case "add_points":
                            // Points change handled by server state naturally
                            break;
                    }
                }
            }
        }

        return () => clearInterval(interval);
    }, [gameState, role, submitting]);

    if (!role || !gameState) {
        return (
            <div className="flex items-center justify-center min-h-[80vh]">
                <div className="text-2xl font-bold animate-pulse text-[var(--primary)] text-center">
                    🎲 Загрузка 🎲
                </div>
            </div>
        );
    }

    const { currentRound, roundOrder, players, tasks } = gameState;
    const currentLevel = roundOrder[currentRound - 1]; // level of the current round

    // Decide which task pool to use: teacher gets math, students get informatics
    const taskPool = role === "teacher" ? tasks.mathematics : tasks.informatics;
    const currentTask = taskPool.find((t) => t.level === currentLevel);

    const hasAnsweredCurrentRound = !!players[role].answers[currentRound];

    // Check if everyone has answered this round
    const allAnswered =
        !!players.teacher.answers[currentRound] &&
        !!players.student1.answers[currentRound] &&
        !!players.student2.answers[currentRound];

    const submitAnswer = async (finalAnswer: string) => {
        if (!finalAnswer.trim() || hasAnsweredCurrentRound || submitting) return;
        setSubmitting(true);
        try {
            await fetch("/api/state", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "submit",
                    payload: { role, answer: finalAnswer, round: currentRound }
                }),
            });
            if (answer !== finalAnswer) setAnswer(finalAnswer);
        } catch (err) {
            alert("Ошибка отправки ответа");
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        submitAnswer(answer);
    };

    const handleNextRound = async () => {
        try {
            await fetch("/api/state", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "next_round" }),
            });
        } catch (err) {
            alert("Ошибка при переходе к следующему раунду");
        }
    };

    return (
        <div className={`w-full flex flex-col items-center min-h-[80vh] py-6 transition-all duration-[2000ms] ${effectBlur ? "blur-sm opacity-80" : ""} ${effectFlip ? "rotate-180" : ""} ${effectShake ? "animate-[bounce_0.2s_infinite]" : ""}`}>

            {/* Header Panel */}
            <div className="w-full max-w-4xl neu-convex p-6 rounded-3xl mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-[var(--primary)] uppercase tracking-widest">
                        Раунд {currentRound} / 5
                    </h2>
                    <p className="text-sm font-medium opacity-70 mt-1">
                        Текущий уровень сложности: <span className="text-[var(--primary)] font-bold">{currentLevel}</span>
                    </p>
                </div>
                <div className="neu-flat px-6 py-3 rounded-xl flex gap-6 font-bold">
                    <div className="text-center">
                        <span className="text-xs opacity-60 block">Учитель</span>
                        <span className={players.teacher.answers[currentRound] ? "text-green-500" : "text-gray-400"}>
                            {players.teacher.answers[currentRound] ? "✓" : "..."}
                        </span>
                    </div>
                    <div className="text-center">
                        <span className="text-xs opacity-60 block">Ученик 1</span>
                        <span className={players.student1.answers[currentRound] ? "text-green-500" : "text-gray-400"}>
                            {players.student1.answers[currentRound] ? "✓" : "..."}
                        </span>
                    </div>
                    <div className="text-center">
                        <span className="text-xs opacity-60 block">Ученик 2</span>
                        <span className={players.student2.answers[currentRound] ? "text-green-500" : "text-gray-400"}>
                            {players.student2.answers[currentRound] ? "✓" : "..."}
                        </span>
                    </div>
                </div>
            </div>

            {/* Main Task Area */}
            <div className="w-full max-w-4xl flex-grow flex flex-col relative">

                {/* Event Popup Overlay */}
                {recentEvent && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-yellow-400 text-black px-6 py-3 rounded-2xl shadow-2xl font-bold animate-bounce text-center w-3/4">
                        ⚡ {recentEvent}
                    </div>
                )}

                {/* Timer Display */}
                <div className="flex justify-center mb-4">
                    <div className={`neu-convex px-8 py-3 rounded-full text-2xl font-mono font-bold transition-colors ${timeLeft !== null && timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-[var(--primary)]'}`}>
                        ⏳ {timeLeft !== null ? `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}` : '--:--'}
                    </div>
                </div>

                {currentTask ? (
                    <div className="neu-flat p-8 sm:p-12 rounded-3xl flex-grow flex flex-col relative">
                        {/* Hint Display */}
                        {activeHint && (
                            <div className="absolute top-0 left-0 right-0 -translate-y-1/2 mx-auto w-11/12 bg-green-500 text-white p-4 rounded-xl shadow-[0_10px_30px_rgba(34,197,94,0.3)] border-2 border-white/20 z-10 text-center animate-pulse">
                                <span className="font-black uppercase tracking-widest text-xs opacity-80 block mb-1">Помощь зала</span>
                                <span className="font-bold text-lg">{activeHint}</span>
                            </div>
                        )}

                        <div className="mb-6 mt-4">
                            <span className="inline-block px-4 py-1 neu-pressed rounded-full text-sm font-bold text-[var(--primary)] mb-4">
                                Задание (Уровень {currentTask.level})
                            </span>
                            <p className="text-xl sm:text-2xl font-medium leading-relaxed whitespace-pre-wrap">
                                {currentTask.question}
                            </p>
                        </div>

                        {currentTask.imageUrl && (
                            <div className="mt-4 mb-8">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={currentTask.imageUrl}
                                    alt="Задание"
                                    className="max-w-full rounded-2xl shadow-md border-4 border-white/20 neu-convex"
                                />
                            </div>
                        )}

                        <div className="mt-auto pt-8">
                            {!hasAnsweredCurrentRound ? (
                                <form onSubmit={handleSubmit} className="flex gap-4">
                                    <input
                                        type="text"
                                        value={answer}
                                        onChange={(e) => setAnswer(e.target.value)}
                                        placeholder="Введите ваш ответ..."
                                        className="flex-grow p-4 rounded-2xl neu-pressed bg-transparent outline-none focus:ring-2 ring-[var(--primary)] text-lg font-mono font-bold"
                                    />
                                    <button
                                        type="submit"
                                        disabled={submitting || !answer.trim()}
                                        className="px-8 py-4 bg-[var(--primary)] text-white font-bold rounded-2xl shadow-lg hover:shadow-xl hover:bg-blue-600 active:scale-95 transition-all"
                                    >
                                        Ответить
                                    </button>
                                </form>
                            ) : (
                                <div className="p-6 neu-pressed rounded-2xl text-center">
                                    <p className="text-xl font-bold text-green-500">Ответ принят!</p>
                                    <p className="text-sm mt-2 opacity-70">Ваш ответ: {players[role].answers[currentRound]}</p>
                                    <p className="text-sm mt-1 animate-pulse">Ожидание других участников...</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="neu-flat p-12 rounded-3xl text-center text-gray-500 flex-grow flex items-center justify-center">
                        <p className="text-xl font-bold">Задание для уровня {currentLevel} не найдено в таблице.</p>
                    </div>
                )}

                {/* Next Round Control for Teacher */}
                {role === "teacher" && allAnswered && (
                    <div className="mt-8 text-center">
                        <button
                            onClick={handleNextRound}
                            className="px-10 py-4 bg-green-500 text-white font-bold text-xl rounded-2xl shadow-lg hover:bg-green-600 hover:scale-105 active:scale-95 transition-all animate-bounce w-full"
                        >
                            {currentRound < 5 ? "Перейти к следующему раунду" : "Завершить игру и показать итоги"}
                        </button>
                    </div>
                )}

                {/* Teacher Admin Controls */}
                {role === "teacher" && (
                    <div className="mt-8 mb-4 w-full max-w-4xl neu-flat p-6 rounded-3xl border-2 border-red-500/20 bg-red-500/5">
                        <h3 className="text-red-400 font-bold mb-4">🛠 Панель тестирования (Видит только Учитель)</h3>
                        <div className="flex flex-wrap gap-4">
                            <button
                                onClick={async () => {
                                    if (confirm("Сбросить весь прогресс, счет и таймеры и начать Игру с 1 раунда заново?")) {
                                        await fetch("/api/state", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "restart_match" }) });
                                    }
                                }}
                                className="px-6 py-3 bg-red-500 text-white font-bold rounded-xl shadow-lg hover:bg-red-600 active:scale-95 transition-all text-sm"
                            >
                                🔄 Рестарт текущей игры (с 1 раунда)
                            </button>
                            <button
                                onClick={async () => {
                                    await fetch("/api/state", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "test_event" }) });
                                }}
                                className="px-6 py-3 bg-purple-500 text-white font-bold rounded-xl shadow-lg hover:bg-purple-600 active:scale-95 transition-all text-sm flex items-center gap-2"
                            >
                                ⚡ Тест случайного Доната / Баффа
                            </button>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
}
