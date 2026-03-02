import { View } from "react-native";
import { styles } from "../App.styles";
import { UsersCreateSection } from "./UsersCreateSection";
import { UsersEditSection } from "./UsersEditSection";
import { UsersListSection } from "./UsersListSection";

type UsersScreenProps = {
  [key: string]: any;
};

export function UsersScreen(props: UsersScreenProps) {
  return (
    <View style={[styles.card, props.isLight && styles.cardLight]}>
      <UsersCreateSection
        isLight={props.isLight}
        language={props.language}
        employees={props.employees}
        onRefreshUsers={() => {
          props.loadEmployees();
          props.loadActiveNow();
          props.loadSummary();
        }}
        inline={props.inline}
        dataSyncError={props.dataSyncError}
        newUserName={props.newUserName}
        onNewUserNameChange={props.setNewUserName}
        newUserEmail={props.newUserEmail}
        onNewUserEmailChange={props.setNewUserEmail}
        newUserPin={props.newUserPin}
        onNewUserPinChange={props.setNewUserPin}
        newUserIsManager={props.newUserIsManager}
        setNewUserIsManager={props.setNewUserIsManager}
        newUserIsOwnerManager={props.newUserIsOwnerManager}
        setNewUserIsOwnerManager={props.setNewUserIsOwnerManager}
        newUserIsAdmin={props.newUserIsAdmin}
        setNewUserIsAdmin={props.setNewUserIsAdmin}
        newUserIsTimeAdmin={props.newUserIsTimeAdmin}
        setNewUserIsTimeAdmin={props.setNewUserIsTimeAdmin}
        newUserIsReports={props.newUserIsReports}
        setNewUserIsReports={props.setNewUserIsReports}
        newUserIsKitchenManager={props.newUserIsKitchenManager}
        setNewUserIsKitchenManager={props.setNewUserIsKitchenManager}
        newUserIsServer={props.newUserIsServer}
        setNewUserIsServer={props.setNewUserIsServer}
        userStatus={props.userStatus}
        inlineOrNull={props.inlineOrNull}
        onCreateUser={props.handleCreateUser}
      />
      <UsersEditSection
        isLight={props.isLight}
        editUserLoading={props.editUserLoading}
        editingUserId={props.editingUserId}
        editUserForm={props.editUserForm}
        setEditUserForm={props.setEditUserForm}
        offices={props.offices}
        groups={props.groups}
        inline={props.inline}
        editUserStatus={props.editUserStatus}
        inlineOrNull={props.inlineOrNull}
        cancelEditUser={props.cancelEditUser}
        editUserSaving={props.editUserSaving}
        saveUserEdits={props.saveUserEdits}
      />

      <UsersListSection
        isLight={props.isLight}
        language={props.language}
        employees={props.employees}
        employeePunchStatus={props.employeePunchStatus}
        inline={props.inline}
        onLoadUserForEdit={props.loadUserForEdit}
        onSetUserDisabled={props.handleSetUserDisabled}
        punchLoadingId={props.punchLoadingId}
        onForcePunchOut={(employeeId) =>
          props.handleForcePunch(employeeId, "OUT")
        }
      />
    </View>
  );
}
