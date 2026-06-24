import { supabase } from "./supabase";
import type { Category, Promo, SpecialistCard } from "../types";

export async function fetchCategories(): Promise<Category[]> {
  const { data } = await supabase
    .from("categories")
    .select("id, name, image_url")
    .is("parent_id", null)
    .eq("is_active", true)
    .order("sort_order")
    .order("name");
  return (data as Category[]) ?? [];
}

export async function fetchPromos(): Promise<Promo[]> {
  const { data } = await supabase
    .from("promotions")
    .select("id, title, banner_url, kind, discount_type, discount_value")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  return (data as Promo[]) ?? [];
}

type SpecRow = {
  id: string;
  full_name: string;
  photo_url: string | null;
  rating: number;
  specialist_services: { price: number }[] | null;
};

export async function fetchSpecialists(): Promise<SpecialistCard[]> {
  const { data } = await supabase
    .from("specialists")
    .select("id, full_name, photo_url, rating, specialist_services ( price )")
    .eq("is_active", true)
    .order("sort_order")
    .order("created_at");

  return ((data as SpecRow[]) ?? []).map((s) => {
    const prices = (s.specialist_services ?? []).map((x) => x.price);
    return {
      id: s.id,
      full_name: s.full_name,
      photo_url: s.photo_url,
      rating: s.rating,
      price_from: prices.length ? Math.min(...prices) : null,
    };
  });
}
