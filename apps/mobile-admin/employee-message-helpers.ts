export const validateEmployeeMessageDraft = ({
  employeeId,
  subject,
  message,
}: {
  employeeId: string;
  subject: string;
  message: string;
}): string | null => {
  if (!employeeId.trim()) {
    return "Select an employee.";
  }
  if (!subject.trim()) {
    return "Subject is required.";
  }
  if (!message.trim()) {
    return "Message is required.";
  }
  return null;
};

export const buildEmployeeMessagePayload = ({
  employeeId,
  subject,
  message,
}: {
  employeeId: string;
  subject: string;
  message: string;
}): {
  employeeId: string;
  subject: string;
  message: string;
} => ({
  employeeId: employeeId.trim(),
  subject: subject.trim(),
  message: message.trim(),
});
