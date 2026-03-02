import { useState } from "react";
import { getCurrentWeekStartDateKey } from "./app-helpers";
import type { CompanyOrderDrafts } from "./company-order-draft-helpers";
import type { CompanyOrderCatalogSupplier, CompanyOrderRow } from "./types";

export function useAdminCompanyOrderState() {
  const [companyOrderCatalog, setCompanyOrderCatalog] = useState<
    CompanyOrderCatalogSupplier[]
  >([]);
  const [companyOrderSupplier, setCompanyOrderSupplier] = useState("");
  const [companyOrderSearch, setCompanyOrderSearch] = useState("");
  const [companyOrderShowOnlyAdded, setCompanyOrderShowOnlyAdded] =
    useState(false);
  const [companyOrderVisibleCount, setCompanyOrderVisibleCount] = useState(16);
  const [companyOrderNotes, setCompanyOrderNotes] = useState("");
  const [companyOrderDrafts, setCompanyOrderDrafts] = useState<
    CompanyOrderDrafts
  >({});
  const [companyOrderRows, setCompanyOrderRows] = useState<CompanyOrderRow[]>(
    [],
  );
  const [companyOrderLoading, setCompanyOrderLoading] = useState(false);
  const [companyOrderSaving, setCompanyOrderSaving] = useState(false);
  const [companyOrderExportingFormat, setCompanyOrderExportingFormat] =
    useState<"pdf" | "csv" | "excel" | null>(null);
  const [
    lastSubmittedCompanyOrderWeekStart,
    setLastSubmittedCompanyOrderWeekStart,
  ] = useState(getCurrentWeekStartDateKey());
  const [companyOrderStatus, setCompanyOrderStatus] = useState<string | null>(
    null,
  );

  return {
    companyOrderCatalog,
    setCompanyOrderCatalog,
    companyOrderSupplier,
    setCompanyOrderSupplier,
    companyOrderSearch,
    setCompanyOrderSearch,
    companyOrderShowOnlyAdded,
    setCompanyOrderShowOnlyAdded,
    companyOrderVisibleCount,
    setCompanyOrderVisibleCount,
    companyOrderNotes,
    setCompanyOrderNotes,
    companyOrderDrafts,
    setCompanyOrderDrafts,
    companyOrderRows,
    setCompanyOrderRows,
    companyOrderLoading,
    setCompanyOrderLoading,
    companyOrderSaving,
    setCompanyOrderSaving,
    companyOrderExportingFormat,
    setCompanyOrderExportingFormat,
    lastSubmittedCompanyOrderWeekStart,
    setLastSubmittedCompanyOrderWeekStart,
    companyOrderStatus,
    setCompanyOrderStatus,
  };
}
