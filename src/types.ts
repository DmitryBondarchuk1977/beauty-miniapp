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
  | { name: "category"; id: string; title: string }
  | { name: "service"; id: string }
  | { name: "specialist"; id: string }
  | { name: "confirm"; bookingId: string }
  | { name: "review"; bookingId: string }
  | { name: "cancel"; bookingId: string }
  | { name: "cart" }
  | { name: "booking"; serviceId: string; specialistId: string };

export type CartItem = {
  service_id: string;
  service_name: string;
  specialist_id: string;
  specialist_name: string;
  base_price: number;
};
