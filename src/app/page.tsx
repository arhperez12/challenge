"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Role } from "@/lib/types";

// Фиксированные учетные данные
const USERS: Record<string, { role: Role; pass: string }> = {
  teacher: { role: "teacher", pass: "inf100" },
  student1: { role: "student1", pass: "mat100" },
  student2: { role: "student2", pass: "mat100" },
};

export default function Home() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const userLogin = login.trim().toLowerCase();
    const user = USERS[userLogin];

    if (!user) {
      setError("Пользователь не найден");
      return;
    }

    if (user.pass !== password) {
      setError("Неверный пароль");
      return;
    }

    // Сохраняем роль и переходим в лобби
    localStorage.setItem("ege_role", user.role);
    router.push("/lobby");
  };

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center min-h-[80vh]">
      <div className="neu-convex p-8 sm:p-12 w-full text-center space-y-8 rounded-3xl">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--primary)] drop-shadow-sm mb-2">
            Вход в Систему 🔐
          </h1>
          <p className="text-sm text-[var(--foreground)]/70">
            Введите свой логин и пароль для доступа к челленджу.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6 pt-4 text-left">
          <div className="flex flex-col gap-2">
            <label className="font-bold text-sm ml-2">Логин:</label>
            <input
              type="text"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="Например: teacher"
              className="w-full p-4 rounded-2xl neu-pressed bg-transparent outline-none focus:ring-2 ring-[var(--primary)] transition-all font-mono"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-bold text-sm ml-2">Пароль:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите пароль..."
              className="w-full p-4 rounded-2xl neu-pressed bg-transparent outline-none focus:ring-2 ring-[var(--primary)] transition-all font-mono"
            />
          </div>

          {error && (
            <div className="text-red-500 font-bold text-sm text-center pt-2 animate-pulse">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-4 text-lg font-bold rounded-2xl shadow-md bg-[var(--primary)] text-white hover:bg-blue-600 active:scale-95 transition-all mt-4"
          >
            Войти
          </button>
        </form>

        <div className="pt-6 border-t border-gray-300/50 text-xs text-gray-500 text-left space-y-1">
          <p className="font-bold underline mb-2">Доступные аккаунты:</p>
          <p>🧑‍🏫 Логин: <b>teacher</b> | Пароль: <b>inf100</b></p>
          <p>🧑‍🎓 Логин: <b>student1</b> | Пароль: <b>mat100</b></p>
          <p>👨‍🎓 Логин: <b>student2</b> | Пароль: <b>mat100</b></p>
        </div>
      </div>
    </div>
  );
}
