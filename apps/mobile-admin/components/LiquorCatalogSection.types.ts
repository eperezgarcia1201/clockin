import type { Dispatch, SetStateAction } from "react";
import type {
  LiquorCatalogAiResponse,
  LiquorCatalogItem,
  LiquorUpcLookupResponse,
} from "../types";

export type LiquorKindFormState = {
  newKind: string;
  deleteKind: string;
};

export type LiquorCatalogFormState = {
  supplierName: string;
  name: string;
  brand: string;
  upc: string;
  sizeMl: string;
  unitCost: string;
};

export type LiquorCatalogSectionProps = {
  isLight: boolean;
  inline: (value: string) => string;
  liquorCatalogSearch: string;
  onLiquorCatalogSearchChange: (value: string) => void;
  catalogSuggestions: LiquorCatalogItem[];
  liquorKindForm: LiquorKindFormState;
  setLiquorKindForm: Dispatch<SetStateAction<LiquorKindFormState>>;
  liquorActionLoading: string | null;
  onCreateLiquorKind: () => void;
  liquorKinds: string[];
  newKindOptions: string[];
  selectedNewKindKey: string;
  deleteKindOptions: string[];
  selectedDeleteKindKey: string;
  onDeleteLiquorKind: () => void;
  hasLiquorPremiumAccess: boolean;
  liquorCatalogAiQuery: string;
  onLiquorCatalogAiQueryChange: (value: string) => void;
  liquorCatalogAiLoading: boolean;
  onAssistLiquorCatalog: () => void;
  liquorCatalogAiResult: LiquorCatalogAiResponse | null;
  onApplyAiMatchToCatalogSearch: (value: string) => void;
  onJumpAiMatchToInventory: (value: string) => void;
  liquorLookupUpc: string;
  onLiquorLookupUpcChange: (value: string) => void;
  liquorLookupLoading: boolean;
  onLookupLiquorByUpc: () => void;
  liquorLookupResult: LiquorUpcLookupResponse | null;
  liquorCatalogForm: LiquorCatalogFormState;
  setLiquorCatalogForm: Dispatch<SetStateAction<LiquorCatalogFormState>>;
  catalogKindOptions: string[];
  onCreateLiquorCatalogItem: () => void;
  visibleCatalogItems: LiquorCatalogItem[];
  catalogQuery: string;
  formatMoneyValue: (value: number | null | undefined) => string;
  hasMoreCatalogItems: boolean;
  onShowMoreCatalogItems: () => void;
  filteredCatalogItemsCount: number;
};
