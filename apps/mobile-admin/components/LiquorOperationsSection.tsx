import { Text, View } from "react-native";
import { styles } from "../App.styles";
import { LiquorMovementFormSection } from "./LiquorMovementFormSection";
import { LiquorQuickCountFormSection } from "./LiquorQuickCountFormSection";
import type { LiquorOperationsSectionProps } from "./LiquorOperationsSection.types";

export function LiquorOperationsSection({
  isLight,
  inline,
  sortedCatalogItems,
  offices,
  liquorMovementTypes,
  liquorMovementForm,
  setLiquorMovementForm,
  liquorActionLoading,
  onCreateLiquorMovement,
  liquorQuickCountForm,
  setLiquorQuickCountForm,
  formatQtyValue,
  quickCountBodegaMl,
  onSaveLiquorQuickCount,
}: LiquorOperationsSectionProps) {
  return (
    <View style={[styles.liquorSectionCard, isLight && styles.liquorSectionCardLight]}>
      <Text style={[styles.listName, isLight && styles.listNameLight]}>
        {inline("Movements & Counts")}
      </Text>
      <LiquorMovementFormSection
        isLight={isLight}
        inline={inline}
        sortedCatalogItems={sortedCatalogItems}
        offices={offices}
        liquorMovementTypes={liquorMovementTypes}
        liquorMovementForm={liquorMovementForm}
        setLiquorMovementForm={setLiquorMovementForm}
        liquorActionLoading={liquorActionLoading}
        onCreateLiquorMovement={onCreateLiquorMovement}
      />
      <LiquorQuickCountFormSection
        isLight={isLight}
        inline={inline}
        sortedCatalogItems={sortedCatalogItems}
        offices={offices}
        liquorQuickCountForm={liquorQuickCountForm}
        setLiquorQuickCountForm={setLiquorQuickCountForm}
        formatQtyValue={formatQtyValue}
        quickCountBodegaMl={quickCountBodegaMl}
        liquorActionLoading={liquorActionLoading}
        onSaveLiquorQuickCount={onSaveLiquorQuickCount}
      />
    </View>
  );
}
