import { useEffect, useState } from "react";
import { fetchCategories, fetchPromos, fetchSpecialists } from "./lib/api";
import type { Category, Promo, SpecialistCard, Screen } from "./types";

const tg = window.Telegram?.WebApp;

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: "home" });

  useEffect(() => {
    tg?.ready();
    tg?.expand();
  }, []);

  if (screen.name === "home") return <Home onNavigate={setScreen} />;
  if (screen.name === "category")
    return <Stub title={screen.title} onBack={() => setScreen({ name: "home" })} />;
  return <Stub title="Мастер" onBack={() => setScreen({ name: "home" })} />;
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function todayLabel() {
  return new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
}

function promoBadge(p: Promo) {
  if (p.kind === "gift") return "Комплекс";
  if (p.discount_type === "percent" && p.discount_value) return `−${p.discount_value}%`;
  if (p.discount_type === "fixed" && p.discount_value) return `−${p.discount_value} ₽`;
  return "Акция";
}

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
      {/* пастельная шапка */}
      <div className="hero">
        <div className="hero-top">
          <div className="hero-greet">
            <div className="hi">Привет, {name}! 👋</div>
            <div className="date">{todayLabel()}</div>
          </div>
        </div>
        <div className="search-wrap">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск мастера или услуги"
          />
          {q && (
            <button className="search-clear" onClick={() => setQ("")}>
              ×
            </button>
          )}
        </div>
      </div>

      {/* категории кружками */}
      {categories.length > 0 && (
        <div className="cats">
          {categories.map((c) => (
            <div
              key={c.id}
              className="cat"
              onClick={() => onNavigate({ name: "category", id: c.id, title: c.name })}
            >
              <div className="circle">
                {c.image_url ? <img src={c.image_url} alt={c.name} /> : <span>✂️</span>}
              </div>
              <div className="lbl">{c.name}</div>
            </div>
          ))}
        </div>
      )}

      {/* акции */}
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

      {/* мастера */}
      <div className="sect-title">Наши специалисты</div>
      {loading ? (
        <div className="spec-grid">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ paddingTop: "130%" }} />
          ))}
        </div>
      ) : visibleSpecs.length === 0 ? (
        <div className="empty">
          {specialists.length === 0 ? "Мастера скоро появятся." : "Ничего не найдено."}
        </div>
      ) : (
        <div className="spec-grid">
          {visibleSpecs.map((s) => (
            <div
              key={s.id}
              className="spec-card"
              onClick={() => onNavigate({ name: "specialist", id: s.id })}
            >
              <div className="photo">
                {s.photo_url ? (
                  <img src={s.photo_url} alt={s.full_name} />
                ) : (
                  <span className="initials">{initials(s.full_name)}</span>
                )}
              </div>
              <div className="body">
                <div className="name">{s.full_name}</div>
                <div className="meta">
                  <span className="rating">★ {s.rating?.toFixed(1) ?? "0.0"}</span>
                  {s.price_from != null && (
                    <span className="from">
                      от <b>{s.price_from.toLocaleString("ru-RU")} ₽</b>
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stub({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div>
      <button className="back-btn" onClick={onBack}>
        ‹ Назад
      </button>
      <div className="sect-title">{title}</div>
      <div className="empty">Этот экран собираем на следующем шаге.</div>
    </div>
  );
}
