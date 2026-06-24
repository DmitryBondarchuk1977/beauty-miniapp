import { useEffect, useState } from "react";
import {
  fetchCategories,
  fetchPromos,
  fetchSpecialists,
  fetchCategoryView,
  fetchServiceDetail,
  fetchBookingContext,
  fetchSlots,
  apiPrice,
  apiBook,
  apiConfirm,
  type PriceResult,
} from "./lib/api";
import type {
  Category,
  Promo,
  SpecialistCard,
  Chip,
  ServiceCard,
  ServiceDetail,
  Master,
  Screen,
} from "./types";

const tg = window.Telegram?.WebApp;

export default function App() {
  const [stack, setStack] = useState<Screen[]>(() => {
    const cid = new URLSearchParams(window.location.search).get("confirm");
    return cid
      ? [{ name: "home" }, { name: "confirm", bookingId: cid }]
      : [{ name: "home" }];
  });
  const screen = stack[stack.length - 1];
  const push = (s: Screen) => setStack((p) => [...p, s]);
  const back = () => setStack((p) => (p.length > 1 ? p.slice(0, -1) : p));

  useEffect(() => {
    tg?.ready();
    tg?.expand();
  }, []);

  // нативная кнопка «Назад» в Telegram
  useEffect(() => {
    const bb = tg?.BackButton;
    if (!bb) return;
    const handler = () => setStack((p) => (p.length > 1 ? p.slice(0, -1) : p));
    bb.onClick(handler);
    return () => bb.offClick(handler);
  }, []);
  useEffect(() => {
    const bb = tg?.BackButton;
    if (!bb) return;
    if (stack.length > 1) bb.show();
    else bb.hide();
  }, [stack.length]);

  if (screen.name === "home") return <Home onNavigate={push} />;
  if (screen.name === "category")
    return <CategoryScreen id={screen.id} title={screen.title} onNavigate={push} onBack={back} />;
  if (screen.name === "service")
    return <ServiceScreen id={screen.id} onNavigate={push} onBack={back} />;
  if (screen.name === "specialist")
    return <Stub title="Мастер" onBack={back} />;
  if (screen.name === "confirm")
    return (
      <ConfirmScreen
        bookingId={screen.bookingId}
        onHome={() => setStack([{ name: "home" }])}
      />
    );
  return (
    <BookingScreen
      serviceId={screen.serviceId}
      specialistId={screen.specialistId}
      onBack={back}
      onHome={() => setStack([{ name: "home" }])}
    />
  );
}

/* ---------- helpers ---------- */
function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}
function todayLabel() {
  return new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
}
function fmtRub(n: number) {
  return n.toLocaleString("ru-RU") + " ₽";
}
function fmtDuration(min: number) {
  if (min < 60) return `${min} мин`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} ч ${m} мин` : `${h} ч`;
}
function promoBadge(p: Promo) {
  if (p.kind === "gift") return "Комплекс";
  if (p.discount_type === "percent" && p.discount_value) return `−${p.discount_value}%`;
  if (p.discount_type === "fixed" && p.discount_value) return `−${p.discount_value} ₽`;
  return "Акция";
}

/* ---------- HOME ---------- */
function Home({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [specialists, setSpecialists] = useState<SpecialistCard[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchCategories(), fetchPromos(), fetchSpecialists()]).then(
      ([c, p, s]) => {
        setCategories(c);
        setPromos(p);
        setSpecialists(s);
        setLoading(false);
      },
    );
  }, []);

  const name = tg?.initDataUnsafe?.user?.first_name ?? "гость";
  const query = q.trim().toLowerCase();
  const visibleSpecs = query
    ? specialists.filter((s) => s.full_name.toLowerCase().includes(query))
    : specialists;

  return (
    <div>
      <div className="hero">
        <div className="hero-top">
          <div className="hero-greet">
            <div className="hi">Привет, {name}! 👋</div>
            <div className="date">{todayLabel()}</div>
          </div>
        </div>
        <div className="search-wrap">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск мастера или услуги" />
          {q && <button className="search-clear" onClick={() => setQ("")}>×</button>}
        </div>
      </div>

      {categories.length > 0 && (
        <div className="cats">
          {categories.map((c) => (
            <div key={c.id} className="cat" onClick={() => onNavigate({ name: "category", id: c.id, title: c.name })}>
              <div className="circle">
                {c.image_url ? <img src={c.image_url} alt={c.name} /> : <span>✂️</span>}
              </div>
              <div className="lbl">{c.name}</div>
            </div>
          ))}
        </div>
      )}

      {promos.length > 0 && (
        <>
          <div className="sect-title">Акции</div>
          <div className="carousel">
            {promos.map((p) => (
              <div className="ann" key={p.id}>
                {p.banner_url && <img src={p.banner_url} alt={p.title} />}
                <span className="tagline">{promoBadge(p)}</span>
                <div className={`cap ${p.banner_url ? "over-img" : ""}`}>{p.title}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="sect-title">Наши специалисты</div>
      {loading ? (
        <div className="spec-grid">
          {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ paddingTop: "130%" }} />)}
        </div>
      ) : visibleSpecs.length === 0 ? (
        <div className="empty">{specialists.length === 0 ? "Мастера скоро появятся." : "Ничего не найдено."}</div>
      ) : (
        <div className="spec-grid">
          {visibleSpecs.map((s) => (
            <div key={s.id} className="spec-card" onClick={() => onNavigate({ name: "specialist", id: s.id })}>
              <div className="photo">
                {s.photo_url ? <img src={s.photo_url} alt={s.full_name} /> : <span className="initials">{initials(s.full_name)}</span>}
              </div>
              <div className="body">
                <div className="name">{s.full_name}</div>
                <div className="meta">
                  <span className="rating">★ {s.rating?.toFixed(1) ?? "0.0"}</span>
                  {s.price_from != null && <span className="from">от <b>{fmtRub(s.price_from)}</b></span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- CATEGORY ---------- */
function CategoryScreen({
  id, title, onNavigate, onBack,
}: { id: string; title: string; onNavigate: (s: Screen) => void; onBack: () => void }) {
  const [chips, setChips] = useState<Chip[]>([]);
  const [services, setServices] = useState<ServiceCard[]>([]);
  const [active, setActive] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategoryView(id).then(({ chips, services }) => {
      setChips(chips);
      setServices(services);
      setLoading(false);
    });
  }, [id]);

  const visible = active ? services.filter((s) => s.branch_id === active) : services;

  return (
    <div>
      <button className="back-btn" onClick={onBack}>‹ Назад</button>
      <div className="sect-title" style={{ marginTop: 0 }}>{title}</div>

      {chips.length > 0 && (
        <div className="cats">
          <div className={`cat ${active === "" ? "on" : ""}`} onClick={() => setActive("")}>
            <div className="circle all">Все</div>
            <div className="lbl">Все</div>
          </div>
          {chips.map((c) => (
            <div key={c.id} className={`cat ${active === c.id ? "on" : ""}`} onClick={() => setActive(c.id)}>
              <div className="circle">
                {c.image_url ? <img src={c.image_url} alt={c.name} /> : <span>✂️</span>}
              </div>
              <div className="lbl">{c.name}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="svc-list">
          {[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 80 }} />)}
        </div>
      ) : visible.length === 0 ? (
        <div className="empty">В этой категории пока нет услуг.</div>
      ) : (
        <div className="svc-list">
          {visible.map((s) => (
            <div key={s.id} className="svc-row" onClick={() => onNavigate({ name: "service", id: s.id })}>
              <div className="svc-thumb">{s.image_url && <img src={s.image_url} alt={s.name} />}</div>
              <div className="svc-info">
                <div className="svc-name">{s.name}</div>
                <div className="svc-sub">{fmtDuration(s.duration_min)}</div>
              </div>
              <div className="svc-price">
                {s.price_from != null ? <>от {fmtRub(s.price_from)}</> : "—"}
                <small>записаться</small>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- SERVICE ---------- */
function ServiceScreen({
  id, onNavigate, onBack,
}: { id: string; onNavigate: (s: Screen) => void; onBack: () => void }) {
  const [service, setService] = useState<ServiceDetail | null>(null);
  const [masters, setMasters] = useState<Master[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServiceDetail(id).then((res) => {
      if (res) { setService(res.service); setMasters(res.masters); }
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div>
        <button className="back-btn" onClick={onBack}>‹ Назад</button>
        <div className="skeleton detail-hero" />
        <div className="skeleton" style={{ height: 28, width: "60%", marginBottom: 10 }} />
      </div>
    );
  }
  if (!service) {
    return (
      <div>
        <button className="back-btn" onClick={onBack}>‹ Назад</button>
        <div className="empty">Услуга не найдена.</div>
      </div>
    );
  }

  const prices = masters.map((m) => m.price);
  const min = prices.length ? Math.min(...prices) : null;
  const max = prices.length ? Math.max(...prices) : null;
  const priceLabel =
    min == null || max == null ? "—" : min === max ? fmtRub(min) : `${fmtRub(min)} – ${fmtRub(max)}`;

  return (
    <div>
      <button className="back-btn" onClick={onBack}>‹ Назад</button>

      <div className="detail-hero">{service.image_url && <img src={service.image_url} alt={service.name} />}</div>
      <h2 className="detail-title">{service.name}</h2>
      <div className="detail-meta">
        <span>⏱ {fmtDuration(service.duration_min)}</span>
        <span>💰 {priceLabel}</span>
      </div>
      {service.description && <p className="detail-desc">{service.description}</p>}

      <div className="sect-title">Выберите мастера</div>
      {masters.length === 0 ? (
        <div className="empty">Пока нет мастеров, выполняющих эту услугу.</div>
      ) : (
        masters.map((m) => (
          <div
            key={m.id}
            className="master-row"
            onClick={() => onNavigate({ name: "booking", serviceId: service.id, specialistId: m.id })}
          >
            <div className="master-photo">
              {m.photo_url ? <img src={m.photo_url} alt={m.full_name} /> : initials(m.full_name)}
            </div>
            <div className="master-info">
              <div className="master-name">{m.full_name}</div>
              <div className="master-rating">★ {m.rating?.toFixed(1) ?? "0.0"}</div>
            </div>
            <div className="master-cta">
              <div className="p">{fmtRub(m.price)}</div>
              <div className="go">Записаться ›</div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

/* ---------- BOOKING ---------- */
function nextDays(n = 21) {
  const out: { dateStr: string; dow: string; dom: number }[] = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  for (let i = 0; i < n; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    out.push({
      dateStr: `${y}-${m}-${day}`,
      dow: new Intl.DateTimeFormat("ru-RU", { weekday: "short" }).format(d),
      dom: d.getDate(),
    });
  }
  return out;
}
function slotTime(iso: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
  }).format(new Date(iso));
}
function fullDateTime(iso: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
  }).format(new Date(iso));
}

function BookingScreen({
  serviceId,
  specialistId,
  onBack,
  onHome,
}: {
  serviceId: string;
  specialistId: string;
  onBack: () => void;
  onHome: () => void;
}) {
  const [ctx, setCtx] = useState<{
    service: { name: string; duration_min: number } | null;
    master: { full_name: string; photo_url: string | null } | null;
    basePrice: number | null;
  } | null>(null);
  const [days] = useState(nextDays());
  const [date, setDate] = useState(days[0].dateStr);
  const [slots, setSlots] = useState<{ slot_start: string; slot_end: string }[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [slot, setSlot] = useState<string | null>(null);
  const [price, setPrice] = useState<PriceResult | null>(null);
  const [booking, setBooking] = useState(false);
  const [result, setResult] = useState<{ startsAt: string; final: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetchBookingContext(serviceId, specialistId).then(setCtx);
  }, [serviceId, specialistId]);
  useEffect(() => {
    apiPrice(serviceId, specialistId).then((r) => {
      if (r.status === 200 && r.data) setPrice(r.data);
    });
  }, [serviceId, specialistId]);
  useEffect(() => {
    setSlotsLoading(true);
    setSlot(null);
    fetchSlots(specialistId, serviceId, date).then((s) => {
      setSlots(s);
      setSlotsLoading(false);
    });
  }, [date, specialistId, serviceId]);

  async function book() {
    if (!slot) return;
    setBooking(true);
    setErr(null);
    const r = await apiBook(serviceId, specialistId, slot);
    setBooking(false);
    if (r.status === 200 && r.data?.ok) {
      setResult({ startsAt: r.data.starts_at, final: r.data.final_price });
    } else if (r.status === 401) {
      setErr("Запись доступна только из Telegram.");
    } else if (r.status === 409) {
      setErr("Этот слот только что заняли. Выберите другое время.");
      fetchSlots(specialistId, serviceId, date).then(setSlots);
      setSlot(null);
    } else {
      setErr(r.data?.error ? `Ошибка: ${r.data.error}` : "Не удалось записаться. Попробуйте ещё раз.");
    }
  }

  if (result) {
    return (
      <div className="success">
        <div className="ico">✓</div>
        <h2>Вы записаны!</h2>
        <p>{ctx?.service?.name} · {ctx?.master?.full_name}</p>
        <p style={{ textTransform: "capitalize" }}>{fullDateTime(result.startsAt)}</p>
        <p>К оплате: <b>{fmtRub(result.final)}</b></p>
        <div style={{ maxWidth: 280, margin: "24px auto 0" }}>
          <button className="btn btn-primary" onClick={onHome}>На главную</button>
        </div>
      </div>
    );
  }

  const full = price?.full_price ?? ctx?.basePrice ?? null;
  const discount = price?.discount_amount ?? 0;
  const finalP = price?.final_price ?? full;

  return (
    <div>
      <button className="back-btn" onClick={onBack}>‹ Назад</button>
      <div className="sect-title" style={{ marginTop: 0 }}>Запись</div>
      <div className="book-sub">
        {ctx?.service?.name ?? "…"}
        {ctx?.master && ` · ${ctx.master.full_name}`}
        {ctx?.service && ` · ${fmtDuration(ctx.service.duration_min)}`}
      </div>

      <div className="sect-title">Дата</div>
      <div className="date-strip">
        {days.map((d) => (
          <button
            key={d.dateStr}
            className={`date-chip ${date === d.dateStr ? "on" : ""}`}
            onClick={() => setDate(d.dateStr)}
          >
            <div className="dow">{d.dow}</div>
            <div className="dom">{d.dom}</div>
          </button>
        ))}
      </div>

      <div className="sect-title">Время</div>
      {slotsLoading ? (
        <div className="slots-grid">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="skeleton" style={{ height: 42, borderRadius: 12 }} />
          ))}
        </div>
      ) : slots.length === 0 ? (
        <div className="empty">На этот день свободных слотов нет. Выберите другую дату.</div>
      ) : (
        <div className="slots-grid">
          {slots.map((s) => (
            <button
              key={s.slot_start}
              className={`slot ${slot === s.slot_start ? "on" : ""}`}
              onClick={() => setSlot(s.slot_start)}
            >
              {slotTime(s.slot_start)}
            </button>
          ))}
        </div>
      )}

      {full != null && (
        <div className="price-card">
          <div className="price-row muted">
            <span>Стоимость услуги</span>
            <span>{fmtRub(full)}</span>
          </div>
          {discount > 0 && (
            <div className="price-row discount">
              <span>Скидка{price?.promo_title ? ` · ${price.promo_title}` : ""}</span>
              <span>−{fmtRub(discount)}</span>
            </div>
          )}
          <div className="price-row total">
            <span>К оплате</span>
            <span>{fmtRub(finalP ?? full)}</span>
          </div>
        </div>
      )}

      {err && <div className="book-note" style={{ color: "#e03945" }}>{err}</div>}

      <div className="book-bar">
        <button className="btn btn-primary" disabled={!slot || booking} onClick={book}>
          {booking ? "Записываем…" : slot ? `Записаться на ${slotTime(slot)}` : "Выберите время"}
        </button>
      </div>
    </div>
  );
}

/* ---------- CONFIRM (Приду) ---------- */
function ConfirmScreen({ bookingId, onHome }: { bookingId: string; onHome: () => void }) {
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [info, setInfo] = useState<{ service: string | null; specialist: string | null; starts_at: string } | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    apiConfirm(bookingId).then((r) => {
      if (r.status === 200 && r.data?.ok) {
        setInfo({ service: r.data.service, specialist: r.data.specialist, starts_at: r.data.starts_at });
        setState("ok");
      } else if (r.status === 401) {
        setMsg("Подтверждение доступно только из Telegram.");
        setState("error");
      } else if (r.status === 403) {
        setMsg("Эта запись принадлежит другому пользователю.");
        setState("error");
      } else if (r.status === 404) {
        setMsg("Запись не найдена.");
        setState("error");
      } else {
        setMsg("Не удалось подтвердить. Попробуйте позже.");
        setState("error");
      }
    });
  }, [bookingId]);

  if (state === "loading") {
    return (
      <div className="success">
        <div className="skeleton ico" style={{ background: "var(--card)" }} />
        <p>Подтверждаем визит…</p>
      </div>
    );
  }
  if (state === "error") {
    return (
      <div className="success">
        <div className="ico" style={{ background: "#fdeaea", color: "#e03945" }}>!</div>
        <h2>Не получилось</h2>
        <p>{msg}</p>
        <div style={{ maxWidth: 280, margin: "24px auto 0" }}>
          <button className="btn btn-primary" onClick={onHome}>На главную</button>
        </div>
      </div>
    );
  }
  return (
    <div className="success">
      <div className="ico">✓</div>
      <h2>Спасибо, ждём вас!</h2>
      {info && (
        <>
          <p>{info.service} · {info.specialist}</p>
          <p style={{ textTransform: "capitalize" }}>{fullDateTime(info.starts_at)}</p>
        </>
      )}
      <div style={{ maxWidth: 280, margin: "24px auto 0" }}>
        <button className="btn btn-primary" onClick={onHome}>На главную</button>
      </div>
    </div>
  );
}

/* ---------- STUB ---------- */
function Stub({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div>
      <button className="back-btn" onClick={onBack}>‹ Назад</button>
      <div className="sect-title">{title}</div>
      <div className="empty">Этот экран собираем на следующем шаге.</div>
    </div>
  );
}
