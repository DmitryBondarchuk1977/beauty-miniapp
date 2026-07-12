import { useState, useEffect, useMemo, useCallback } from "react";
import {
  apiMasterBookings,
  apiMasterMark,
  apiMasterSchedule,
  apiMasterEarnings,
  apiMasterDocuments,
  type MasterMe,
  type MasterBooking,
  type MasterDay,
  type MasterEarnings,
  type MasterDoc,
} from "./lib/api";
import { cacheGet, cacheSet, cacheDropPrefix } from "./lib/cache";

/* ---------- helpers ---------- */

const MSK = "Europe/Moscow";

function iso(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function slotTime(isoStr: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: MSK,
  }).format(new Date(isoStr));
}

function dayLabel(isoStr: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    weekday: "short",
    day: "numeric",
    month: "long",
    timeZone: MSK,
  }).format(new Date(isoStr));
}

function fmtRub(v: number) {
  return new Intl.NumberFormat("ru-RU").format(Math.round(v)) + " ₽";
}

function initials(name: string) {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase();
}

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  new: { text: "Ожидается", cls: "mb-st-new" },
  confirmed: { text: "Подтверждена", cls: "mb-st-new" },
  completed: { text: "Пришёл", cls: "mb-st-done" },
  paid: { text: "Оплачено", cls: "mb-st-paid" },
  no_show: { text: "Не пришёл", cls: "mb-st-noshow" },
  cancelled: { text: "Отменена", cls: "mb-st-cancel" },
};

const DOC_TYPE: Record<string, string> = {
  diploma: "Диплом",
  certificate: "Сертификат",
  license: "Лицензия",
  medical: "Медкнижка",
  contract: "Договор",
  other: "Документ",
};

type Tab = "bookings" | "schedule" | "earnings" | "docs";

/* ---------- главный экран кабинета ---------- */

export default function MasterCabinet({ me }: { me: MasterMe }) {
  const [tab, setTab] = useState<Tab>("bookings");

  return (
    <div className="app has-tabbar">
      <div className="mc-head">
        <div className="mc-avatar">
          {me.photo_url ? (
            <img src={me.photo_url} alt={me.full_name ?? ""} />
          ) : (
            <span>{initials(me.full_name ?? "")}</span>
          )}
        </div>
        <div className="mc-who">
          <div className="mc-name">{me.full_name}</div>
          <div className="mc-role">Кабинет мастера</div>
        </div>
      </div>

      <div className="mc-content">
        {tab === "bookings" && <MasterBookingsTab />}
        {tab === "schedule" && <MasterScheduleTab />}
        {tab === "earnings" && <MasterEarningsTab />}
        {tab === "docs" && <MasterDocsTab />}
      </div>

      <nav className="tabbar">
        <TabBtn on={tab === "bookings"} onClick={() => setTab("bookings")} icon="📋" label="Записи" />
        <TabBtn on={tab === "schedule"} onClick={() => setTab("schedule")} icon="🗓" label="График" />
        <TabBtn on={tab === "earnings"} onClick={() => setTab("earnings")} icon="💰" label="Доход" />
        <TabBtn on={tab === "docs"} onClick={() => setTab("docs")} icon="📄" label="Документы" />
      </nav>
    </div>
  );
}

function TabBtn({
  on,
  onClick,
  icon,
  label,
}: {
  on: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}) {
  return (
    <button className={`tab ${on ? "on" : ""}`} onClick={onClick}>
      <span className="tab-ico">{icon}</span>
      <span className="tab-lbl">{label}</span>
    </button>
  );
}

/* ---------- 1. Мои записи ---------- */

function MasterBookingsTab() {
  const [range, setRange] = useState<"today" | "week">("today");
  const [items, setItems] = useState<MasterBooking[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const { from, to } = useMemo(() => {
    const now = new Date();
    if (range === "today") return { from: iso(now), to: iso(now) };
    const end = new Date(now);
    end.setDate(now.getDate() + 6);
    return { from: iso(now), to: iso(end) };
  }, [range]);

  const key = `m:bookings:${from}:${to}`;

  const load = useCallback(
    async (silent = false) => {
      if (!silent) {
        const c = cacheGet<MasterBooking[]>(key, 60_000);
        if (c) {
          setItems(c.value);          // сразу показываем старое
          if (c.fresh) return;        // свежее — не дёргаем сеть
        } else {
          setItems(null);             // кэша нет — скелетон
        }
      }
      const r = await apiMasterBookings(from, to);
      if (r.status === 200 && r.data?.ok) {
        setItems(r.data.bookings);
        cacheSet(key, r.data.bookings);
      } else if (!silent) {
        setItems((prev) => prev ?? []);
      }
    },
    [from, to, key],
  );

  useEffect(() => {
    load();
  }, [load]);

  async function mark(id: string, status: "completed" | "no_show") {
    setBusy(id);
    const r = await apiMasterMark(id, status);
    setBusy(null);
    if (r.status === 200 && r.data?.ok) {
      cacheDropPrefix("m:bookings");  // статус изменился — все периоды устарели
      cacheDropPrefix("m:earnings");  // и доход тоже
      load(true);
    } else {
      const e = r.data?.error;
      alert(
        e === "too_early" ? "Отметить можно только после начала визита."
        : e === "wrong_status" ? "Эту запись отметить нельзя."
        : "Не удалось отметить.",
      );
    }
  }

  // группируем по дням
  const groups = useMemo(() => {
    if (!items) return [];
    const map = new Map<string, MasterBooking[]>();
    for (const b of items) {
      const key = b.starts_at.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    }
    return [...map.entries()];
  }, [items]);

  return (
    <div>
      <div className="mc-seg">
        <button className={range === "today" ? "on" : ""} onClick={() => setRange("today")}>
          Сегодня
        </button>
        <button className={range === "week" ? "on" : ""} onClick={() => setRange("week")}>
          Неделя
        </button>
      </div>

      {!items ? (
        <div className="skeleton" style={{ height: 80, borderRadius: 14, marginTop: 12 }} />
      ) : items.length === 0 ? (
        <div className="empty">Записей нет.</div>
      ) : (
        groups.map(([day, list]) => (
          <div key={day}>
            <div className="sect-title" style={{ textTransform: "capitalize" }}>
              {dayLabel(list[0].starts_at)}
            </div>
            {list.map((b) => {
              const st = STATUS_LABEL[b.status] ?? { text: b.status, cls: "" };
              return (
                <div key={b.id} className="mc-card">
                  <div className="mc-time">
                    {slotTime(b.starts_at)}
                    <span className="mc-dash">–</span>
                    {slotTime(b.ends_at)}
                  </div>
                  <div className="mc-body">
                    <div className="mc-svc">{b.service_name}</div>
                    <div className="mc-client">
                      {b.client_name}
                      {b.client_phone && (
                        <a className="mc-phone" href={`tel:${b.client_phone}`}>
                          {b.client_phone}
                        </a>
                      )}
                    </div>
                    <div className="mc-meta">
                      <span className={`mc-badge ${st.cls}`}>{st.text}</span>
                      <span className="mc-price">{fmtRub(b.price)}</span>
                    </div>

                    {b.can_mark && (
                      <div className="mc-acts">
                        <button
                          className="mini-btn"
                          disabled={busy === b.id}
                          onClick={() => mark(b.id, "completed")}
                        >
                          Пришёл
                        </button>
                        <button
                          className="mini-btn ghost"
                          disabled={busy === b.id}
                          onClick={() => mark(b.id, "no_show")}
                        >
                          Не пришёл
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}

/* ---------- 2. Мой график (только чтение) ---------- */

const WD = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

function MasterScheduleTab() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [days, setDays] = useState<Record<string, MasterDay> | null>(null);

  const from = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const to = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  useEffect(() => {
    const key = `m:schedule:${from}`;
    const c = cacheGet<Record<string, MasterDay>>(key, 5 * 60_000);
    if (c) {
      setDays(c.value);
      if (c.fresh) return;
    } else {
      setDays(null);
    }

    apiMasterSchedule(from, to).then((r) => {
      if (r.status === 200 && r.data?.ok) {
        const map: Record<string, MasterDay> = {};
        for (const d of r.data.days) map[d.date] = d;
        setDays(map);
        cacheSet(key, map);
      } else {
        setDays((prev) => prev ?? {});
      }
    });
  }, [from, to]);

  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const lead = (first.getDay() + 6) % 7;
    const out: (number | null)[] = [];
    for (let i = 0; i < lead; i++) out.push(null);
    for (let d = 1; d <= lastDay; d++) out.push(d);
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [year, month, lastDay]);

  function shift(delta: number) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  const workCount = days ? Object.values(days).filter((d) => d.day_type === "work").length : 0;
  const todayKey = iso(now);

  return (
    <div>
      <div className="mc-monthnav">
        <button onClick={() => shift(-1)}>‹</button>
        <div>
          {MONTHS[month]} {year}
        </div>
        <button onClick={() => shift(1)}>›</button>
      </div>

      <div className="mc-cal">
        {WD.map((w) => (
          <div key={w} className="mc-wd">
            {w}
          </div>
        ))}

        {!days
          ? Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="skeleton mc-day-sk" />
            ))
          : cells.map((d, i) => {
              if (d === null) return <div key={`e${i}`} />;
              const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
              const day = days[key];
              const cls =
                day?.day_type === "work" ? "work" : day?.day_type === "off" ? "off" : "none";
              return (
                <div key={key} className={`mc-day ${cls} ${key === todayKey ? "today" : ""}`}>
                  <div className="mc-dnum">{d}</div>
                  {day?.day_type === "work" && day.start_time && (
                    <div className="mc-dtime">
                      {day.start_time.slice(0, 5)}
                      <br />
                      {day.end_time?.slice(0, 5)}
                    </div>
                  )}
                  {day?.day_type === "off" && <div className="mc-dtime">вых</div>}
                </div>
              );
            })}
      </div>

      <div className="mc-legend">
        <span>
          <i className="lg work" /> Рабочих: {workCount}
        </span>
        <span>
          <i className="lg off" /> Выходной
        </span>
        <span>
          <i className="lg none" /> Не задан
        </span>
      </div>

      <div className="book-note">График составляет администратор. Изменения — через салон.</div>
    </div>
  );
}

/* ---------- 3. Мои заработки ---------- */

function MasterEarningsTab() {
  const [preset, setPreset] = useState<"month" | "prev" | "week">("month");
  const [data, setData] = useState<MasterEarnings | null>(null);

  const { from, to, label } = useMemo(() => {
    const now = new Date();
    if (preset === "month") {
      return {
        from: iso(new Date(now.getFullYear(), now.getMonth(), 1)),
        to: iso(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
        label: "Текущий месяц",
      };
    }
    if (preset === "prev") {
      return {
        from: iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        to: iso(new Date(now.getFullYear(), now.getMonth(), 0)),
        label: "Прошлый месяц",
      };
    }
    const dow = (now.getDay() + 6) % 7;
    const start = new Date(now);
    start.setDate(now.getDate() - dow);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { from: iso(start), to: iso(end), label: "Текущая неделя" };
  }, [preset]);

  useEffect(() => {
    const key = `m:earnings:${from}:${to}`;
    const c = cacheGet<MasterEarnings>(key, 60_000);
    if (c) {
      setData(c.value);
      if (c.fresh) return;
    } else {
      setData(null);
    }

    apiMasterEarnings(from, to).then((r) => {
      if (r.status === 200 && r.data?.ok) {
        setData(r.data.earnings);
        cacheSet(key, r.data.earnings);
      }
    });
  }, [from, to]);

  return (
    <div>
      <div className="mc-seg">
        <button className={preset === "month" ? "on" : ""} onClick={() => setPreset("month")}>
          Месяц
        </button>
        <button className={preset === "prev" ? "on" : ""} onClick={() => setPreset("prev")}>
          Прошлый
        </button>
        <button className={preset === "week" ? "on" : ""} onClick={() => setPreset("week")}>
          Неделя
        </button>
      </div>

      {!data ? (
        <div className="skeleton" style={{ height: 120, borderRadius: 14, marginTop: 12 }} />
      ) : (
        <>
          <div className="mc-total">
            <div className="mc-total-lbl">{label}</div>
            <div className="mc-total-val">{fmtRub(data.total_payout)}</div>
          </div>

          <div className="price-card">
            <div className="price-row">
              <span>Услуг оказано</span>
              <span>{data.services_count}</span>
            </div>
            <div className="price-row">
              <span>За услуги</span>
              <span>{fmtRub(data.services_payout)}</span>
            </div>
            {data.shifts > 0 && (
              <div className="price-row">
                <span>Смен отработано</span>
                <span>{data.shifts}</span>
              </div>
            )}
            {data.shifts_payout > 0 && (
              <div className="price-row">
                <span>За смены</span>
                <span>{fmtRub(data.shifts_payout)}</span>
              </div>
            )}
            {data.salary_payout > 0 && (
              <div className="price-row">
                <span>Оклад</span>
                <span>{fmtRub(data.salary_payout)}</span>
              </div>
            )}
            <div className="price-row total">
              <span>Итого начислено</span>
              <span>{fmtRub(data.total_payout)}</span>
            </div>
          </div>

          <div className="book-note">
            Учитываются только оплаченные услуги. Вопросы по начислениям — к администратору.
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- 4. Мои документы ---------- */

function MasterDocsTab() {
  const [docs, setDocs] = useState<MasterDoc[] | null>(null);

  useEffect(() => {
    // ссылки подписаны на 1 час — кэшируем на 30 минут
    const c = cacheGet<MasterDoc[]>("m:docs", 30 * 60_000);
    if (c) {
      setDocs(c.value);
      if (c.fresh) return;
    }

    apiMasterDocuments().then((r) => {
      if (r.status === 200 && r.data?.ok) {
        setDocs(r.data.documents);
        cacheSet("m:docs", r.data.documents);
      } else {
        setDocs((prev) => prev ?? []);
      }
    });
  }, []);

  if (!docs) {
    return <div className="skeleton" style={{ height: 80, borderRadius: 14, marginTop: 12 }} />;
  }

  if (docs.length === 0) {
    return <div className="empty">Документов пока нет. Их загружает администратор.</div>;
  }

  return (
    <div>
      <div className="sect-title" style={{ marginTop: 0 }}>
        Мои документы
      </div>
      {docs.map((d) => {
        const st =
          d.expiry_status === "expired"
            ? { text: "Истёк", cls: "mb-st-noshow" }
            : d.expiry_status === "expiring"
            ? { text: `Истекает через ${d.days_left} дн.`, cls: "mb-st-warn" }
            : d.expiry_status === "valid"
            ? { text: `До ${new Date(d.expires_at!).toLocaleDateString("ru-RU")}`, cls: "mb-st-done" }
            : null;

        return (
          <div key={d.id} className="mc-doc">
            <div className="mc-doc-main">
              <div className="mc-doc-title">{d.title}</div>
              <div className="mc-doc-type">{DOC_TYPE[d.doc_type] ?? "Документ"}</div>
            </div>
            {st && <span className={`mc-badge ${st.cls}`}>{st.text}</span>}
            {d.url && (
              <a className="mini-btn ghost" href={d.url} target="_blank" rel="noreferrer">
                Открыть
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}
