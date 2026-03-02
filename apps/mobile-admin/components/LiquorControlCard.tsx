import { Text, View } from "react-native";
import { styles } from "../App.styles";
import { LiquorControlFilters } from "./LiquorControlFilters";
import type { LiquorControlCardProps } from "./LiquorControlCard.types";
import { LiquorControlWorkspaceContent } from "./LiquorControlWorkspaceContent";

export function LiquorControlCard(props: LiquorControlCardProps) {
  const {
    isLight,
    inline,
    liquorInventoryEnabled,
    hasLiquorManagerAccess,
  } = props;

  return (
    <View style={[styles.card, isLight && styles.cardLight]}>
      <Text style={[styles.cardTitle, isLight && styles.cardTitleLight]}>Liquor Control</Text>
      <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
        Full manager liquor workspace: inventory sheet, catalog, operations, bottle scans,
        invoice OCR, analytics, and activity feed.
      </Text>

      {!liquorInventoryEnabled ? (
        <Text style={[styles.statusText, isLight && styles.statusTextLight]}>
          Liquor inventory is disabled for this tenant.
        </Text>
      ) : !hasLiquorManagerAccess ? (
        <Text style={[styles.statusText, isLight && styles.statusTextLight]}>
          Manager account with reports access is required.
        </Text>
      ) : (
        <>
          <LiquorControlFilters {...props} />
          <LiquorControlWorkspaceContent {...props} />
        </>
      )}
    </View>
  );
}
