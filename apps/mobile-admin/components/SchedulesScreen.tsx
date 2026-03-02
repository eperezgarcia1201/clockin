import { SchedulesCard } from "./SchedulesCard";

type SchedulesScreenProps = {
  [key: string]: any;
};

export function SchedulesScreen(props: SchedulesScreenProps) {
  return (
    <SchedulesCard
      isLight={props.isLight}
      language={props.language}
      selectedScheduleEmployee={props.selectedScheduleEmployee}
      todayScheduleLabel={props.todayScheduleLabel}
      todayScheduleLoading={props.todayScheduleLoading}
      onRefreshTodaySchedule={() => {
        void props.loadTodaySchedule();
      }}
      inline={props.inline}
      todayScheduleStatus={props.todayScheduleStatus}
      inlineOrNull={props.inlineOrNull}
      todayRoleTabs={props.todayRoleTabs}
      activeTodayRoleFilter={props.activeTodayRoleFilter}
      onTodayRoleFilterChange={props.setTodayRoleFilter}
      filteredTodayScheduleRows={props.filteredTodayScheduleRows}
      scheduleEmployeePickerOpen={props.scheduleEmployeePickerOpen}
      onToggleScheduleEmployeePicker={() =>
        props.setScheduleEmployeePickerOpen((previous: boolean) => !previous)
      }
      employees={props.employees}
      scheduleEmployeeSearch={props.scheduleEmployeeSearch}
      onScheduleEmployeeSearchChange={props.setScheduleEmployeeSearch}
      filteredScheduleEmployees={props.filteredScheduleEmployees}
      scheduleEmployeeId={props.scheduleEmployeeId}
      onSelectScheduleEmployee={(employeeId) => {
        props.setScheduleEmployeeId(employeeId);
        props.setScheduleEmployeePickerOpen(false);
        props.setScheduleEmployeeSearch("");
      }}
      scheduleDays={props.scheduleDays}
      onUpdateScheduleDay={props.updateScheduleDay}
      onAdjustScheduleTime={props.adjustScheduleTime}
      onSetScheduleMeridiem={props.setScheduleMeridiem}
      scheduleStatus={props.scheduleStatus}
      onSaveSchedule={props.saveSchedule}
    />
  );
}
