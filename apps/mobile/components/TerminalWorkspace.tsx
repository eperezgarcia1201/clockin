import { type ComponentProps } from "react";
import { View, Text } from "react-native";
import { styles } from "../App.styles";
import type { Language } from "../i18n";
import { i18n } from "../i18n";
import type { EmployeeViewTab, TenantOffice } from "../types";
import { ClockStationCard } from "./ClockStationCard";
import { CompanyOrdersCard } from "./CompanyOrdersCard";
import { LastPunchCard } from "./LastPunchCard";
import { LiquorControlCard } from "./LiquorControlCard";
import { LocationPickerPanel } from "./LocationPickerPanel";
import { TenantTopBar } from "./TenantTopBar";
import { TodayTeamCard } from "./TodayTeamCard";
import { ViewTabSelector } from "./ViewTabSelector";
import { WeekScheduleCard } from "./WeekScheduleCard";
import { WorkingNowCard } from "./WorkingNowCard";

type TerminalWorkspaceProps = {
  t: (typeof i18n)[keyof typeof i18n];
  language: Language;
  onToggleLanguage: () => void;
  onLogoutTenant: () => void;
  tenantName: string;
  tenantOffices: TenantOffice[];
  selectedOffice: TenantOffice | null;
  selectedOfficeId: string | null;
  locationPickerOpen: boolean;
  onToggleLocationPicker: () => void;
  onSelectOffice: (officeId: string) => void;
  locationStatus: string | null;
  hasCompanyOrdersAccess: boolean;
  hasWeekScheduleAccess: boolean;
  activeViewTab: EmployeeViewTab;
  onViewTabChange: (tab: EmployeeViewTab) => void;
  clockStationProps: ComponentProps<typeof ClockStationCard>;
  weekScheduleProps: ComponentProps<typeof WeekScheduleCard>;
  companyOrdersProps: ComponentProps<typeof CompanyOrdersCard>;
  liquorControlProps: ComponentProps<typeof LiquorControlCard>;
  workingNowProps: ComponentProps<typeof WorkingNowCard>;
  todayTeamProps: ComponentProps<typeof TodayTeamCard>;
  lastPunchProps: ComponentProps<typeof LastPunchCard> | null;
};

export function TerminalWorkspace({
  t,
  language,
  onToggleLanguage,
  onLogoutTenant,
  tenantName,
  tenantOffices,
  selectedOffice,
  selectedOfficeId,
  locationPickerOpen,
  onToggleLocationPicker,
  onSelectOffice,
  locationStatus,
  hasCompanyOrdersAccess,
  hasWeekScheduleAccess,
  activeViewTab,
  onViewTabChange,
  clockStationProps,
  weekScheduleProps,
  companyOrdersProps,
  liquorControlProps,
  workingNowProps,
  todayTeamProps,
  lastPunchProps,
}: TerminalWorkspaceProps) {
  const showViewTabs = hasCompanyOrdersAccess || hasWeekScheduleAccess;
  const visibleViewTab =
    activeViewTab === "companyOrders" && !hasCompanyOrdersAccess
      ? "clock"
      : activeViewTab === "weekSchedule" && !hasWeekScheduleAccess
        ? "clock"
        : activeViewTab;

  return (
    <>
      <TenantTopBar
        tenantLabel={t.tenant}
        tenantName={tenantName}
        locationLabel={t.location}
        locationName={selectedOffice?.name}
        showLocationMeta={Boolean(selectedOffice)}
        showLocationToggle={tenantOffices.length > 1}
        locationToggleLabel={locationPickerOpen ? t.hideLocations : t.changeLocation}
        onLocationToggle={onToggleLocationPicker}
        languageLabel={t.language}
        language={language}
        onToggleLanguage={onToggleLanguage}
        logoutTenantLabel={t.logoutTenant}
        onLogoutTenant={onLogoutTenant}
      />

      {tenantOffices.length > 1 && locationPickerOpen ? (
        <LocationPickerPanel
          tenantOffices={tenantOffices}
          selectedOfficeId={selectedOfficeId}
          onSelectOffice={onSelectOffice}
          locationStatus={locationStatus}
        />
      ) : null}
      {locationStatus && !locationPickerOpen ? (
        <Text style={[styles.statusText, styles.locationStatus]}>{locationStatus}</Text>
      ) : null}

      {showViewTabs ? (
        <ViewTabSelector
          t={t}
          activeViewTab={visibleViewTab}
          showWeekScheduleTab={hasWeekScheduleAccess}
          showCompanyOrdersTab={hasCompanyOrdersAccess}
          onViewTabChange={onViewTabChange}
        />
      ) : null}

      {visibleViewTab === "clock" ? (
        <ClockStationCard {...clockStationProps} />
      ) : visibleViewTab === "weekSchedule" ? (
        <WeekScheduleCard {...weekScheduleProps} />
      ) : (
        <View>
          <CompanyOrdersCard {...companyOrdersProps} />
          <View
            style={{
              marginVertical: 14,
              borderTopWidth: 1,
              borderTopColor: "rgba(24, 44, 86, 0.12)",
              paddingTop: 14,
            }}
          />
          <LiquorControlCard {...liquorControlProps} />
        </View>
      )}

      {visibleViewTab === "clock" ? <WorkingNowCard {...workingNowProps} /> : null}
      {visibleViewTab === "clock" ? <TodayTeamCard {...todayTeamProps} /> : null}
      {visibleViewTab === "clock" && lastPunchProps ? (
        <LastPunchCard {...lastPunchProps} />
      ) : null}
      <Text style={styles.footer}>{t.poweredBy}</Text>
    </>
  );
}
