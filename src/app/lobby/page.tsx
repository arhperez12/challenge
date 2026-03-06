"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GameState } from "@/lib/types";

// Define role types for clarity
export type Role = "teacher" | "student1" | "student2";

export default function LobbyPage() {
    const router = useRouter();
    const [role, setRole] = useState<Role | null>(null);
    const [sheetUrl, setSheetUrl] = useState("");
    const [isReady, setIsReady] = useState(false);
    const [loading, setLoading] = useState(true);
    const [gameState, setGameState] = useState<GameState | null>(null);

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
                    // If teacher started the game, go to challenge
                    if (state.status === "PLAYING") {
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
        try {
            await fetch("/api/state", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "start" }),
            });
        } catch (e) {
            alert("Не удалось запустить игру");
        }
    };

    const allReady = gameState &&
        gameState.players.teacher.isReady &&
        gameState.players.student1.isReady &&
        gameState.players.student2.isReady;

    if (loading || !role) return null;

    return (
        <div className="w-full max-w-3xl mx-auto flex flex-col items-center justify-center min-h-[80vh] py-6">
            <div className="neu-convex p-8 sm:p-12 w-full space-y-8 rounded-3xl">
                <div className="text-center">
                    <div className="text-6xl mb-4">
                        {role === "teacher" ? "👨‍🏫" : role === "student1" ? "🧑‍🎓" : "👨‍🎓"}
                    </div>
                    <h1 className="text-3xl font-bold text-[var(--primary)] uppercase tracking-wide">
                        {role === "teacher" ? "Учитель (Информатика)" : role === "student1" ? "Ученик 1 (Математика)" : "Ученик 2 (Математика)"}
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

                {/* Input area */}
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

                {role === "teacher" && (
                    <div className="pt-8 border-t border-[var(--foreground)]/10 text-center">
                        <button
                            onClick={handleStart}
                            disabled={!allReady}
                            className={`px-8 py-3 rounded-xl shadow-lg transition-all font-bold ${allReady
                                ? "bg-[var(--primary)] text-white hover:shadow-xl hover:bg-blue-600"
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
