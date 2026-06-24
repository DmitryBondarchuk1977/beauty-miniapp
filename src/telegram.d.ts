interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  initData: string;
  initDataUnsafe: {
    user?: { id: number; first_name?: string; last_name?: string; username?: string };
  };
  colorScheme?: "light" | "dark";
}
interface Window {
  Telegram?: { WebApp: TelegramWebApp };
}
