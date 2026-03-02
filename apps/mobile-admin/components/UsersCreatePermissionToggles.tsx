import type { Dispatch, SetStateAction } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { styles } from "../App.styles";

type UsersCreatePermissionTogglesProps = {
  isLight: boolean;
  newUserIsManager: boolean;
  setNewUserIsManager: Dispatch<SetStateAction<boolean>>;
  newUserIsOwnerManager: boolean;
  setNewUserIsOwnerManager: Dispatch<SetStateAction<boolean>>;
  newUserIsAdmin: boolean;
  setNewUserIsAdmin: Dispatch<SetStateAction<boolean>>;
  newUserIsTimeAdmin: boolean;
  setNewUserIsTimeAdmin: Dispatch<SetStateAction<boolean>>;
  newUserIsReports: boolean;
  setNewUserIsReports: Dispatch<SetStateAction<boolean>>;
  newUserIsKitchenManager: boolean;
  setNewUserIsKitchenManager: Dispatch<SetStateAction<boolean>>;
  newUserIsServer: boolean;
  setNewUserIsServer: Dispatch<SetStateAction<boolean>>;
};

export function UsersCreatePermissionToggles({
  isLight,
  newUserIsManager,
  setNewUserIsManager,
  newUserIsOwnerManager,
  setNewUserIsOwnerManager,
  newUserIsAdmin,
  setNewUserIsAdmin,
  newUserIsTimeAdmin,
  setNewUserIsTimeAdmin,
  newUserIsReports,
  setNewUserIsReports,
  newUserIsKitchenManager,
  setNewUserIsKitchenManager,
  newUserIsServer,
  setNewUserIsServer,
}: UsersCreatePermissionTogglesProps) {
  return (
    <View style={styles.toggleRow}>
      <TouchableOpacity
        style={[
          styles.togglePill,
          isLight && styles.togglePillLight,
          newUserIsManager && styles.toggleActive,
          newUserIsManager && isLight && styles.toggleActiveLight,
        ]}
        onPress={() =>
          setNewUserIsManager((prev) => {
            const enabled = !prev;
            if (!enabled) {
              setNewUserIsOwnerManager(false);
            }
            return enabled;
          })
        }
      >
        <Text
          style={[
            styles.toggleText,
            isLight && styles.toggleTextLight,
            newUserIsManager && isLight && styles.toggleTextLightActive,
          ]}
        >
          Manager
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.togglePill,
          isLight && styles.togglePillLight,
          newUserIsOwnerManager && styles.toggleActive,
          newUserIsOwnerManager && isLight && styles.toggleActiveLight,
          !newUserIsManager && styles.inlineButtonDisabled,
        ]}
        onPress={() =>
          setNewUserIsOwnerManager((prev) => (newUserIsManager ? !prev : false))
        }
        disabled={!newUserIsManager}
      >
        <Text
          style={[
            styles.toggleText,
            isLight && styles.toggleTextLight,
            newUserIsOwnerManager && isLight && styles.toggleTextLightActive,
          ]}
        >
          Manager Owner
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.togglePill,
          isLight && styles.togglePillLight,
          newUserIsAdmin && styles.toggleActive,
          newUserIsAdmin && isLight && styles.toggleActiveLight,
        ]}
        onPress={() => setNewUserIsAdmin((prev) => !prev)}
      >
        <Text
          style={[
            styles.toggleText,
            isLight && styles.toggleTextLight,
            newUserIsAdmin && isLight && styles.toggleTextLightActive,
          ]}
        >
          Sys Admin
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.togglePill,
          isLight && styles.togglePillLight,
          newUserIsTimeAdmin && styles.toggleActive,
          newUserIsTimeAdmin && isLight && styles.toggleActiveLight,
        ]}
        onPress={() => setNewUserIsTimeAdmin((prev) => !prev)}
      >
        <Text
          style={[
            styles.toggleText,
            isLight && styles.toggleTextLight,
            newUserIsTimeAdmin && isLight && styles.toggleTextLightActive,
          ]}
        >
          Time Admin
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.togglePill,
          isLight && styles.togglePillLight,
          newUserIsReports && styles.toggleActive,
          newUserIsReports && isLight && styles.toggleActiveLight,
        ]}
        onPress={() => setNewUserIsReports((prev) => !prev)}
      >
        <Text
          style={[
            styles.toggleText,
            isLight && styles.toggleTextLight,
            newUserIsReports && isLight && styles.toggleTextLightActive,
          ]}
        >
          Reports
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.togglePill,
          isLight && styles.togglePillLight,
          newUserIsKitchenManager && styles.toggleActive,
          newUserIsKitchenManager && isLight && styles.toggleActiveLight,
        ]}
        onPress={() => setNewUserIsKitchenManager((prev) => !prev)}
      >
        <Text
          style={[
            styles.toggleText,
            isLight && styles.toggleTextLight,
            newUserIsKitchenManager && isLight && styles.toggleTextLightActive,
          ]}
        >
          Kitchen Manager
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.togglePill,
          isLight && styles.togglePillLight,
          newUserIsServer && styles.toggleActive,
          newUserIsServer && isLight && styles.toggleActiveLight,
        ]}
        onPress={() => setNewUserIsServer((prev) => !prev)}
      >
        <Text
          style={[
            styles.toggleText,
            isLight && styles.toggleTextLight,
            newUserIsServer && isLight && styles.toggleTextLightActive,
          ]}
        >
          Server
        </Text>
      </TouchableOpacity>
    </View>
  );
}
