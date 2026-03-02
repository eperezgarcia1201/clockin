import { getCurrentWeekStartDateKey } from "./app-helpers";
import { apiBaseCandidates } from "./api-runtime";
import type { Lang } from "./copy";
import { downloadCompanyOrderExport } from "./company-order-export";
import type { CompanyOrderSupplierPayload } from "./company-order-view-helpers";

type FetchJson = (path: string, init?: RequestInit) => Promise<unknown>;

export const validateCompanyOrderSubmission = (
  supplierPayloads: CompanyOrderSupplierPayload[],
): { ok: true } | { ok: false; error: string } => {
  if (supplierPayloads.length === 0) {
    return { ok: false, error: "Enter at least one item quantity." };
  }
  return { ok: true };
};

export const submitCompanyOrdersRequest = async (params: {
  fetchJson: FetchJson;
  supplierPayloads: CompanyOrderSupplierPayload[];
  officeId: string;
  notes: string;
  initialWeekStartDate: string;
}): Promise<
  | { ok: true; weekStartDate: string; supplierCount: number }
  | { ok: false; error: string }
> => {
  try {
    let weekStartDate = params.initialWeekStartDate;
    for (const payload of params.supplierPayloads) {
      const createdOrder = (await params.fetchJson("/company-orders", {
        method: "POST",
        body: JSON.stringify({
          supplierName: payload.supplierName,
          officeId: params.officeId || undefined,
          notes: params.notes.trim() || undefined,
          items: payload.items,
        }),
      })) as { weekStartDate?: string };
      if (typeof createdOrder.weekStartDate === "string") {
        weekStartDate = createdOrder.weekStartDate;
      }
    }
    return {
      ok: true,
      weekStartDate,
      supplierCount: params.supplierPayloads.length,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to submit order.",
    };
  }
};

export const buildCompanyOrderSubmittedStatus = (supplierCount: number): string =>
  `Company order submitted for ${supplierCount} suppliers.`;

export const resolveCompanyOrderExportWeekStart = (
  lastSubmittedCompanyOrderWeekStart: string,
): string => lastSubmittedCompanyOrderWeekStart || getCurrentWeekStartDateKey();

export const buildCompanyOrderExportStatus = (
  format: "pdf" | "csv" | "excel",
  weekStartDate: string,
  ok: boolean,
): string => {
  if (ok) {
    return `${format.toUpperCase()} ready for week ${weekStartDate}.`;
  }
  return "Unable to export company order.";
};

export const fetchCompanyOrderExportRequest = async (params: {
  format: "pdf" | "csv" | "excel";
  weekStartDate: string;
  resolvedApiBase: string | null;
  loggedIn: boolean;
  activeTenant: string;
  tenantInput: string;
  activeAdminUsername: string;
  username: string;
  companyOrdersOfficeId: string;
  language: Lang;
  bytesToBase64: (bytes: Uint8Array) => string;
  defaultTenant: string;
}): Promise<{ ok: boolean; resolvedApiBase: string | null }> => {
  const orderedBases = params.resolvedApiBase
    ? [params.resolvedApiBase]
    : (Array.from(new Set(apiBaseCandidates.filter(Boolean))) as string[]);
  const tenantHeader =
    (params.loggedIn ? params.activeTenant : params.tenantInput).trim() ||
    params.defaultTenant;
  const activeLoginName = (
    (params.loggedIn ? params.activeAdminUsername : params.username) || ""
  ).trim();
  const result = await downloadCompanyOrderExport({
    format: params.format,
    weekStartDate: params.weekStartDate,
    orderedBases,
    companyOrdersOfficeId: params.companyOrdersOfficeId,
    tenantHeader,
    activeLoginName,
    language: params.language,
    bytesToBase64: params.bytesToBase64,
  });
  return {
    ok: result.ok,
    resolvedApiBase: result.resolvedApiBase || null,
  };
};
