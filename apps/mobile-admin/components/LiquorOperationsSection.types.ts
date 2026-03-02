import type { Dispatch, SetStateAction } from "react";
import type { LiquorCatalogItem, LiquorMovementType, Office } from "../types";

export type LiquorMovementFormState = {
  itemId: string;
  officeId: string;
  type: LiquorMovementType;
  quantity: string;
  occurredAt: string;
  notes: string;
};

export type LiquorQuickCountFormState = {
  itemId: string;
  officeId: string;
  countDate: string;
  quantity: string;
  barQuantity: string;
  bodegaBottleCount: string;
  notes: string;
};

export type LiquorOperationsSectionProps = {
  isLight: boolean;
  inline: (value: string) => string;
  sortedCatalogItems: LiquorCatalogItem[];
  offices: Office[];
  liquorMovementTypes: LiquorMovementType[];
  liquorMovementForm: LiquorMovementFormState;
  setLiquorMovementForm: Dispatch<SetStateAction<LiquorMovementFormState>>;
  liquorActionLoading: string | null;
  onCreateLiquorMovement: () => void;
  liquorQuickCountForm: LiquorQuickCountFormState;
  setLiquorQuickCountForm: Dispatch<SetStateAction<LiquorQuickCountFormState>>;
  formatQtyValue: (value: number | null | undefined) => string;
  quickCountBodegaMl: number;
  onSaveLiquorQuickCount: () => void;
};
