import { useState, useEffect } from "react";
import {
  fetchShop,
  apiMyProducts,
  apiCancelReservation,
  apiMyCertificates,
  type ShopProduct,
  type MyProduct,
  type MyCertificate,
} from "./lib/api";
import type { CartProduct } from "./types";

const fmtRub = (v: number) =>
  new Intl.NumberFormat("ru-RU").format(Math.round(v)) + " ₽";

function imgSrc(url: string, w: number, h?: number) {
  return `${url}?width=${w}${h ? `&height=${h}` : ""}&resize=cover&quality=80`;
}

/* ---------- витрина ---------- */

export default function ShopScreen({
  cartProducts,
  onAdd,
  onSetQty,
  onBack,
  onCart,
}: {
  cartProducts: CartProduct[];
  onAdd: (p: CartProduct) => void;
  onSetQty: (productId: string, qty: number) => void;
  onBack: () => void;
  onCart: () => void;
}) {
  const [items, setItems] = useState<ShopProduct[] | null>(null);
  const [filter, setFilter] = useState<"sale" | "certificate">("sale");

  useEffect(() => {
    fetchShop().then(setItems);
  }, []);

  const qtyOf = (id: string) => cartProducts.find((x) => x.product_id === id)?.qty ?? 0;
  const count = cartProducts.reduce((s, p) => s + p.qty, 0);
  const total = cartProducts.reduce((s, p) => s + p.price * p.qty, 0);

  const hasCerts = (items ?? []).some((p) => p.kind === "certificate");
  const shown = (items ?? []).filter((p) => p.kind === filter);

  return (
    <div>
      <button className="back-btn" onClick={onBack}>‹ Назад</button>
      <div className="sect-title" style={{ marginTop: 0 }}>Магазин</div>

      {hasCerts && (
        <div className="chips">
          <button
            className={`chip ${filter === "sale" ? "on" : ""}`}
            onClick={() => setFilter("sale")}
          >
            Товары
          </button>
          <button
            className={`chip ${filter === "certificate" ? "on" : ""}`}
            onClick={() => setFilter("certificate")}
          >
            Подарочные сертификаты
          </button>
        </div>
      )}

      <div className="book-sub">
        {filter === "certificate"
          ? "Отличный подарок. Оплатите при визите — код придёт в этот чат."
          : "Добавьте товары в корзину — заберёте и оплатите при визите в салон."}
      </div>

      {!items ? (
        <div className="shop-grid">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 210, borderRadius: 14 }} />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <div className="empty">
          {filter === "certificate" ? "Сертификатов пока нет." : "Товаров пока нет."}
        </div>
      ) : (
        <div className="shop-grid">
          {shown.map((p) => {
            const q = qtyOf(p.id);
            const isCert = p.kind === "certificate";
            const face = Number(p.face_value ?? 0);
            const benefit = isCert ? face - p.price : 0;

            return (
              <div key={p.id} className={`shop-card ${isCert ? "cert" : ""}`}>
                <div className="shop-img">
                  {p.photo_url ? (
                    <img loading="lazy" decoding="async" src={imgSrc(p.photo_url, 280, 280)} alt={p.name} />
                  ) : (
                    <span className="shop-noimg">{isCert ? "🎁" : "🧴"}</span>
                  )}
                  {benefit > 0 && (
                    <span className="cert-badge">+{fmtRub(benefit)}</span>
                  )}
                </div>
                <div className="shop-body">
                  <div className="shop-name">{p.name}</div>

                  {isCert && face > 0 && (
                    <div className="cert-face">
                      Номинал {fmtRub(face)}
                      {p.validity_days ? ` · ${p.validity_days} дн.` : " · бессрочно"}
                    </div>
                  )}

                  {p.description && <div className="shop-desc">{p.description}</div>}

                  <div className="shop-bottom">
                    <span className="shop-price">{fmtRub(p.price)}</span>
                    {q === 0 ? (
                      <button
                        className="shop-add"
                        onClick={() =>
                          onAdd({
                            product_id: p.id,
                            kind: p.kind,
                            name: p.name,
                            photo_url: p.photo_url,
                            price: p.price,
                            qty: 1,
                            face_value: p.face_value,
                          })
                        }
                      >
                        +
                      </button>
                    ) : (
                      <div className="shop-qty">
                        <button onClick={() => onSetQty(p.id, q - 1)}>−</button>
                        <span>{q}</span>
                        <button onClick={() => onSetQty(p.id, q + 1)}>+</button>
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
          <button className="btn btn-primary" onClick={onCart}>
            В корзине {count} шт · {fmtRub(total)}
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------- мои товары ---------- */

export function MyProductsScreen({ onBack, onShop }: { onBack: () => void; onShop: () => void }) {
  const [items, setItems] = useState<MyProduct[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  function load() {
    apiMyProducts().then((r) => {
      setItems(r.status === 200 && r.data?.ok ? r.data.items : []);
    });
  }

  useEffect(load, []);

  async function cancel(id: string) {
    if (!confirm("Отменить резерв? Товар вернётся в продажу.")) return;
    setBusy(id);
    const r = await apiCancelReservation(id);
    setBusy(null);
    if (r.status === 200 && r.data?.ok) load();
    else alert("Не удалось отменить.");
  }

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
            <ProductLine key={i.id} item={i} busy={busy === i.id} onCancel={() => cancel(i.id)} />
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

function ProductLine({
  item,
  busy,
  onCancel,
}: {
  item: MyProduct;
  busy?: boolean;
  onCancel?: () => void;
}) {
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
        {onCancel && (
          <button className="mp-cancel" disabled={busy} onClick={onCancel}>
            {busy ? "Отменяем…" : "Отменить резерв"}
          </button>
        )}
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

/* ---------- мои сертификаты ---------- */

const CERT_STATUS: Record<string, { label: string; cls: string }> = {
  issued:   { label: "Не активирован", cls: "iss" },
  active:   { label: "Активен",        cls: "act" },
  used:     { label: "Потрачен",       cls: "usd" },
  expired:  { label: "Просрочен",      cls: "exp" },
  disabled: { label: "Отключён",       cls: "exp" },
};

export function MyCertificatesScreen({
  onBack,
  onShop,
}: {
  onBack: () => void;
  onShop: () => void;
}) {
  const [items, setItems] = useState<MyCertificate[] | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    apiMyCertificates().then((r) => {
      setItems(r.status === 200 && r.data?.ok ? r.data.items : []);
    });
  }, []);

  function copy(code: string) {
    navigator.clipboard?.writeText(code).then(
      () => {
        setCopied(code);
        setTimeout(() => setCopied(null), 1500);
      },
      () => {},
    );
  }

  if (!items) {
    return (
      <div>
        <button className="back-btn" onClick={onBack}>‹ Назад</button>
        <div className="skeleton" style={{ height: 110, borderRadius: 14, marginTop: 12 }} />
      </div>
    );
  }

  // потраченные и просроченные не показываем — только то, чем можно воспользоваться
  const live = items.filter((c) => c.status === "active" || c.status === "issued");

  return (
    <div>
      <button className="back-btn" onClick={onBack}>‹ Назад</button>
      <div className="sect-title" style={{ marginTop: 0 }}>Мои сертификаты</div>

      {live.length === 0 && (
        <div className="empty">
          Активных сертификатов нет.
          <div style={{ marginTop: 12 }}>
            <button className="mini-btn" onClick={onShop}>
              Купить в магазине
            </button>
          </div>
        </div>
      )}

      {live.map((c) => {
        const st = CERT_STATUS[c.status] ?? CERT_STATUS.active;
        const spent = Number(c.amount) - Number(c.balance);

        return (
          <div className="cert-card" key={c.id}>
            <div className="cert-top">
              <span className="cert-amount">{fmtRub(c.balance)}</span>
              <span className={`cert-st ${st.cls}`}>{st.label}</span>
            </div>

            {spent > 0 && (
              <div className="cert-spent">
                Потрачено {fmtRub(spent)} из {fmtRub(c.amount)}
              </div>
            )}

            <button className="cert-code" onClick={() => copy(c.code)}>
              <span className="cc-val">{c.code}</span>
              <span className="cc-hint">{copied === c.code ? "скопирован" : "нажмите, чтобы скопировать"}</span>
            </button>

            <div className="cert-foot">
              {c.expires_at
                ? `Действует до ${new Date(c.expires_at).toLocaleDateString("ru-RU")}`
                : "Без срока действия"}
            </div>
          </div>
        );
      })}

      {live.length > 0 && (
        <div className="book-note">
          Чтобы воспользоваться — введите код при записи, в поле рядом с баллами.
          Сертификат можно подарить: получателю достаточно ввести этот код у себя.
        </div>
      )}
    </div>
  );
}
