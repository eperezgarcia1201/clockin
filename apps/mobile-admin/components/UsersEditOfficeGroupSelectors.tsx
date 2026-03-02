import type { Dispatch, SetStateAction } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { styles } from "../App.styles";
import type { EditUserForm, Group, Office } from "../types";

type UsersEditOfficeGroupSelectorsProps = {
  isLight: boolean;
  editUserForm: EditUserForm;
  setEditUserForm: Dispatch<SetStateAction<EditUserForm>>;
  offices: Office[];
  groups: Group[];
};

export function UsersEditOfficeGroupSelectors({
  isLight,
  editUserForm,
  setEditUserForm,
  offices,
  groups,
}: UsersEditOfficeGroupSelectorsProps) {
  return (
    <>
      <Text style={[styles.label, isLight && styles.labelLight]}>Location</Text>
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[
            styles.togglePill,
            isLight && styles.togglePillLight,
            !editUserForm.officeId && styles.toggleActive,
            !editUserForm.officeId && isLight && styles.toggleActiveLight,
          ]}
          onPress={() => setEditUserForm((prev) => ({ ...prev, officeId: "" }))}
        >
          <Text
            style={[
              styles.toggleText,
              isLight && styles.toggleTextLight,
              !editUserForm.officeId && isLight && styles.toggleTextLightActive,
            ]}
          >
            No Location
          </Text>
        </TouchableOpacity>
        {offices.map((office) => (
          <TouchableOpacity
            key={office.id}
            style={[
              styles.togglePill,
              isLight && styles.togglePillLight,
              editUserForm.officeId === office.id && styles.toggleActive,
              editUserForm.officeId === office.id && isLight && styles.toggleActiveLight,
            ]}
            onPress={() => setEditUserForm((prev) => ({ ...prev, officeId: office.id }))}
          >
            <Text
              style={[
                styles.toggleText,
                isLight && styles.toggleTextLight,
                editUserForm.officeId === office.id && isLight && styles.toggleTextLightActive,
              ]}
            >
              {office.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.label, isLight && styles.labelLight]}>Group</Text>
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[
            styles.togglePill,
            isLight && styles.togglePillLight,
            !editUserForm.groupId && styles.toggleActive,
            !editUserForm.groupId && isLight && styles.toggleActiveLight,
          ]}
          onPress={() => setEditUserForm((prev) => ({ ...prev, groupId: "" }))}
        >
          <Text
            style={[
              styles.toggleText,
              isLight && styles.toggleTextLight,
              !editUserForm.groupId && isLight && styles.toggleTextLightActive,
            ]}
          >
            No Group
          </Text>
        </TouchableOpacity>
        {groups.map((group) => (
          <TouchableOpacity
            key={group.id}
            style={[
              styles.togglePill,
              isLight && styles.togglePillLight,
              editUserForm.groupId === group.id && styles.toggleActive,
              editUserForm.groupId === group.id && isLight && styles.toggleActiveLight,
            ]}
            onPress={() => setEditUserForm((prev) => ({ ...prev, groupId: group.id }))}
          >
            <Text
              style={[
                styles.toggleText,
                isLight && styles.toggleTextLight,
                editUserForm.groupId === group.id && isLight && styles.toggleTextLightActive,
              ]}
            >
              {group.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );
}
