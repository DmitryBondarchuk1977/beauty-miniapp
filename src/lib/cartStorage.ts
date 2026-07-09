import type { CartItem } from "../types";

const KEY = "cart_v1";

function cloud() {
  return window.Telegram?.WebApp?.CloudStorage;
}

export function loadCart(): Promise<CartItem[]> {
  return new Promise((resolve) => {
    const cs = cloud();
    if (cs?.getItem) {
      try {
        cs.getItem(KEY, (err, value) => {
          if (err || !value) return resolve(readLocal());
          try {
            resolve(JSON.parse(value) as CartItem[]);
          } catch {
            resolve([]);
          }
        });
        return;
      } catch {
        /* старый клиент — падаем в localStorage */
      }
    }
    resolve(readLocal());
  });
}

export function saveCart(cart: CartItem[]) {
  const value = JSON.stringify(cart);
  const cs = cloud();
  if (cs?.setItem) {
    try {
      cs.setItem(KEY, value, () => {});
    } catch {
      /* noop */
    }
  }
  writeLocal(value);
}

export function clearCart() {
  const cs = cloud();
  if (cs?.removeItem) {
    try {
      cs.removeItem(KEY, () => {});
    } catch {
      /* noop */
    }
  }
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}

function readLocal(): CartItem[] {
  try {
    const v = localStorage.getItem(KEY);
    return v ? (JSON.parse(v) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(value: string) {
  try {
    localStorage.setItem(KEY, value);
  } catch {
    /* noop */
  }
}
