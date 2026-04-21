import { requestJson } from "./client";

export type CompanyOrderCatalogItem = {
  nameEs: string;
  nameEn: string;
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

export type InPersonShoppingItem = {
  rowKey: string;
  key: string;
  nameEs: string;
  nameEn: string;
  orderedQuantity: number;
  purchasedQuantity: number;
  remainingQuantity: number;
  price: number;
  updatedAt?: string | null;
};

export type InPersonShoppingSupplier = {
  supplierName: string;
  itemCount: number;
  remainingItemCount: number;
  totalOrderedQuantity: number;
  totalPurchasedQuantity: number;
  totalRemainingQuantity: number;
  totalPrice: number;
  items: InPersonShoppingItem[];
};

export type InPersonShoppingWeek = {
  weekStartDate: string;
  weekEndDate: string;
  officeId?: string | null;
  locationLabel?: string;
  supplierCount: number;
  itemCount: number;
  remainingItemCount: number;
  totalOrderedQuantity: number;
  totalPurchasedQuantity: number;
  totalRemainingQuantity: number;
  totalPrice: number;
  suppliers: InPersonShoppingSupplier[];
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

type InPersonShoppingResponse = InPersonShoppingWeek;

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

export async function getInPersonShopping(
  weekStart?: string,
): Promise<InPersonShoppingWeek> {
  const query = new URLSearchParams();
  if (weekStart) {
    query.set("weekStart", weekStart);
  }
  const suffix = query.toString();
  return requestJson<InPersonShoppingResponse>(
    `/api/company-orders/in-person${suffix ? `?${suffix}` : ""}`,
  );
}

export async function updateInPersonShoppingItem(input: {
  weekStart: string;
  supplierName: string;
  nameEs: string;
  nameEn: string;
  purchasedQuantity: number;
  price?: number;
}): Promise<void> {
  await requestJson<unknown>("/api/company-orders/in-person", {
    method: "PUT",
    body: input,
  });
}
