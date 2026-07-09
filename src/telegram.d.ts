interface TelegramBackButton {
  show: () => void;
  hide: () => void;
  onClick: (cb: () => void) => void;
  offClick: (cb: () => void) => void;
}
interface TelegramCloudStorage {
  getItem: (key: string, cb: (err: unknown, value: string | null) => void) => void;
  setItem: (key: string, value: string, cb?: (err: unknown, ok: boolean) => void) => void;
  removeItem: (key: string, cb?: (err: unknown, ok: boolean) => void) => void;
}
interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  version?: string;
  initData: string;
  initDataUnsafe: {
    user?: { id: number; first_name?: string; last_name?: string; username?: string; photo_url?: string };
  };
  colorScheme?: "light" | "dark";
  BackButton?: TelegramBackButton;
  CloudStorage?: TelegramCloudStorage;
}
interface Window {
  Telegram?: { WebApp: TelegramWebApp };
}
