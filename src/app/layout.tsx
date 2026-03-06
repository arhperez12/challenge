import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin", "cyrillic"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "EGE Challenge",
  description: "Интерактивная платформа для челленджей по ЕГЭ (Информатика vs Математика)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${outfit.variable} font-[family-name:var(--font-outfit)] antialiased`}>
        <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center p-4 sm:p-8">
          <main className="w-full max-w-5xl">{children}</main>
        </div>
      </body>
    </html>
  );
}
