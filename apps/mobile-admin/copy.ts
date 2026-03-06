export type Lang = "en" | "es";

export const copy: Record<
  Lang,
  {
    subtitle: string;
    language: string;
    dark: string;
    light: string;
    logout: string;
    switchLocation: string;
    tenant: string;
    activeLocation: string;
    allLocations: string;
    noLocationAssigned: string;
    loginTitle: string;
    username: string;
    password: string;
    signIn: string;
    signingIn: string;
    forgetSavedAdmin: string;
    savedAdminDetected: string;
    biometricEnable: string;
    biometricDisable: string;
    biometricUnlockTitle: string;
    biometricUnlockBody: string;
    biometricUnlockButton: string;
    biometricUnlocking: string;
    biometricEnabledStatus: string;
    biometricDisabledStatus: string;
    biometricUnavailableStatus: string;
    biometricCanceledStatus: string;
    biometricFailedStatus: string;
    pushHelp: string;
    tenantPlaceholder: string;
    captureTitle: string;
    captureSubtitle: string;
    salesToggle: string;
    expenseToggle: string;
    salesTitle: string;
    expenseTitle: string;
    salesDate: string;
    foodSales: string;
    liquorSales: string;
    cashPayments: string;
    bankBatch: string;
    notesOptional: string;
    saveDailySales: string;
    saveDailyExpense: string;
    saving: string;
    expenseDate: string;
    invoiceNumber: string;
    companyName: string;
    paymentMethod: string;
    checkTotal: string;
    debitTotal: string;
    cashTotal: string;
    checkNumber: string;
    payToCompany: string;
    receiptPhoto: string;
    openingCamera: string;
    retakePhoto: string;
    takePhoto: string;
    removePhoto: string;
    attached: string;
    noPhoto: string;
  }
> = {
  en: {
    subtitle: "Native admin console",
    language: "Language",
    dark: "Dark",
    light: "Light",
    logout: "Logout",
    switchLocation: "Switch Location",
    tenant: "Tenant",
    activeLocation: "Location",
    allLocations: "All Locations",
    noLocationAssigned: "No location assigned",
    loginTitle: "Administrator Access",
    username: "Username",
    password: "Password",
    signIn: "Sign In",
    signingIn: "Signing In...",
    forgetSavedAdmin: "Forget Saved Admin",
    savedAdminDetected: "Saved admin detected on this device.",
    biometricEnable: "Enable Biometrics",
    biometricDisable: "Disable Biometrics",
    biometricUnlockTitle: "Unlock Admin Session",
    biometricUnlockBody:
      "Use device biometrics to reopen this admin session on Android or iPhone.",
    biometricUnlockButton: "Unlock with Biometrics",
    biometricUnlocking: "Waiting for biometric confirmation...",
    biometricEnabledStatus: "Biometric unlock enabled on this device.",
    biometricDisabledStatus: "Biometric unlock disabled on this device.",
    biometricUnavailableStatus:
      "Biometrics are not available or not enrolled on this device.",
    biometricCanceledStatus: "Biometric verification was canceled.",
    biometricFailedStatus: "Biometric verification failed. Try again.",
    pushHelp: "Push alerts are enabled once you sign in.",
    tenantPlaceholder: "tenant name",
    captureTitle: "Daily Data Capture",
    captureSubtitle: "Submit daily sales and daily expense entries.",
    salesToggle: "Daily Sales",
    expenseToggle: "Daily Expense",
    salesTitle: "Daily Sales Entry",
    expenseTitle: "Daily Expense Entry",
    salesDate: "Report Date (MM/DD/YYYY)",
    foodSales: "Food Sales",
    liquorSales: "Liquor Sales",
    cashPayments: "Daily cash",
    bankBatch: "Bank Deposit Batch",
    notesOptional: "Notes (optional)",
    saveDailySales: "Save Daily Sales",
    saveDailyExpense: "Save Daily Expense",
    saving: "Saving...",
    expenseDate: "Expense Date (MM/DD/YYYY)",
    invoiceNumber: "Invoice Number",
    companyName: "Company Name",
    paymentMethod: "Payment Method",
    checkTotal: "Check Total",
    debitTotal: "Debit Card Total",
    cashTotal: "Cash Total",
    checkNumber: "Check Number",
    payToCompany: "Company Check Is Going To",
    receiptPhoto: "Receipt Photo (optional)",
    openingCamera: "Opening camera...",
    retakePhoto: "Retake Receipt Photo",
    takePhoto: "Take Receipt Photo",
    removePhoto: "Remove Photo",
    attached: "Attached:",
    noPhoto: "No receipt photo attached.",
  },
  es: {
    subtitle: "Consola administrativa",
    language: "Idioma",
    dark: "Oscuro",
    light: "Claro",
    logout: "Salir",
    switchLocation: "Cambiar Ubicacion",
    tenant: "Inquilino",
    activeLocation: "Ubicacion",
    allLocations: "Todas las ubicaciones",
    noLocationAssigned: "Sin ubicacion asignada",
    loginTitle: "Acceso de Administrador",
    username: "Usuario",
    password: "Contraseña",
    signIn: "Ingresar",
    signingIn: "Ingresando...",
    forgetSavedAdmin: "Borrar Admin Guardado",
    savedAdminDetected: "Hay un admin guardado en este dispositivo.",
    biometricEnable: "Activar Biométricos",
    biometricDisable: "Desactivar Biométricos",
    biometricUnlockTitle: "Desbloquear Sesión Admin",
    biometricUnlockBody:
      "Usa los biométricos del dispositivo para reabrir esta sesión admin en Android o iPhone.",
    biometricUnlockButton: "Desbloquear con Biométricos",
    biometricUnlocking: "Esperando confirmación biométrica...",
    biometricEnabledStatus:
      "El desbloqueo biométrico quedó activado en este dispositivo.",
    biometricDisabledStatus:
      "El desbloqueo biométrico quedó desactivado en este dispositivo.",
    biometricUnavailableStatus:
      "Los biométricos no están disponibles o no están configurados en este dispositivo.",
    biometricCanceledStatus: "La verificación biométrica fue cancelada.",
    biometricFailedStatus:
      "La verificación biométrica falló. Intenta otra vez.",
    pushHelp: "Las alertas push se activan al iniciar sesión.",
    tenantPlaceholder: "tenant name",
    captureTitle: "Captura Diaria de Datos",
    captureSubtitle: "Registra las ventas y gastos diarios.",
    salesToggle: "Ventas Diarias",
    expenseToggle: "Gasto Diario",
    salesTitle: "Registro de Ventas Diarias",
    expenseTitle: "Registro de Gasto Diario",
    salesDate: "Fecha de reporte (MM/DD/YYYY)",
    foodSales: "Ventas de Comida",
    liquorSales: "Ventas de Licor",
    cashPayments: "Efectivo diario",
    bankBatch: "Lote de Depósito Bancario",
    notesOptional: "Notas (opcional)",
    saveDailySales: "Guardar Ventas Diarias",
    saveDailyExpense: "Guardar Gasto Diario",
    saving: "Guardando...",
    expenseDate: "Fecha del gasto (MM/DD/YYYY)",
    invoiceNumber: "Número de Factura",
    companyName: "Nombre de la Empresa",
    paymentMethod: "Método de Pago",
    checkTotal: "Total en Cheque",
    debitTotal: "Total Tarjeta Débito",
    cashTotal: "Total en Efectivo",
    checkNumber: "Número de Cheque",
    payToCompany: "Empresa a la que va el cheque",
    receiptPhoto: "Foto de recibo (opcional)",
    openingCamera: "Abriendo cámara...",
    retakePhoto: "Tomar Foto de Nuevo",
    takePhoto: "Tomar Foto de Recibo",
    removePhoto: "Quitar Foto",
    attached: "Adjunto:",
    noPhoto: "No hay foto de recibo adjunta.",
  },
};
