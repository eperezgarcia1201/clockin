import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { styles } from "../App.styles";
import type { LiquorCatalogSectionProps } from "./LiquorCatalogSection.types";

export function LiquorKindLibrarySection({
  isLight,
  inline,
  liquorKindForm,
  setLiquorKindForm,
  liquorActionLoading,
  onCreateLiquorKind,
  liquorKinds,
  newKindOptions,
  selectedNewKindKey,
  deleteKindOptions,
  selectedDeleteKindKey,
  onDeleteLiquorKind,
}: LiquorCatalogSectionProps) {
  return (
    <View
      style={[
        styles.liquorSectionCard,
        isLight && styles.liquorSectionCardLight,
        { marginTop: 2 },
      ]}
    >
      <Text style={[styles.listName, isLight && styles.listNameLight]}>
        {inline("Kind Library")}
      </Text>
      <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
        {inline(
          "Pick a preset or type a new kind. You can also remove kinds you no longer use.",
        )}
      </Text>
      <View style={styles.companyOrderExportRow}>
        <View style={styles.liquorFieldHalf}>
          <Text style={[styles.label, isLight && styles.labelLight]}>{inline("New Kind")}</Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={liquorKindForm.newKind}
            onChangeText={(value) =>
              setLiquorKindForm((previous) => ({
                ...previous,
                newKind: value,
              }))
            }
            placeholder={inline("e.g. Tequila Reposado")}
          />
        </View>
        <TouchableOpacity
          style={[styles.secondaryButton, isLight && styles.secondaryButtonLight]}
          disabled={liquorActionLoading === "create-kind" || !liquorKindForm.newKind.trim()}
          onPress={onCreateLiquorKind}
        >
          <Text style={[styles.secondaryButtonText, isLight && styles.secondaryButtonTextLight]}>
            {liquorActionLoading === "create-kind" ? inline("Saving...") : inline("Add Kind")}
          </Text>
        </TouchableOpacity>
      </View>

      {liquorKinds.length > 0 ? (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.toggleRow}
          >
            {newKindOptions.map((kind) => {
              const kindKey = kind.trim().toLowerCase();
              const selected = selectedNewKindKey === kindKey;
              return (
                <TouchableOpacity
                  key={`kind-library-${kind}`}
                  style={[
                    styles.togglePill,
                    isLight && styles.togglePillLight,
                    selected && (isLight ? styles.toggleActiveLight : styles.toggleActive),
                  ]}
                  onPress={() =>
                    setLiquorKindForm((previous) => ({
                      ...previous,
                      newKind: kind,
                    }))
                  }
                >
                  <Text
                    style={[
                      styles.toggleText,
                      isLight && styles.toggleTextLight,
                      selected && isLight && styles.toggleTextLightActive,
                    ]}
                  >
                    {kind}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={[styles.label, isLight && styles.labelLight]}>{inline("Delete Kind")}</Text>
          <TextInput
            style={[styles.input, isLight && styles.inputLight]}
            value={liquorKindForm.deleteKind}
            onChangeText={(value) =>
              setLiquorKindForm((previous) => ({
                ...previous,
                deleteKind: value,
              }))
            }
            placeholder={inline("Type to find kind")}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.toggleRow}
          >
            {deleteKindOptions.map((kind) => {
              const kindKey = kind.trim().toLowerCase();
              const selected = selectedDeleteKindKey === kindKey;
              return (
                <TouchableOpacity
                  key={`kind-delete-${kind}`}
                  style={[
                    styles.togglePill,
                    isLight && styles.togglePillLight,
                    selected && (isLight ? styles.toggleActiveLight : styles.toggleActive),
                    selected && styles.toggleDanger,
                  ]}
                  onPress={() =>
                    setLiquorKindForm((previous) => ({
                      ...previous,
                      deleteKind: kind,
                    }))
                  }
                >
                  <Text
                    style={[
                      styles.toggleText,
                      isLight && styles.toggleTextLight,
                      selected && isLight && styles.toggleTextLightActive,
                    ]}
                  >
                    {kind}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity
            style={[styles.secondaryButton, isLight && styles.secondaryButtonLight]}
            disabled={liquorActionLoading === "delete-kind" || !liquorKindForm.deleteKind.trim()}
            onPress={onDeleteLiquorKind}
          >
            <Text style={[styles.secondaryButtonText, isLight && styles.secondaryButtonTextLight]}>
              {liquorActionLoading === "delete-kind"
                ? inline("Saving...")
                : inline("Delete Kind")}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
            {inline("Kinds Available")}: {liquorKinds.length}
          </Text>
        </>
      ) : (
        <Text style={[styles.listMeta, isLight && styles.listMetaLight]}>
          {inline("No kinds configured.")}
        </Text>
      )}
    </View>
  );
}
