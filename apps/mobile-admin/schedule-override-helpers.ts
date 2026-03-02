export const getScheduleOverrideStatusMessage = ({
  approve,
  autoClockIn,
}: {
  approve: boolean;
  autoClockIn?: { clockedIn?: boolean; alreadyActive?: boolean };
}): string => {
  if (!approve) {
    return "Clock-in override rejected.";
  }
  if (autoClockIn?.clockedIn) {
    return "Clock-in override approved. Employee clocked in automatically.";
  }
  if (autoClockIn?.alreadyActive) {
    return "Clock-in override approved. Employee is already clocked in.";
  }
  return "Clock-in override approved.";
};
