import { DashboardCard } from "./DashboardCard";
import { GroupsScreen } from "./GroupsScreen";
import { LoginCard } from "./LoginCard";
import { OfficesScreen } from "./OfficesScreen";
import { UsersScreen } from "./UsersScreen";

type AdminContentRouterProps = {
  [key: string]: any;
};

export function renderAdminCoreContent(props: AdminContentRouterProps) {
  if (!props.loggedIn) {
    return (
      <LoginCard
        isLight={props.isLight}
        text={props.text}
        tenantInput={props.tenantInput}
        onTenantInputChange={props.setTenantInput}
        username={props.username}
        onUsernameChange={props.setUsername}
        password={props.password}
        onPasswordChange={props.setPassword}
        loginStatus={props.loginStatus}
        inlineOrNull={props.inlineOrNull}
        onLogin={props.handleLogin}
        onForgetSavedAdmin={props.forgetSavedAdmin}
        loginLoading={props.loginLoading}
        dataSyncError={props.dataSyncError}
      />
    );
  }

  if (props.screen === "dashboard") {
    return (
      <DashboardCard
        isLight={props.isLight}
        summary={props.summary}
        dataSyncError={props.dataSyncError}
        sessionManagerEmployeeId={props.sessionManagerEmployeeId}
        managerDisplayName={
          props.managerProfile?.name || props.activeAdminUsername || "Manager"
        }
        managerClockExempt={props.managerClockExempt}
        language={props.language}
        managerCurrentPunchStatus={props.managerCurrentPunchStatus}
        managerPin={props.managerPin}
        onManagerPinChange={props.setManagerPin}
        managerCanClockOut={props.managerCanClockOut}
        managerPunchLoading={props.managerPunchLoading}
        onManagerSelfPunch={props.handleManagerSelfPunch}
        inline={props.inline}
        managerActionLabel={props.managerActionLabel}
        managerPendingTipWorkDate={props.managerPendingTipWorkDate}
        managerCashTips={props.managerCashTips}
        onManagerCashTipsChange={props.setManagerCashTips}
        managerCreditCardTips={props.managerCreditCardTips}
        onManagerCreditCardTipsChange={props.setManagerCreditCardTips}
        managerTipSaving={props.managerTipSaving}
        onSubmitManagerPendingTips={props.handleSubmitManagerPendingTips}
        managerPunchStatus={props.managerPunchStatus}
        inlineOrNull={props.inlineOrNull}
        activeNow={props.activeNow}
        punchLoadingId={props.punchLoadingId}
        onForcePunch={props.handleForcePunch}
        pendingScheduleOverrides={props.pendingScheduleOverrides}
        scheduleOverrideLoadingId={props.scheduleOverrideLoadingId}
        onScheduleOverrideDecision={props.handleScheduleOverrideDecision}
        formatDisplayDate={props.formatDisplayDate}
        punchStatus={props.punchStatus}
      />
    );
  }

  if (props.screen === "users") {
    return (
      <UsersScreen
        isLight={props.isLight}
        language={props.language}
        employees={props.employees}
        loadEmployees={props.loadEmployees}
        loadActiveNow={props.loadActiveNow}
        loadSummary={props.loadSummary}
        inline={props.inline}
        dataSyncError={props.dataSyncError}
        newUserName={props.newUserName}
        setNewUserName={props.setNewUserName}
        newUserEmail={props.newUserEmail}
        setNewUserEmail={props.setNewUserEmail}
        newUserPin={props.newUserPin}
        setNewUserPin={props.setNewUserPin}
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
        handleCreateUser={props.handleCreateUser}
        editUserLoading={props.editUserLoading}
        editingUserId={props.editingUserId}
        editUserForm={props.editUserForm}
        setEditUserForm={props.setEditUserForm}
        offices={props.offices}
        groups={props.groups}
        editUserStatus={props.editUserStatus}
        cancelEditUser={props.cancelEditUser}
        editUserSaving={props.editUserSaving}
        saveUserEdits={props.saveUserEdits}
        employeePunchStatus={props.employeePunchStatus}
        loadUserForEdit={props.loadUserForEdit}
        handleSetUserDisabled={props.handleSetUserDisabled}
        punchLoadingId={props.punchLoadingId}
        handleForcePunch={props.handleForcePunch}
      />
    );
  }

  if (props.screen === "offices") {
    return (
      <OfficesScreen
        isLight={props.isLight}
        text={props.text}
        activeLocationLabel={props.activeLocationLabel}
        canManageMultiLocation={props.canManageMultiLocation}
        scopedLocationId={props.scopedLocationId}
        offices={props.offices}
        setActiveLocationId={props.setActiveLocationId}
        canCreateLocations={props.canCreateLocations}
        newOfficeName={props.newOfficeName}
        setNewOfficeName={props.setNewOfficeName}
        newOfficeLatitude={props.newOfficeLatitude}
        setNewOfficeLatitude={props.setNewOfficeLatitude}
        newOfficeLongitude={props.newOfficeLongitude}
        setNewOfficeLongitude={props.setNewOfficeLongitude}
        newOfficeRadius={props.newOfficeRadius}
        setNewOfficeRadius={props.setNewOfficeRadius}
        handleCreateOffice={props.handleCreateOffice}
        officeStatus={props.officeStatus}
        inlineOrNull={props.inlineOrNull}
        officeGeoTarget={props.officeGeoTarget}
        officeGeoLatitude={props.officeGeoLatitude}
        setOfficeGeoLatitude={props.setOfficeGeoLatitude}
        officeGeoLongitude={props.officeGeoLongitude}
        setOfficeGeoLongitude={props.setOfficeGeoLongitude}
        officeGeoRadius={props.officeGeoRadius}
        setOfficeGeoRadius={props.setOfficeGeoRadius}
        officeGeoSaving={props.officeGeoSaving}
        handleSaveOfficeGeofence={props.handleSaveOfficeGeofence}
        inline={props.inline}
        language={props.language}
        officeGeoStatus={props.officeGeoStatus}
        setScreen={props.setScreen}
      />
    );
  }

  if (props.screen === "groups") {
    return (
      <GroupsScreen
        isLight={props.isLight}
        newGroupName={props.newGroupName}
        setNewGroupName={props.setNewGroupName}
        groupStatus={props.groupStatus}
        inlineOrNull={props.inlineOrNull}
        handleCreateGroup={props.handleCreateGroup}
        groups={props.groups}
      />
    );
  }

  return null;
}
