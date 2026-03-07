import { NextRequest, NextResponse } from "next/server";
import { readGameState, writeGameState, resetGameState } from "@/lib/gameStore";
import { fetchAndParseTasks } from "@/lib/csvParser";
import { Role, Player } from "@/lib/types";

export async function GET() {
    const state = readGameState();
    return NextResponse.json(state);
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { action, payload } = body;
        let state = readGameState();

        if (action === "join") {
            const { role, sheetUrl } = payload as { role: Role; sheetUrl: string };
            state.players[role].isReady = true;
            state.players[role].sheetUrl = sheetUrl;

            // Загрузить задания
            if (sheetUrl && sheetUrl !== "test") {
                try {
                    const tasks = await fetchAndParseTasks(sheetUrl);
                    if (role === "teacher") {
                        state.tasks.informatics = tasks;
                    } else {
                        // Для математики просто объединяем задания, так как учеников двое. 
                        // Либо ученики загружают одну и ту же таблицу, либо разные.
                        // Но мы будем использовать единый пул математики из первой загруженной таблицы.
                        if (state.tasks.mathematics.length === 0) {
                            state.tasks.mathematics = tasks;
                        }
                    }
                } catch (err: any) {
                    return NextResponse.json({ error: "Failed to parse CSV: " + err.message }, { status: 400 });
                }
            }
            writeGameState(state);
            return NextResponse.json(state);
        }

        if (action === "start") {
            const { totalRounds = 5, allowedLevels = [1, 2, 3, 4, 5] } = payload || {};

            // Генерация раундов из пула разрешенных уровней
            const levels = [];
            for (let i = 0; i < totalRounds; i++) {
                levels.push(allowedLevels[Math.floor(Math.random() * allowedLevels.length)]);
            }
            state.totalRounds = totalRounds;
            state.allowedLevels = allowedLevels;
            state.roundOrder = levels;
            state.currentRound = 1;
            state.status = "PLAYING";
            state.roundStartTime = Date.now();

            const firstLevel = levels[0];
            const getLevelTime = (lvl: number) => ({ 1: 120, 2: 300, 3: 480, 4: 720, 5: 900 }[lvl] || 120);
            state.timeLimit = getLevelTime(firstLevel);
            state.events = [];
            writeGameState(state);
            return NextResponse.json(state);
        }

        if (action === "submit") {
            const { role, answer, round } = payload as { role: Role; answer: string; round: number };
            state.players[role].answers[round] = answer;

            // Record time taken
            if (state.roundStartTime) {
                const timeTaken = Math.floor((Date.now() - state.roundStartTime) / 1000);
                state.players[role].timeTaken[round] = timeTaken;
            } else {
                state.players[role].timeTaken[round] = state.timeLimit;
            }

            writeGameState(state);
            return NextResponse.json(state);
        }

        if (action === "next_round") {
            if (state.currentRound <= state.totalRounds) {
                // Подсчет результатов за текущий раунд (score)
                const levels = state.roundOrder;
                const roundIdx = state.currentRound - 1;
                const level = levels[roundIdx];

                // Формула: (level * 100) базово + бонус за оставшееся время
                const calculateScore = (player: Player, correctTask: any) => {
                    const ans = player.answers[state.currentRound];
                    if (correctTask && ans && correctTask.answer.toLowerCase() === ans.toLowerCase()) {
                        const baseScore = level * 100;
                        const timeTaken = player.timeTaken[state.currentRound] || state.timeLimit;
                        const remainingTime = Math.max(0, state.timeLimit - timeTaken);
                        // Добавляем 2 очка за каждую сэкономленную секунду
                        player.score += baseScore + (remainingTime * 2);
                    }
                };

                // Для Информатики (Учителя) проверяем ответы на задания по математике
                const tPlayer = state.players["teacher"];
                const offsetM = tPlayer.replacedTaskOffsets?.[level] || 0;
                const mTasksForLevel = state.tasks.mathematics.filter((t) => t.level === level);
                const mTask = mTasksForLevel[offsetM % mTasksForLevel.length || 0];
                calculateScore(tPlayer, mTask);

                // Для Математики (Учеников) проверяем ответы по информатике
                const iTasksForLevel = state.tasks.informatics.filter((t) => t.level === level);
                ["student1", "student2"].forEach((st) => {
                    const sPlayer = state.players[st as Role];
                    const offsetI = sPlayer.replacedTaskOffsets?.[level] || 0;
                    const iTask = iTasksForLevel[offsetI % iTasksForLevel.length || 0];
                    calculateScore(sPlayer, iTask);
                });
            }

            if (state.currentRound < state.totalRounds) {
                state.currentRound += 1;
                state.roundStartTime = Date.now();
                const nextLevel = state.roundOrder[state.currentRound - 1];
                const getLevelTime = (lvl: number) => ({ 1: 120, 2: 300, 3: 480, 4: 720, 5: 900 }[lvl] || 120);
                state.timeLimit = getLevelTime(nextLevel);
                state.events = [];
            } else {
                state.status = "FINISHED";
                state.roundStartTime = null;
                state.events = [];
            }
            writeGameState(state);
            return NextResponse.json(state);
        }

        if (action === "reset") {
            state = resetGameState();
            return NextResponse.json(state);
        }

        if (action === "restart_match") {
            const allowedLevels = state.allowedLevels || [1, 2, 3, 4, 5];
            const totalRounds = state.totalRounds || 5;

            const levels = [];
            for (let i = 0; i < totalRounds; i++) {
                levels.push(allowedLevels[Math.floor(Math.random() * allowedLevels.length)]);
            }
            state.roundOrder = levels;
            state.currentRound = 1;
            state.status = "PLAYING";
            state.roundStartTime = Date.now();
            const getLevelTime = (lvl: number) => ({ 1: 120, 2: 300, 3: 480, 4: 720, 5: 900 }[lvl] || 120);
            state.timeLimit = getLevelTime(levels[0]);
            state.events = [];

            ["teacher", "student1", "student2"].forEach(r => {
                state.players[r as Role].score = 0;
                state.players[r as Role].answers = {};
                state.players[r as Role].timeTaken = {};
                state.players[r as Role].hasUsedReplace = false;
                state.players[r as Role].replacedTaskOffsets = {};
            });
            writeGameState(state);
            return NextResponse.json(state);
        }

        if (action === "replace_task") {
            const { role, round } = payload as { role: Role, round: number };
            const player = state.players[role];

            if (player && !player.hasUsedReplace) {
                const currentLevel = state.roundOrder[round - 1];
                player.hasUsedReplace = true;
                if (!player.replacedTaskOffsets) player.replacedTaskOffsets = {};
                player.replacedTaskOffsets[currentLevel] = (player.replacedTaskOffsets[currentLevel] || 0) + 1;
                writeGameState(state);
            }
            return NextResponse.json(state);
        }

        if (action === "test_event") {
            const types = ["blur", "flip", "shake", "hint", "add_time", "reduce_time", "add_points"];
            const type = types[Math.floor(Math.random() * types.length)];
            const targets: ("all" | Role)[] = ["all", "teacher", "student1", "student2"];
            const targetRole = targets[Math.floor(Math.random() * targets.length)];

            const event: any = {
                id: Math.random().toString(36).substring(7),
                type,
                targetRole,
                value: type === "add_points" ? 500 : (type.includes("time") ? 30 : 5),
                message: type === "hint" ? "Тестовая подсказка из чата!" : `Тест эффекта: ${type}`,
                timestamp: Date.now()
            };

            state.events.push(event);

            if (type === "add_time") {
                state.timeLimit += 30;
            } else if (type === "reduce_time") {
                state.timeLimit = Math.max(10, state.timeLimit - 30);
            } else if (type === "add_points") {
                if (targetRole !== "all") {
                    state.players[targetRole as Role].score += 500;
                }
            }
            writeGameState(state);
            return NextResponse.json(state);
        }

        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
