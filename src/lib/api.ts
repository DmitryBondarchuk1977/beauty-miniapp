import { supabase } from "./supabase";
import type {
  Category,
  Promo,
  SpecialistCard,
  Chip,
  ServiceCard,
  ServiceDetail,
  Master,
} from "../types";

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

type CatRow = { id: string; parent_id: string | null; name: string; image_url: string | null };
type SvcRow = {
  id: string;
  name: string;
  image_url: string | null;
  duration_min: number;
  category_id: string;
  specialist_services: { price: number }[] | null;
};

export async function fetchCategoryView(
  topId: string,
): Promise<{ chips: Chip[]; services: ServiceCard[] }> {
  const { data: catsData } = await supabase
    .from("categories")
    .select("id, parent_id, name, image_url")
    .eq("is_active", true);
  const cats = (catsData as CatRow[]) ?? [];
  const byId = new Map(cats.map((c) => [c.id, c]));

  // потомки верхней категории
  const descendants = new Set<string>();
  const collect = (parent: string) => {
    for (const c of cats) {
      if (c.parent_id === parent && !descendants.has(c.id)) {
        descendants.add(c.id);
        collect(c.id);
      }
    }
  };
  collect(topId);

  const chips: Chip[] = cats
    .filter((c) => c.parent_id === topId)
    .map((c) => ({ id: c.id, name: c.name, image_url: c.image_url }));

  // ветка верхнего уровня (прямой потомок topId) для услуги
  const branchOf = (catId: string): string | null => {
    let cur: string | undefined = catId;
    let guard = 0;
    while (cur && guard++ < 10) {
      const node = byId.get(cur);
      if (!node) return null;
      if (node.parent_id === topId) return node.id;
      cur = node.parent_id ?? undefined;
    }
    return null;
  };

  const ids = [...descendants];
  if (ids.length === 0) return { chips, services: [] };

  const { data: svcData } = await supabase
    .from("services")
    .select("id, name, image_url, duration_min, category_id, specialist_services ( price )")
    .in("category_id", ids)
    .eq("is_active", true)
    .order("name");

  const services: ServiceCard[] = ((svcData as SvcRow[]) ?? []).map((s) => {
    const prices = (s.specialist_services ?? []).map((x) => x.price);
    return {
      id: s.id,
      name: s.name,
      image_url: s.image_url,
      duration_min: s.duration_min,
      price_from: prices.length ? Math.min(...prices) : null,
      branch_id: branchOf(s.category_id),
    };
  });

  return { chips, services };
}

type MasterRow = {
  price: number;
  specialist: {
    id: string;
    full_name: string;
    photo_url: string | null;
    rating: number;
    is_active: boolean;
  } | null;
};

export async function fetchServiceDetail(
  serviceId: string,
): Promise<{ service: ServiceDetail; masters: Master[] } | null> {
  const { data: svc } = await supabase
    .from("services")
    .select("id, name, image_url, duration_min, description")
    .eq("id", serviceId)
    .maybeSingle();
  if (!svc) return null;

  const { data: ms } = await supabase
    .from("specialist_services")
    .select("price, specialist:specialists ( id, full_name, photo_url, rating, is_active )")
    .eq("service_id", serviceId);

  const masters: Master[] = ((ms as unknown as MasterRow[]) ?? [])
    .filter((m) => m.specialist?.is_active)
    .map((m) => ({
      id: m.specialist!.id,
      full_name: m.specialist!.full_name,
      photo_url: m.specialist!.photo_url,
      rating: m.specialist!.rating,
      price: m.price,
    }))
    .sort((a, b) => a.price - b.price);

  return { service: svc as ServiceDetail, masters };
}
