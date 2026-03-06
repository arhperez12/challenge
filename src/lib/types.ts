export type Role = "teacher" | "student1" | "student2";
export type GameStatus = "LOBBY" | "PLAYING" | "FINISHED";

export interface Task {
    level: number;
    question: string;
    imageUrl?: string;
    answer: string;
}

export interface Player {
    isReady: boolean;
    score: number;
    sheetUrl?: string;
    answers: Record<number, string>; // mapping from round number (1-5) to string answer
    timeTaken: Record<number, number>; // mapping from round number to seconds taken to answer
}

export interface GameEvent {
    id: string;
    type: "add_time" | "reduce_time" | "add_points" | "hint" | "interference" | "blur" | "flip" | "shake";
    targetRole: Role | "all";
    targetName?: string;
    value?: number; // e.g., seconds to add/remove, or points
    message?: string; // Alert message
}

export interface GameState {
    status: GameStatus;
    currentRound: number; // 1 to 5
    roundOrder: number[]; // e.g., [3, 1, 5, 2, 4] denoting the level logic for each of the 5 rounds
    roundStartTime: number | null; // Epoch timestamp of when the round began
    timeLimit: number; // Base time limit in seconds for the current round
    events: GameEvent[]; // Interactive events from Twitch/DonationAlerts
    players: Record<Role, Player>;
    tasks: {
        informatics: Task[];
        mathematics: Task[];
    };
}

export const initialGameState: GameState = {
    status: "LOBBY",
    currentRound: 1,
    roundOrder: [],
    roundStartTime: null,
    timeLimit: 60,
    events: [],
    players: {
        teacher: { isReady: false, score: 0, answers: {}, timeTaken: {} },
        student1: { isReady: false, score: 0, answers: {}, timeTaken: {} },
        student2: { isReady: false, score: 0, answers: {}, timeTaken: {} },
    },
    tasks: {
        informatics: [
            { level: 1, question: "Сколько мегабайт в 1 гигабайте?", answer: "1024" },
            { level: 2, question: "Переведите число 13 в двоичную систему счисления.", answer: "1101" },
            { level: 3, question: "Какое максимальное число можно закодировать 1 байтом?", answer: "255" },
            { level: 4, question: "Решите логическое уравнение: 1 AND (0 OR 1).", answer: "1" },
            { level: 5, question: "Вычислите 2^10.", answer: "1024" }
        ],
        mathematics: [
            { level: 1, question: "Вычислите 15 + 28.", answer: "43" },
            { level: 2, question: "Найдите площадь квадрата со стороной 5.", answer: "25" },
            { level: 3, question: "Решите уравнение 2x - 4 = 10.", answer: "7" },
            { level: 4, question: "Чему равен корень из 144?", answer: "12" },
            { level: 5, question: "Найдите значение выражения 3^3.", answer: "27" }
        ],
    },
};
