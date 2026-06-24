import { useEffect, useState } from "react";
import {
  fetchCategories,
  fetchPromos,
  fetchSpecialists,
  fetchCategoryView,
  fetchServiceDetail,
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
  const [stack, setStack] = useState<Screen[]>([{ name: "home" }]);
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
  return <Stub title="Запись" onBack={back} />;
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
        <div className="subchips">
          <button className={`subchip ${active === "" ? "on" : ""}`} onClick={() => setActive("")}>Все</button>
          {chips.map((c) => (
            <button key={c.id} className={`subchip ${active === c.id ? "on" : ""}`} onClick={() => setActive(c.id)}>
              {c.name}
            </button>
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
