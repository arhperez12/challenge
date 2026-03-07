"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GameState, Role } from "@/lib/types";

export default function ResultsPage() {
    const router = useRouter();
    const [role, setRole] = useState<Role | null>(null);
    const [gameState, setGameState] = useState<GameState | null>(null);

    useEffect(() => {
        const savedRole = localStorage.getItem("ege_role") as Role | null;
        if (!savedRole) {
            router.push("/");
        } else {
            setRole(savedRole);
        }

        const fetchState = async () => {
            try {
                const res = await fetch("/api/state");
                if (res.ok) {
                    const state: GameState = await res.json();
                    setGameState(state);
                }
            } catch (e) { }
        };
        fetchState();
    }, [router]);

    if (!gameState || !role) {
        return (
            <div className="flex items-center justify-center min-h-[80vh]">
                <div className="text-2xl font-bold animate-pulse text-[var(--primary)] text-center">
                    📊 Подведение итогов 📊
                </div>
            </div>
        );
    }

    const { players, tasks, roundOrder, expectedStudents = 2 } = gameState;

    const handleRestart = async () => {
        try {
            if (role !== "teacher") return;
            await fetch("/api/state", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "reset" }),
            });
            router.push("/");
        } catch (e) {
            alert("Ошибка при перезапуске");
        }
    };

    const PlayerScoreCard = ({
        pRole, label, icon
    }: {
        pRole: Role, label: string, icon: string
    }) => (
        <div className={`p-6 rounded-3xl flex flex-col items-center justify-center gap-2 ${pRole === role ? "neu-pressed border-2 border-[var(--primary)]" : "neu-flat"}`}>
            <div className="text-5xl">{icon}</div>
            <h3 className="text-lg font-bold opacity-80">{label}</h3>
            <div className="text-4xl font-black text-[var(--primary)]">
                {players[pRole].score} / 5
            </div>
        </div>
    );

    return (
        <div className="w-full flex flex-col items-center min-h-[80vh] py-6">
            <div className="text-center mb-12">
                <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500 drop-shadow-sm mb-4">
                    ИТОГИ ЧЕЛЛЕНДЖА 🎉
                </h1>
                <p className="text-xl font-medium opacity-70">
                    Информатика против Математики
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 w-full max-w-4xl mb-12">
                <PlayerScoreCard pRole="teacher" label="Учитель" icon="👨‍🏫" />
                {Array.from({ length: expectedStudents }).map((_, i) => {
                    const stRole = `student${i + 1}` as Role;
                    // Only render if player played or exists
                    if (!players[stRole]) return null;
                    return (
                        <PlayerScoreCard
                            key={stRole}
                            pRole={stRole}
                            label={`Ученик ${i + 1}`}
                            icon="🧑‍🎓"
                        />
                    );
                })}
            </div>

            {/* Details/Review - show correct answers for the current user's role */}
            <div className="w-full max-w-4xl neu-convex p-8 rounded-3xl">
                <h2 className="text-2xl font-bold mb-6 text-center text-[var(--foreground)]">Разбор полетов</h2>
                <div className="space-y-6">
                    {roundOrder.map((level, idx) => {
                        const roundNum = idx + 1;
                        // Define which task pool the user solved
                        const pool = role === "teacher" ? tasks.mathematics : tasks.informatics;
                        const task = pool.find(t => t.level === level);
                        const userAnswer = players[role!].answers[roundNum] || "Нет ответа";
                        const correctAnswer = task?.answer || "Н/Д";
                        const isCorrect = userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();

                        return (
                            <div key={roundNum} className={`p-4 rounded-xl flex flex-col sm:flex-row justify-between items-center ${isCorrect ? "neu-flat border-l-4 border-green-500" : "neu-flat border-l-4 border-red-500"}`}>
                                <div className="mb-2 sm:mb-0 text-center sm:text-left">
                                    <span className="font-bold opacity-70 block text-xs uppercase mb-1">
                                        Раунд {roundNum} (Уровень {level})
                                    </span>
                                    <span className="font-medium text-lg block">
                                        Ваш ответ: <span className={isCorrect ? "text-green-600 font-bold" : "text-red-500 font-bold"}>{userAnswer}</span>
                                    </span>
                                </div>
                                <div className="text-center sm:text-right">
                                    <span className="font-bold opacity-70 block text-xs uppercase mb-1">
                                        Правильный ответ
                                    </span>
                                    <span className="font-bold text-lg text-green-600 block">
                                        {correctAnswer}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {role === "teacher" && (
                <div className="mt-12 text-center w-full max-w-sm">
                    <button
                        onClick={handleRestart}
                        className="w-full py-4 bg-red-500 text-white font-bold text-xl rounded-2xl shadow-lg hover:bg-red-600 active:scale-95 transition-all"
                    >
                        Сбросить игру
                    </button>
                </div>
            )}
            {role !== "teacher" && (
                <div className="mt-12 text-center text-sm opacity-50 font-bold">
                    Ожидание действий Учителя...
                </div>
            )}
        </div>
    );
}
