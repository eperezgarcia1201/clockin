import { clockinFetch } from "./clockin-api";

type CompanySettings = {
  companyName?: string;
  companyLegalName?: string;
  companyAddressLine1?: string;
  companyAddressLine2?: string;
  companyCity?: string;
  companyState?: string;
  companyPostalCode?: string;
  companyCountry?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyWebsite?: string;
  companyTaxId?: string;
};

export type CompanyExportProfile = {
  displayName: string;
  legalName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  taxId: string;
};

const clean = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

export const getCompanyExportProfile = async (): Promise<CompanyExportProfile> => {
  const fallback: CompanyExportProfile = {
    displayName: "WEBSYS WORKFORCE",
    legalName: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
    phone: "",
    email: "",
    website: "",
    taxId: "",
  };

  try {
    const response = await clockinFetch("/settings", { cache: "no-store" });
    if (!response.ok) {
      return fallback;
    }

    const data = (await response.json()) as CompanySettings;
    const companyName = clean(data.companyName);
    const companyLegalName = clean(data.companyLegalName);

    return {
      displayName: companyName || companyLegalName || fallback.displayName,
      legalName: companyLegalName,
      addressLine1: clean(data.companyAddressLine1),
      addressLine2: clean(data.companyAddressLine2),
      city: clean(data.companyCity),
      state: clean(data.companyState),
      postalCode: clean(data.companyPostalCode),
      country: clean(data.companyCountry),
      phone: clean(data.companyPhone),
      email: clean(data.companyEmail),
      website: clean(data.companyWebsite),
      taxId: clean(data.companyTaxId),
    };
  } catch {
    return fallback;
  }
};

export const companyAddressLine = (company: CompanyExportProfile) => {
  const cityLine = [company.city, company.state, company.postalCode]
    .filter(Boolean)
    .join(", ");
  return [company.addressLine1, company.addressLine2, cityLine, company.country]
    .filter(Boolean)
    .join(" | ");
};

export const companyContactLine = (company: CompanyExportProfile) =>
  [company.phone, company.email, company.website].filter(Boolean).join(" | ");

export const companyMetaRows = (company: CompanyExportProfile) => {
  const rows: Array<[string, string]> = [["Company", company.displayName]];

  if (company.legalName && company.legalName !== company.displayName) {
    rows.push(["Legal Name", company.legalName]);
  }
  if (companyAddressLine(company)) {
    rows.push(["Address", companyAddressLine(company)]);
  }
  if (companyContactLine(company)) {
    rows.push(["Contact", companyContactLine(company)]);
  }
  if (company.taxId) {
    rows.push(["Tax ID", company.taxId]);
  }

  return rows;
};

