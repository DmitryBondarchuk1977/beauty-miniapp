import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

const tg = window.Telegram?.WebApp;

export default function App() {
  const [specialists, setSpecialists] = useState<{ id: string; full_name: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    tg?.ready();
    tg?.expand();
    supabase
      .from("specialists")
      .select("id, full_name")
      .eq("is_active", true)
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setSpecialists(data ?? []);
      });
  }, []);

  const name = tg?.initDataUnsafe?.user?.first_name ?? "гость";

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: "8px 0" }}>Привет, {name}! 👋</h1>
      <p style={{ color: "#777", marginTop: 0 }}>BeautyApp — запись в салон красоты</p>

      <div style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: "#555" }}>Проверка связи с базой</h2>
        {error ? (
          <p style={{ color: "crimson" }}>Ошибка: {error}</p>
        ) : (
          <p style={{ color: "#333" }}>Активных мастеров: {specialists.length}</p>
        )}
        <ul style={{ color: "#333" }}>
          {specialists.map((s) => (
            <li key={s.id}>{s.full_name}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}