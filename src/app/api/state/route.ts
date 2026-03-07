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
            // Генерация 5 раундов со случайным уровнем сложности
            const levels = [1, 2, 3, 4, 5];
            for (let i = levels.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [levels[i], levels[j]] = [levels[j], levels[i]];
            }
            state.roundOrder = levels;
            state.currentRound = 1;
            state.status = "PLAYING";
            state.roundStartTime = Date.now();
            const firstLevel = levels[0];
            state.timeLimit = firstLevel * 120; // От 2 до 10 минут (уровень * 120 сек)
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
            if (state.currentRound <= 5) {
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
                const mTask = state.tasks.mathematics.find((t) => t.level === level);
                calculateScore(tPlayer, mTask);

                // Для Математики (Учеников) проверяем ответы по информатике
                const iTask = state.tasks.informatics.find((t) => t.level === level);
                ["student1", "student2"].forEach((st) => {
                    const sPlayer = state.players[st as Role];
                    calculateScore(sPlayer, iTask);
                });
            }

            if (state.currentRound < 5) {
                state.currentRound += 1;
                state.roundStartTime = Date.now();
                const nextLevel = state.roundOrder[state.currentRound - 1];
                state.timeLimit = nextLevel * 120; // Уровень * 120 секунд
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
            const levels = [1, 2, 3, 4, 5];
            for (let i = levels.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [levels[i], levels[j]] = [levels[j], levels[i]];
            }
            state.roundOrder = levels;
            state.currentRound = 1;
            state.status = "PLAYING";
            state.roundStartTime = Date.now();
            state.timeLimit = levels[0] * 120;
            state.events = [];

            ["teacher", "student1", "student2"].forEach(r => {
                state.players[r as Role].score = 0;
                state.players[r as Role].answers = {};
                state.players[r as Role].timeTaken = {};
            });
            writeGameState(state);
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
