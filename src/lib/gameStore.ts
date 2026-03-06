import fs from "fs";
import path from "path";
import { GameState, initialGameState } from "./types";

const STATE_FILE = path.resolve(process.cwd(), "game-state.json");

export function readGameState(): GameState {
    try {
        if (!fs.existsSync(STATE_FILE)) {
            writeGameState(initialGameState);
            return initialGameState;
        }
        const data = fs.readFileSync(STATE_FILE, "utf-8");
        return JSON.parse(data) as GameState;
    } catch (error) {
        console.error("Error reading game state:", error);
        return initialGameState;
    }
}

export function writeGameState(state: GameState): void {
    try {
        fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
    } catch (error) {
        console.error("Error writing game state:", error);
    }
}

export function resetGameState(): GameState {
    writeGameState(initialGameState);
    return initialGameState;
}
