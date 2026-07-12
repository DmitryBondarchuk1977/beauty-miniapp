import { useState } from "react";
import { apiMasterLink } from "./lib/api";

type TgWebApp = {
  requestContact?: (cb: (granted: boolean, event?: { status?: string; response?: string }) => void) => void;
};

const tg = (window as unknown as { Telegram?: { WebApp?: TgWebApp } }).Telegram?.WebApp;

export default function MasterLinkScreen({
  onLinked,
  onBack,
}: {
  onLinked: () => void;
  onBack: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);

  function fail(e?: string) {
    setErr(
      e === "not_found"
        ? "Номер не найден среди сотрудников. Попробуйте код привязки."
        : e === "bad_code"
        ? "Код неверный или просрочен. Запросите новый у администратора."
        : e === "bad_signature" || e === "contact_mismatch"
        ? "Не удалось подтвердить номер. Введите код привязки."
        : "Не удалось выполнить привязку.",
    );
  }

  function shareContact() {
    if (!tg?.requestContact) {
      setErr("Ваш Telegram не поддерживает отправку контакта. Используйте код.");
      return;
    }
    setErr(null);
    setBusy(true);

    tg.requestContact(async (granted, event) => {
      if (!granted || !event?.response) {
        setBusy(false);
        if (granted) setErr("Не удалось получить номер. Используйте код привязки.");
        return;
      }
      const r = await apiMasterLink({ contact: event.response });
      setBusy(false);
      if (r.status === 200 && r.data?.ok) onLinked();
      else fail(r.data?.error);
    });
  }

  async function submitCode() {
    const c = code.trim();
    if (c.length < 4) {
      setErr("Введите код полностью.");
      return;
    }
    setErr(null);
    setBusy(true);
    const r = await apiMasterLink({ code: c });
    setBusy(false);
    if (r.status === 200 && r.data?.ok) onLinked();
    else fail(r.data?.error);
  }

  return (
    <div>
      <button className="back-btn" onClick={onBack}>
        ‹ Назад
      </button>

      <div className="sect-title" style={{ marginTop: 0 }}>
        Вход для сотрудников
      </div>
      <div className="book-sub">
        Если вы мастер салона — подтвердите личность, и откроется ваш кабинет.
      </div>

      <div className="ml-block">
        <div className="ml-title">Способ 1 — поделиться контактом</div>
        <div className="ml-text">
          Telegram передаст ваш номер. Если он совпадёт с номером в базе салона, кабинет откроется сразу.
        </div>
        <button className="btn btn-primary" disabled={busy} onClick={shareContact}>
          {busy ? "Проверяем…" : "Поделиться контактом"}
        </button>
      </div>

      <div className="ml-block">
        <div className="ml-title">Способ 2 — код привязки</div>
        <div className="ml-text">Попросите код у администратора. Код действует 24 часа.</div>
        <div className="ml-code-row">
          <input
            className="ml-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="A1B2C3"
            maxLength={8}
            autoCapitalize="characters"
          />
          <button className="mini-btn" disabled={busy || !code.trim()} onClick={submitCode}>
            Войти
          </button>
        </div>
      </div>

      {err && (
        <div className="book-note" style={{ color: "#e03945" }}>
          {err}
        </div>
      )}
    </div>
  );
}
