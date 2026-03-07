"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GameState } from "@/lib/types";

// Define role types for clarity
export type Role = "teacher" | "student1" | "student2" | "student3" | "student4" | "student5";

export default function LobbyPage() {
    const router = useRouter();
    const [role, setRole] = useState<Role | null>(null);
    const [sheetUrl, setSheetUrl] = useState("");
    const [isReady, setIsReady] = useState(false);
    const [loading, setLoading] = useState(true);
    const [gameState, setGameState] = useState<GameState | null>(null);

    // Settings
    const [totalRounds, setTotalRounds] = useState(5);
    const [allowedLevels, setAllowedLevels] = useState<number[]>([1, 2, 3, 4, 5]);
    const [expectedStudents, setExpectedStudents] = useState<number>(2);

    useEffect(() => {
        // Check local storage for selected role
        const savedRole = localStorage.getItem("ege_role") as Role | null;
        if (!savedRole) {
            router.push("/");
        } else {
            setRole(savedRole);
        }
        setLoading(false);
    }, [router]);

    // Polling game state
    useEffect(() => {
        if (!role) return;
        const interval = setInterval(async () => {
            try {
                const res = await fetch("/api/state");
                if (res.ok) {
                    const state = await res.json();
                    setGameState(state);
                    setGameState(state);
                    // If teacher started the game AND current player is ready, go to challenge
                    if (state.status === "PLAYING" && isReady) {
                        router.push("/challenge");
                    }
                }
            } catch (e) {
                // ignore network error on polling
            }
        }, 2000);
        return () => clearInterval(interval);
    }, [role, router]);

    const handleReady = async () => {
        if (!sheetUrl) return;

        // Validate simple Google Sheet link
        if (sheetUrl !== "test" && !sheetUrl.includes("docs.google.com/spreadsheets")) {
            alert("Пожалуйста, вставьте корректную ссылку на Google Таблицу (или 'test' для встроенных заданий).");
            return;
        }

        try {
            setLoading(true);
            const res = await fetch("/api/state", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "join", payload: { role, sheetUrl } }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Ошибка при добавлении в лобби");

            setIsReady(true);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleStart = async () => {
        if (allowedLevels.length === 0) {
            alert("Выберите хотя бы один уровень сложности!");
            return;
        }
        try {
            await fetch("/api/state", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "start",
                    payload: { totalRounds, allowedLevels, expectedStudents }
                }),
            });
        } catch (e) {
            alert("Не удалось запустить игру");
        }
    };

    const toggleLevel = (lvl: number) => {
        setAllowedLevels(prev =>
            prev.includes(lvl) ? prev.filter(l => l !== lvl) : [...prev, lvl].sort((a, b) => a - b)
        );
    };

    const handleForceReset = async () => {
        if (!confirm("Вы уверены, что хотите прервать текущую игру для всех?")) return;
        try {
            await fetch("/api/state", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "reset" }),
            });
            setIsReady(false);
            setSheetUrl("");
        } catch (e) {
            alert("Не удалось сбросить игру");
        }
    };

    const isAllReady = () => {
        if (!gameState) return false;
        if (!gameState.players.teacher.isReady) return false;
        const countToWait = role === "teacher" ? expectedStudents : gameState.expectedStudents;
        for (let i = 1; i <= countToWait; i++) {
            const studentRole = `student${i}` as Role;
            if (!gameState.players[studentRole]?.isReady) return false;
        }
        return true;
    };
    const allReady = isAllReady();

    if (loading || !role) return null;

    const roleNameMap: Record<string, string> = {
        teacher: "Учитель (Информатика)",
        student1: "Ученик 1 (Математика)",
        student2: "Ученик 2 (Математика)",
        student3: "Ученик 3 (Математика)",
        student4: "Ученик 4 (Математика)",
        student5: "Ученик 5 (Математика)",
    };

    return (
        <div className="w-full max-w-3xl mx-auto flex flex-col items-center justify-center min-h-[80vh] py-6">
            <div className="neu-convex p-8 sm:p-12 w-full space-y-8 rounded-3xl">
                <div className="text-center">
                    <div className="text-6xl mb-4">
                        {role === "teacher" ? "👨‍🏫" : "🧑‍🎓"}
                    </div>
                    <h1 className="text-3xl font-bold text-[var(--primary)] uppercase tracking-wide">
                        {roleNameMap[role] || "Участник"}
                    </h1>
                    <p className="mt-4 text-[var(--foreground)]/70 text-lg font-medium">
                        Добро пожаловать в лобби
                    </p>
                </div>

                {/* Инструкция по структуре таблицы */}
                <div className="neu-flat p-6 rounded-2xl flex flex-col gap-3 text-sm">
                    <h3 className="font-bold text-[var(--primary)] text-lg mb-1 flex items-center gap-2">
                        <span>ℹ️</span> Инструкция по заполнению таблицы
                    </h3>
                    <p className="text-[var(--foreground)]/80">
                        Опубликуйте Google Таблицу (Файл → Поделиться → Опубликовать в интернете → Формат: Ссылка) и вставьте ссылку ниже.
                    </p>
                    <div className="bg-white/40 p-4 rounded-xl shadow-inner text-gray-800">
                        <p className="font-bold mb-2 underline">Структура колонок (строго слева направо):</p>
                        <ol className="list-decimal list-inside space-y-1 ml-2 font-mono break-words">
                            <li><b>Уровень</b> (число от 1 до 5)</li>
                            <li><b>Текст задания</b> (например: "Решите уравнение x+2=4")</li>
                            <li><b>Ссылка на картинку</b> (URL, если нужна. Иначе оставьте пустой)</li>
                            <li><b>Правильный ответ</b> (например: "2")</li>
                        </ol>
                    </div>
                    <p className="text-xs text-red-500 font-bold mt-1">
                        * Обязательно добавьте по одному заданию для каждого уровня от 1 до 5!
                    </p>
                </div>

                {gameState?.status === "PLAYING" ? (
                    <div className="neu-flat p-6 rounded-2xl flex flex-col gap-4 border-2 border-green-500/50 bg-green-500/10">
                        <label className="font-bold text-lg text-green-500">
                            ▶️ Игра уже в процессе!
                        </label>
                        <p className="text-sm opacity-80">
                            Матч уже начался. Вы можете присоединиться к текущей игре.
                        </p>
                        <button
                            onClick={() => router.push("/challenge")}
                            className="w-full py-4 bg-green-500 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl hover:bg-green-600 active:scale-95 transition-all mt-2 animate-bounce"
                        >
                            Присоединиться к активной игре
                        </button>
                        {role === "teacher" && (
                            <button
                                onClick={handleForceReset}
                                className="w-full py-3 bg-red-500 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl hover:bg-red-600 active:scale-95 transition-all mt-2 opacity-80"
                            >
                                Прервать и сбросить игру
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="neu-flat p-6 rounded-2xl flex flex-col gap-4">
                            <label className="font-bold text-lg text-[var(--foreground)]">
                                Ссылка на опубликованную Google Таблицу:
                            </label>
                            <input
                                type="text"
                                value={sheetUrl}
                                onChange={(e) => setSheetUrl(e.target.value)}
                                disabled={isReady}
                                placeholder="Вставьте ссылку https://docs.google.com... или 'test'"
                                className="w-full p-4 rounded-xl neu-pressed bg-transparent outline-none focus:ring-2 ring-[var(--primary)] transition-all font-mono text-sm"
                            />
                        </div>

                        <button
                            onClick={handleReady}
                            disabled={!sheetUrl || isReady}
                            className={`w-full py-4 text-xl font-bold rounded-2xl transition-all duration-300 ${isReady
                                ? "neu-pressed text-green-500 opacity-80"
                                : sheetUrl
                                    ? "neu-button text-[var(--primary)] hover:scale-[1.02]"
                                    : "neu-flat opacity-50 cursor-not-allowed"
                                }`}
                        >
                            {isReady ? "Ожидаем других игроков..." : "Я готов!"}
                        </button>
                    </>
                )}

                {role === "teacher" && (
                    <div className="pt-8 border-t border-[var(--foreground)]/10 text-center flex flex-col items-center">
                        <div className="w-full neu-flat p-6 rounded-2xl mb-6 text-left">
                            <h3 className="font-bold text-[var(--primary)] mb-4">⚙️ Настройки матча:</h3>

                            <div className="flex flex-col gap-4">
                                <label className="flex flex-col gap-2 font-medium">
                                    <span>Количество раундов:</span>
                                    <input
                                        type="number"
                                        min="1" max="20"
                                        value={totalRounds}
                                        onChange={(e) => setTotalRounds(Number(e.target.value) || 1)}
                                        className="p-3 rounded-xl neu-pressed bg-transparent outline-none w-32"
                                    />
                                </label>

                                <label className="flex flex-col gap-2 font-medium">
                                    <span>Количество учеников:</span>
                                    <input
                                        type="number"
                                        min="1" max="5"
                                        value={expectedStudents}
                                        onChange={(e) => setExpectedStudents(Number(e.target.value) || 1)}
                                        className="p-3 rounded-xl neu-pressed bg-transparent outline-none w-32"
                                    />
                                </label>

                                <div className="space-y-2">
                                    <span className="font-medium">Доступные уровни сложности (пул):</span>
                                    <div className="flex flex-wrap gap-3">
                                        {[1, 2, 3, 4, 5].map(lvl => (
                                            <label key={lvl} className="flex items-center gap-2 cursor-pointer neu-pressed px-4 py-2 rounded-xl">
                                                <input
                                                    type="checkbox"
                                                    checked={allowedLevels.includes(lvl)}
                                                    onChange={() => toggleLevel(lvl)}
                                                    className="w-5 h-5 accent-[var(--primary)]"
                                                />
                                                Уровень {lvl}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleStart}
                            disabled={!allReady}
                            className={`px-12 py-4 rounded-2xl shadow-lg transition-all font-bold text-xl ${allReady
                                ? "bg-[var(--primary)] text-white hover:shadow-xl hover:bg-blue-600 hover:scale-105"
                                : "bg-gray-400 text-gray-200 cursor-not-allowed opacity-50"
                                }`}
                        >
                            🚀 Начать Челлендж
                        </button>
                        <p className="text-xs mt-3 text-gray-500">
                            * Доступно только после того, как все участники будут готовы.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
