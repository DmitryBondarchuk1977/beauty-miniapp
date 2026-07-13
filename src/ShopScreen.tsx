import { useState, useEffect } from "react";
import { fetchShop, apiReserveProducts, apiMyProducts, type ShopProduct, type MyProduct } from "./lib/api";

const fmtRub = (v: number) =>
  new Intl.NumberFormat("ru-RU").format(Math.round(v)) + " ₽";

function imgSrc(url: string, w: number, h?: number) {
  return `${url}?width=${w}${h ? `&height=${h}` : ""}&resize=cover&quality=80`;
}

/* ---------- витрина ---------- */

export default function ShopScreen({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState<ShopProduct[] | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetchShop().then(setItems);
  }, []);

  const total = Object.entries(cart).reduce((s, [id, q]) => {
    const p = items?.find((x) => x.id === id);
    return s + (p ? p.price * q : 0);
  }, 0);
  const count = Object.values(cart).reduce((s, q) => s + q, 0);

  function add(id: string) {
    setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  }
  function sub(id: string) {
    setCart((c) => {
      const n = (c[id] ?? 0) - 1;
      const next = { ...c };
      if (n <= 0) delete next[id];
      else next[id] = n;
      return next;
    });
  }

  async function reserve() {
    setSending(true);
    const r = await apiReserveProducts(
      Object.entries(cart).map(([product_id, qty]) => ({ product_id, qty })),
    );
    setSending(false);

    if (r.status === 200 && r.data?.ok) {
      setCart({});
      setDone(true);
      fetchShop().then(setItems);
    } else {
      alert("Не удалось отложить. Возможно, товар закончился.");
      fetchShop().then(setItems);
    }
  }

  if (done) {
    return (
      <div>
        <button className="back-btn" onClick={onBack}>‹ Назад</button>
        <div className="shop-done">
          <div className="shop-done-ic">🛍</div>
          <div className="shop-done-t">Товары отложены</div>
          <div className="shop-done-s">
            Заберите их в салоне при следующем визите — мы придержим. Оплата на месте.
          </div>
          <button className="btn btn-primary" onClick={() => setDone(false)}>
            Вернуться в магазин
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button className="back-btn" onClick={onBack}>‹ Назад</button>
      <div className="sect-title" style={{ marginTop: 0 }}>Магазин</div>
      <div className="book-sub">Отложите товар — заберёте и оплатите при визите в салон.</div>

      {!items ? (
        <div className="shop-grid">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 210, borderRadius: 14 }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="empty">Товаров пока нет.</div>
      ) : (
        <div className="shop-grid">
          {items.map((p) => {
            const q = cart[p.id] ?? 0;
            return (
              <div key={p.id} className="shop-card">
                <div className="shop-img">
                  {p.photo_url ? (
                    <img loading="lazy" decoding="async" src={imgSrc(p.photo_url, 280, 280)} alt={p.name} />
                  ) : (
                    <span className="shop-noimg">🧴</span>
                  )}
                </div>
                <div className="shop-body">
                  <div className="shop-name">{p.name}</div>
                  {p.description && <div className="shop-desc">{p.description}</div>}
                  <div className="shop-bottom">
                    <span className="shop-price">{fmtRub(p.price)}</span>
                    {q === 0 ? (
                      <button className="shop-add" onClick={() => add(p.id)}>
                        +
                      </button>
                    ) : (
                      <div className="shop-qty">
                        <button onClick={() => sub(p.id)}>−</button>
                        <span>{q}</span>
                        <button onClick={() => add(p.id)}>+</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {count > 0 && (
        <div className="book-bar">
          <button className="btn btn-primary" disabled={sending} onClick={reserve}>
            {sending ? "Откладываем…" : `Отложить ${count} шт · ${fmtRub(total)}`}
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------- мои товары ---------- */

export function MyProductsScreen({ onBack, onShop }: { onBack: () => void; onShop: () => void }) {
  const [items, setItems] = useState<MyProduct[] | null>(null);

  useEffect(() => {
    apiMyProducts().then((r) => {
      setItems(r.status === 200 && r.data?.ok ? r.data.items : []);
    });
  }, []);

  if (!items) {
    return (
      <div>
        <button className="back-btn" onClick={onBack}>‹ Назад</button>
        <div className="skeleton" style={{ height: 90, borderRadius: 14, marginTop: 12 }} />
      </div>
    );
  }

  const reserved = items.filter((i) => i.status === "reserved");
  const bought = items.filter((i) => i.status === "paid");

  return (
    <div>
      <button className="back-btn" onClick={onBack}>‹ Назад</button>
      <div className="sect-title" style={{ marginTop: 0 }}>Мои товары</div>

      {items.length === 0 && (
        <div className="empty">
          Вы пока ничего не откладывали.
          <div style={{ marginTop: 12 }}>
            <button className="mini-btn" onClick={onShop}>
              Открыть магазин
            </button>
          </div>
        </div>
      )}

      {reserved.length > 0 && (
        <>
          <div className="sect-title">Отложено</div>
          <div className="book-note" style={{ marginTop: 0, marginBottom: 8 }}>
            Заберите при визите в салон — оплата на месте.
          </div>
          {reserved.map((i) => (
            <ProductLine key={i.id} item={i} />
          ))}
        </>
      )}

      {bought.length > 0 && (
        <>
          <div className="sect-title">Куплено</div>
          {bought.map((i) => (
            <ProductLine key={i.id} item={i} />
          ))}
        </>
      )}
    </div>
  );
}

function ProductLine({ item }: { item: MyProduct }) {
  return (
    <div className="mp-row">
      <div className="mp-img">
        {item.photo_url ? (
          <img loading="lazy" decoding="async" src={imgSrc(item.photo_url, 120, 120)} alt={item.name} />
        ) : (
          <span>🧴</span>
        )}
      </div>
      <div className="mp-info">
        <div className="mp-name">{item.name}</div>
        <div className="mp-meta">
          {item.qty} шт × {fmtRub(item.price)}
        </div>
      </div>
      <div className="mp-right">
        <div className="mp-total">{fmtRub(item.total)}</div>
        <span className={`mp-badge ${item.status === "reserved" ? "res" : "paid"}`}>
          {item.status === "reserved" ? "Отложено" : "Оплачено"}
        </span>
      </div>
    </div>
  );
}
