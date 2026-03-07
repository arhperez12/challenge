const Centrifuge = require("centrifuge");
const WebSocket = require("ws");
const fetch = require("node-fetch");
require("dotenv").config();

// 1. Настройки DonationAlerts
// Ваш уникальный токен из виджета оповещений (токен, который идёт после ?token= в ссылке для OBS)
const DA_TOKEN = process.env.DA_TOKEN;

// 2. Настройки вашей игры EGE
const GAME_API_URL = "http://localhost:3000/api/interactive";
// ^ Если игра запущена на том же сервере на порту 3000

if (!DA_TOKEN) {
    console.error("❌ ОШИБКА: Токен DonationAlerts (DA_TOKEN) не найден в .env файле!");
    process.exit(1);
}

// 3. Подключение к Centrifugo (Websocket сервер DonationAlerts)
const centrifuge = new Centrifuge("wss://centrifugo.donationalerts.com/connection/websocket", {
    websocket: WebSocket,
    onRefresh: function (ctx, cb) {
        // В случае устаревания токена
        console.log("🔄 Обновление токена...");
    }
});

centrifuge.setToken(DA_TOKEN);

centrifuge.on("connect", function (context) {
    console.log("✅ Успешно подключено к DonationAlerts!");
});

centrifuge.on("disconnect", function (context) {
    console.log("⚠️ Отключено от DonationAlerts. Причина:", context.reason);
});

// Слушаем канал оповещений
// Формат канала: $alerts:user_id (ID пользователя можно узнать через API, но с токеном виджета мы подписываемся на персональный канал)
// Для Centrifugo v2+ достаточно подписаться на канал с токеном
const channel = `$alerts:api_key_${DA_TOKEN}`; // Упрощенно для токена виджета, но если вы используете OAuth 토кен, нужно знать ваш ID
// ВАЖНО: Чаще всего для простых скриптов нужно получить ID пользователя.
// Если это сложно, мы используем универсальную подписку (зависит от версии DA API).

// Подписка на донаты
centrifuge.subscribe(channel, function (message) {
    console.log("💰 Получен новый донат:", message.data);

    const donation = message.data;
    const username = donation.username || "Аноним";
    const amount = parseFloat(donation.amount);
    const text = donation.message ? donation.message.toLowerCase() : "";

    console.log(`[${amount} RUB] от ${username}: ${text}`);

    // 4. Логика обработки доната для EGE Challenge
    processDonation(amount, text, username);
});

centrifuge.connect();


// --- Обработка логики игры ---

async function sendToGame(eventType, targetRole, value, messageText) {
    try {
        const response = await fetch(GAME_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: eventType,
                targetRole: targetRole,
                value: value,
                message: messageText
            })
        });

        if (response.ok) {
            console.log(`🎮 Эффект [${eventType}] успешно отправлен в игру!`);
        } else {
            console.error(`❌ Ошибка отправки в игру (Статус ${response.status})`);
        }
    } catch (err) {
        console.error(`❌ Ошибка соединения с игрой:`, err.message);
    }
}

function processDonation(amount, text, username) {
    // Минимальная сумма для активации интерактива
    if (amount < 50) return;

    // Парсим текст сообщения, чтобы найти команды

    if (text.includes("!тряска")) {
        // Трясет экран всех игроков на 5 секунд
        sendToGame("shake", "all", 5, `${username} устроил землетрясение!`);
    }
    else if (text.includes("!переворот")) {
        // Переворачивает экран всех игроков на 10 секунд
        sendToGame("flip", "all", 10, `${username} перевернул игру!`);
    }
    else if (text.includes("!блюр учителя") || text.includes("!мыло учителю")) {
        // Замыливает экран учителю на 15 секунд (стоит дороже)
        if (amount >= 100) {
            sendToGame("blur", "teacher", 15, `${username} забанил очки Учителю!`);
        } else {
            console.log("Недостаточно средств для !блюр учителя (нужно 100)");
        }
    }
    else if (text.includes("!блюр ученикам") || text.includes("!мыло ученикам")) {
        // Замыливает экран ученикам на 15 секунд
        if (amount >= 100) {
            sendToGame("blur", "student1", 15, ""); // Для первого
            sendToGame("blur", "student2", 15, `${username} ослепил учеников!`); // Для второго (с сообщением)
        }
    }
    else if (text.includes("!плюс_время")) {
        // Добавляет 30 секунд к текущему раунду
        sendToGame("add_time", "all", 30, `${username} добавил 30 секунд!`);
    }
    else if (text.includes("!минус_время")) {
        // Отнимает 30 секунд от текущего раунда (стоит дороже)
        if (amount >= 100) {
            sendToGame("reduce_time", "all", 30, `${username} украл время! Спешите!`);
        }
    }
    else if (text.includes("!помощь") || text.includes("!хинт")) {
        // Выводит текст доната как подсказку на экран
        // Вырезаем команду из текста
        const hintMsg = text.replace("!помощь", "").replace("!хинт", "").trim();
        sendToGame("hint", "all", 0, hintMsg || "Держитесь, ребята! (пустая подсказка)");
    }
}

console.log("🟢 Бот запущен и ждет донатов...");
