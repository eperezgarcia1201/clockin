import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { styles } from "../App.styles";
import type { Group } from "../types";

type GroupsCardProps = {
  isLight: boolean;
  newGroupName: string;
  onNewGroupNameChange: (value: string) => void;
  groupStatus: string | null;
  inlineOrNull: (value: string | null | undefined) => string | null;
  onCreateGroup: () => void;
  groups: Group[];
};

export function GroupsCard({
  isLight,
  newGroupName,
  onNewGroupNameChange,
  groupStatus,
  inlineOrNull,
  onCreateGroup,
  groups,
}: GroupsCardProps) {
  return (
    <View style={[styles.card, isLight && styles.cardLight]}>
      <Text style={[styles.cardTitle, isLight && styles.cardTitleLight]}>
        Groups
      </Text>
      <TextInput
        style={[styles.input, isLight && styles.inputLight]}
        placeholder="New group name"
        value={newGroupName}
        onChangeText={onNewGroupNameChange}
      />
      {groupStatus && (
        <Text style={[styles.statusText, isLight && styles.statusTextLight]}>
          {inlineOrNull(groupStatus)}
        </Text>
      )}
      <TouchableOpacity
        style={[styles.button, styles.primary]}
        onPress={onCreateGroup}
      >
        <Text style={[styles.primaryText, isLight && styles.primaryTextLight]}>
          Create Group
        </Text>
      </TouchableOpacity>
      <View style={[styles.divider, isLight && styles.dividerLight]} />
      {groups.map((group) => (
        <Text
          key={group.id}
          style={[styles.listName, isLight && styles.listNameLight]}
        >
          {group.name}
        </Text>
      ))}
    </View>
  );
}
