import { api } from "./axios";
import type { CmsPage, PageListItem, SiteConfig, ContactBody } from "@zaminex/shared";

export async function fetchSiteConfig(): Promise<SiteConfig> {
  const { data } = await api.get<{ data: SiteConfig }>("/cms/site");
  return data.data;
}

export async function fetchPageList(): Promise<PageListItem[]> {
  const { data } = await api.get<{ data: PageListItem[] }>("/cms/pages");
  return data.data;
}

export async function fetchPage(slug: string): Promise<CmsPage> {
  const { data } = await api.get<{ data: CmsPage }>(`/cms/pages/${slug}`);
  return data.data;
}

export async function submitContact(payload: ContactBody): Promise<void> {
  await api.post("/cms/contact", payload);
}