import { useState } from "react";
import { getCurrentWeekStartDateKey } from "./app-helpers";
import type { CompanyOrderDrafts } from "./company-order-draft-helpers";
import type { CompanyOrderInPersonDrafts } from "./company-order-in-person-runtime";
import type { CompanyOrderCatalogSupplier, CompanyOrderRow } from "./types";
import type { CompanyOrderInPersonSupplier } from "./types";

export function useAdminCompanyOrderState() {
  const [companyOrderMode, setCompanyOrderMode] = useState<"orders" | "inPerson">(
    "orders",
  );
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
  const [companyOrderExportAllCompanies, setCompanyOrderExportAllCompanies] =
    useState(true);
  const [
    lastSubmittedCompanyOrderWeekStart,
    setLastSubmittedCompanyOrderWeekStart,
  ] = useState(getCurrentWeekStartDateKey());
  const [companyOrderStatus, setCompanyOrderStatus] = useState<string | null>(
    null,
  );
  const [companyOrderInPersonWeekStartDate, setCompanyOrderInPersonWeekStartDate] =
    useState(getCurrentWeekStartDateKey());
  const [companyOrderInPersonWeekEndDate, setCompanyOrderInPersonWeekEndDate] =
    useState("");
  const [companyOrderInPersonSuppliers, setCompanyOrderInPersonSuppliers] =
    useState<CompanyOrderInPersonSupplier[]>([]);
  const [companyOrderInPersonSupplier, setCompanyOrderInPersonSupplier] =
    useState("");
  const [companyOrderInPersonSearch, setCompanyOrderInPersonSearch] =
    useState("");
  const [companyOrderInPersonDrafts, setCompanyOrderInPersonDrafts] =
    useState<CompanyOrderInPersonDrafts>({});
  const [companyOrderInPersonLoading, setCompanyOrderInPersonLoading] =
    useState(false);
  const [companyOrderInPersonSaving, setCompanyOrderInPersonSaving] =
    useState(false);
  const [companyOrderInPersonStatus, setCompanyOrderInPersonStatus] =
    useState<string | null>(null);

  return {
    companyOrderMode,
    setCompanyOrderMode,
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
    companyOrderExportAllCompanies,
    setCompanyOrderExportAllCompanies,
    lastSubmittedCompanyOrderWeekStart,
    setLastSubmittedCompanyOrderWeekStart,
    companyOrderStatus,
    setCompanyOrderStatus,
    companyOrderInPersonWeekStartDate,
    setCompanyOrderInPersonWeekStartDate,
    companyOrderInPersonWeekEndDate,
    setCompanyOrderInPersonWeekEndDate,
    companyOrderInPersonSuppliers,
    setCompanyOrderInPersonSuppliers,
    companyOrderInPersonSupplier,
    setCompanyOrderInPersonSupplier,
    companyOrderInPersonSearch,
    setCompanyOrderInPersonSearch,
    companyOrderInPersonDrafts,
    setCompanyOrderInPersonDrafts,
    companyOrderInPersonLoading,
    setCompanyOrderInPersonLoading,
    companyOrderInPersonSaving,
    setCompanyOrderInPersonSaving,
    companyOrderInPersonStatus,
    setCompanyOrderInPersonStatus,
  };
}
