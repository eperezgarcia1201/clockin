import type { LiquorUpcLookupResponse } from "./types";

type LiquorCatalogFormState = {
  supplierName: string;
  name: string;
  brand: string;
  upc: string;
  sizeMl: string;
  unitCost: string;
};

export function mergeLiquorUpcLookupIntoForm(params: {
  payload: LiquorUpcLookupResponse;
  upc: string;
  previousForm: LiquorCatalogFormState;
}): LiquorCatalogFormState {
  const { payload, upc, previousForm } = params;

  const candidate =
    payload.item && typeof payload.item.name === "string"
      ? {
          name: payload.item.name,
          brand: typeof payload.item.brand === "string" ? payload.item.brand : "",
          upc: typeof payload.item.upc === "string" ? payload.item.upc : upc,
          sizeMl:
            typeof payload.item.sizeMl === "number" && Number.isFinite(payload.item.sizeMl)
              ? String(payload.item.sizeMl)
              : "",
          supplierName:
            typeof payload.item.supplierName === "string" ? payload.item.supplierName : "",
          unitCost:
            typeof payload.item.unitCost === "number" && Number.isFinite(payload.item.unitCost)
              ? String(payload.item.unitCost)
              : "",
        }
      : payload.candidate
        ? {
            name: payload.candidate.name || "",
            brand: payload.candidate.brand || "",
            upc: payload.candidate.upc || upc,
            sizeMl:
              typeof payload.candidate.sizeMl === "number" &&
              Number.isFinite(payload.candidate.sizeMl)
                ? String(payload.candidate.sizeMl)
                : "",
            supplierName: "",
            unitCost: "",
          }
        : null;

  const nextForm = candidate
    ? {
        ...previousForm,
        name: candidate.name || previousForm.name,
        brand: candidate.brand || previousForm.brand,
        upc: candidate.upc || previousForm.upc,
        sizeMl: candidate.sizeMl || previousForm.sizeMl,
        supplierName: candidate.supplierName || previousForm.supplierName,
        unitCost: candidate.unitCost || previousForm.unitCost,
      }
    : previousForm;

  return nextForm;
}
