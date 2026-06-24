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

export type Screen =
  | { name: "home" }
  | { name: "category"; id: string; title: string }
  | { name: "specialist"; id: string };
