import { NextRequest, NextResponse } from "next/server";
import { readGameState, writeGameState } from "@/lib/gameStore";
import { GameEvent, Role } from "@/lib/types";

// POST /api/interactive
// Ожидаемое тело: { type: "add_time" | "reduce_time" | "hint" | "interference", targetRole: Role | "all", value?: number, message?: string }
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Simple security check (could be an API key in production)
        const apiKey = req.headers.get("Authorization");
        if (process.env.INTERACTIVE_SECRET && apiKey !== `Bearer ${process.env.INTERACTIVE_SECRET}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const state = readGameState();

        // Только если игра идет
        if (state.status !== "PLAYING") {
            return NextResponse.json({ error: "Game is not playing currently" }, { status: 400 });
        }

        const { type, targetRole, targetName, value, message } = body;

        if (!type || !targetRole) {
            return NextResponse.json({ error: "Missing type or targetRole" }, { status: 400 });
        }

        // Generate a unique ID for the event so clients can track what they have processed
        const eventId = Math.random().toString(36).substring(2, 9);
        const newEvent: GameEvent = {
            id: eventId,
            type,
            targetRole,
            targetName,
            value,
            message
        };

        // Обработка событий, влияющих на общий стейт напрямую (например изменение таймера или очков)
        if (type === "add_time") {
            const timeToAdd = value || 10;
            state.timeLimit += timeToAdd;
        } else if (type === "reduce_time") {
            const timeToReduce = value || 10;
            state.timeLimit = Math.max(5, state.timeLimit - timeToReduce);
        } else if (type === "add_points" && targetRole !== "all") {
            const pointsToAdd = value || 100;
            const targetPlayerRole = targetRole as Role;
            if (state.players[targetPlayerRole]) {
                state.players[targetPlayerRole].score += pointsToAdd;
            }
        }

        // Добавляем событие в стек (чтобы клиенты могли показать анимацию)
        state.events.push(newEvent);

        writeGameState(state);

        return NextResponse.json({ success: true, event: newEvent });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
