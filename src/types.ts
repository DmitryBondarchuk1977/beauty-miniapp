export type Category = {
  id: string;
  name: string;
  image_url: string | null;
};

export type Promo = {
  id: string;
  title: string;
  banner_url: string | null;
  kind: "discount" | "gift";
  discount_type: "percent" | "fixed" | null;
  discount_value: number | null;
};

export type SpecialistCard = {
  id: string;
  full_name: string;
  photo_url: string | null;
  rating: number;
  price_from: number | null;
};

export type Chip = { id: string; name: string; image_url: string | null };

export type ServiceCard = {
  id: string;
  name: string;
  image_url: string | null;
  duration_min: number;
  price_from: number | null;
  branch_id: string | null;
};

export type ServiceDetail = {
  id: string;
  name: string;
  image_url: string | null;
  duration_min: number;
  description: string | null;
};

export type Master = {
  id: string;
  full_name: string;
  photo_url: string | null;
  rating: number;
  price: number;
};

export type Screen =
  | { name: "home" }
  | { name: "bookings" }
  | { name: "profile" }
  | { name: "favorites" }
  | { name: "my-reviews" }
  | { name: "loyalty" }
  | { name: "category"; id: string; title: string }
  | { name: "service"; id: string }
  | { name: "specialist"; id: string }
  | { name: "confirm"; bookingId: string }
  | { name: "review"; bookingId: string }
  | { name: "cancel"; bookingId: string }
  | { name: "unsub"; broadcastId: string | null }
  | { name: "reschedule"; bookingId: string; serviceId: string; specialistId: string; origStartsAt: string }
  | { name: "master-link" }
  | { name: "shop" }
  | { name: "reserved-done" }
  | { name: "my-waitlist" }
  | { name: "my-products" }
  | { name: "cart" }
  | { name: "schedule" }
  | { name: "booking"; serviceId: string; specialistId: string; presetSlot?: string };

export type CartItem = {
  service_id: string;
  service_name: string;
  specialist_id: string;
  specialist_name: string;
  base_price: number;
};

/** товар в корзине */
export type CartProduct = {
  product_id: string;
  name: string;
  photo_url: string | null;
  price: number;
  qty: number;
};

export type CheckoutPosition = {
  key: string;
  service_id: string;
  service_name: string;
  specialist_id: string | null;
  specialist_name: string | null;
  base_price: number;
  final_price: number;
  discount: number;
  promo_title: string | null;
  is_gift: boolean;
  gift_discount_percent: number;
};
