import { Text, View } from "react-native";
import { styles } from "../App.styles";
import { LiquorCatalogAiSection } from "./LiquorCatalogAiSection";
import { LiquorCatalogCreateFormSection } from "./LiquorCatalogCreateFormSection";
import { LiquorCatalogListSection } from "./LiquorCatalogListSection";
import { LiquorCatalogSearchSection } from "./LiquorCatalogSearchSection";
import type { LiquorCatalogSectionProps } from "./LiquorCatalogSection.types";
import { LiquorCatalogUpcLookupSection } from "./LiquorCatalogUpcLookupSection";
import { LiquorKindLibrarySection } from "./LiquorKindLibrarySection";

export function LiquorCatalogSection(props: LiquorCatalogSectionProps) {
  const { isLight, inline } = props;

  return (
    <View style={[styles.liquorSectionCard, isLight && styles.liquorSectionCardLight]}>
      <Text style={[styles.listName, isLight && styles.listNameLight]}>{inline("Catalog")}</Text>
      <LiquorCatalogSearchSection {...props} />
      <LiquorKindLibrarySection {...props} />
      <LiquorCatalogAiSection {...props} />
      <LiquorCatalogUpcLookupSection {...props} />
      <LiquorCatalogCreateFormSection {...props} />
      <LiquorCatalogListSection {...props} />
    </View>
  );
}
