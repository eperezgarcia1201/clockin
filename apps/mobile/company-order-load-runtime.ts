import { normalizeCompanyOrderCatalogSuppliers } from "./company-order-catalog-normalizers";
import {
  buildCompanyOrdersQueryString,
  normalizeCompanyOrderRows,
} from "./company-order-runtime";
import type { CompanyOrderCatalogSupplier, CompanyOrderRow } from "./types";

type FetchJson = (path: string, init?: RequestInit) => Promise<unknown>;

export const loadCompanyOrderCatalogSuppliers = async (params: {
  fetchJson: FetchJson;
  companyOrderHeaders?: Record<string, string>;
}): Promise<CompanyOrderCatalogSupplier[]> => {
  const data = (await params.fetchJson("/company-orders/catalog", {
    headers: params.companyOrderHeaders,
  })) as {
    suppliers?: Array<{ supplierName?: string; items?: unknown[] }>;
  };
  return normalizeCompanyOrderCatalogSuppliers(data);
};

export const loadCompanyOrderRows = async (params: {
  fetchJson: FetchJson;
  selectedOfficeId: string | null;
  companyOrderHeaders?: Record<string, string>;
  limit: number;
}): Promise<CompanyOrderRow[]> => {
  const query = buildCompanyOrdersQueryString(params.selectedOfficeId, params.limit);
  const data = (await params.fetchJson(`/company-orders?${query}`, {
    headers: params.companyOrderHeaders,
  })) as { orders?: CompanyOrderRow[] };
  return normalizeCompanyOrderRows(data);
};
