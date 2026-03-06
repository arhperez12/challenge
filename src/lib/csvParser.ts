import Papa from "papaparse";
import { Task } from "./types";

/**
 * Ожидаемый формат CSV (без заголовков, или с ними, мы просто будем брать колонки по индексу или по смыслу).
 * Паттерн: [Уровень (1-5), Текст задания, Ссылка на картинку, Ответ]
 */
export async function fetchAndParseTasks(sheetUrl: string): Promise<Task[]> {
    try {
        let exportUrl = sheetUrl;
        // Если пользователь дал обычную ссылку, конвертируем в CSV экспорт
        if (exportUrl.includes("/edit")) {
            exportUrl = exportUrl.replace(/\/edit[^\/]*$/, "/export?format=csv");
        }

        const response = await fetch(exportUrl);
        if (!response.ok) {
            throw new Error("Не удалось загрузить таблицу по ссылке");
        }

        const csvText = await response.text();

        const parsed = Papa.parse(csvText, {
            skipEmptyLines: true,
            header: false, // Мы ожидаем колонки по порядку, чтобы не зависеть от названий заголовков
        });

        if (parsed.errors.length > 0) {
            console.warn("Предупреждения при парсинге CSV:", parsed.errors);
        }

        const tasks: Task[] = [];
        let isFirstRow = true;

        for (const row of parsed.data as any[][]) {
            // Пропускаем шапку, если она похожа на текст, а не на уровень (число)
            const levelStr = String(row[0]).trim();
            const levelNum = parseInt(levelStr, 10);

            if (isFirstRow && isNaN(levelNum)) {
                isFirstRow = false;
                continue;
            }
            isFirstRow = false;

            if (!isNaN(levelNum) && levelNum >= 1 && levelNum <= 5) {
                tasks.push({
                    level: levelNum,
                    question: String(row[1] || ""),
                    imageUrl: row[2] ? String(row[2]) : undefined,
                    answer: String(row[3] || "").trim(),
                });
            }
        }

        return tasks;
    } catch (error) {
        console.error("fetchAndParseTasks Error:", error);
        throw error;
    }
}
