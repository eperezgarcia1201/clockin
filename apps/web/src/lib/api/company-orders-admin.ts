import { requestJson } from "./client";

export type CompanyOrderComparisonUnit = "each" | "lb";

export type CompanyOrderCatalogItem = {
  nameEs: string;
  nameEn: string;
  comparisonUnit?: CompanyOrderComparisonUnit;
  caseSizeLb?: number | null;
  companyUnitPrice?: number | null;
};

export type CompanyOrderCatalogSupplier = {
  supplierName: string;
  items: CompanyOrderCatalogItem[];
};

export type CompanyOrderItem = {
  id: string;
  nameEs: string;
  nameEn: string;
  quantity: number;
};

export type CompanyOrderRow = {
  id: string;
  supplierName: string;
  supplierNames?: string[];
  orderDate: string;
  weekStartDate?: string;
  weekEndDate?: string;
  orderLabel?: string;
  submittedDates?: string[];
  contributors?: string[];
  notes: string;
  officeName: string | null;
  createdBy: string | null;
  totalQuantity: number;
  itemCount: number;
  items: CompanyOrderItem[];
  createdAt: string;
  updatedAt?: string;
};

type CompanyOrderCatalogResponse = {
  suppliers?: CompanyOrderCatalogSupplier[];
};

type CompanyOrdersResponse = {
  orders?: CompanyOrderRow[];
};

type CreateCompanyOrderInput = {
  supplierName: string;
  notes?: string;
  items: Array<{
    nameEs: string;
    nameEn: string;
    quantity: number;
  }>;
};

type CreateCompanyOrderResponse = {
  weekStartDate?: string;
};

export async function getCompanyOrderCatalog(): Promise<
  CompanyOrderCatalogSupplier[]
> {
  const payload = await requestJson<CompanyOrderCatalogResponse>(
    "/api/company-orders/catalog",
  );
  return payload.suppliers ?? [];
}

export async function updateCompanyOrderCatalog(input: {
  suppliers: CompanyOrderCatalogSupplier[];
}): Promise<CompanyOrderCatalogSupplier[]> {
  const payload = await requestJson<CompanyOrderCatalogResponse>(
    "/api/company-orders/catalog",
    {
      method: "PUT",
      body: input,
    },
  );
  return payload.suppliers ?? input.suppliers;
}

export async function listCompanyOrders(
  limit = 40,
): Promise<CompanyOrderRow[]> {
  const payload = await requestJson<CompanyOrdersResponse>(
    `/api/company-orders?limit=${encodeURIComponent(String(limit))}`,
  );
  return payload.orders ?? [];
}

export async function createCompanyOrder(
  input: CreateCompanyOrderInput,
): Promise<CreateCompanyOrderResponse> {
  return requestJson<CreateCompanyOrderResponse>("/api/company-orders", {
    method: "POST",
    body: input,
  });
}
