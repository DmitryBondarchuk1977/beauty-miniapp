import type { CartItem, CartProduct } from "../types";

const KEY = "cart_v1";
const PKEY = "cart_products_v1";

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


/* ---------- товары в корзине ---------- */

export function loadCartProducts(): Promise<CartProduct[]> {
  return new Promise((resolve) => {
    const cs = cloud();
    if (cs?.getItem) {
      try {
        cs.getItem(PKEY, (err, value) => {
          if (err || !value) return resolve(readLocalProducts());
          try {
            resolve(JSON.parse(value) as CartProduct[]);
          } catch {
            resolve([]);
          }
        });
        return;
      } catch {
        /* старый клиент */
      }
    }
    resolve(readLocalProducts());
  });
}

export function saveCartProducts(items: CartProduct[]) {
  const value = JSON.stringify(items);
  const cs = cloud();
  if (cs?.setItem) {
    try {
      cs.setItem(PKEY, value, () => {});
    } catch {
      /* noop */
    }
  }
  try {
    localStorage.setItem(PKEY, value);
  } catch {
    /* noop */
  }
}

export function clearCartProducts() {
  const cs = cloud();
  if (cs?.removeItem) {
    try {
      cs.removeItem(PKEY, () => {});
    } catch {
      /* noop */
    }
  }
  try {
    localStorage.removeItem(PKEY);
  } catch {
    /* noop */
  }
}

function readLocalProducts(): CartProduct[] {
  try {
    const v = localStorage.getItem(PKEY);
    return v ? (JSON.parse(v) as CartProduct[]) : [];
  } catch {
    return [];
  }
}
