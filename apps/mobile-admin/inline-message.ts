import type { Lang } from "./copy";
export function localizeInlineMessage(language: Lang, message: string) {
  if (language !== "es") {
    return message;
  }
  const submitTipsMatch = /^Submit tips for (.+) before clocking in\.$/.exec(message);
  if (submitTipsMatch) {
    return `Envía propinas del ${submitTipsMatch[1]} antes de marcar entrada.`;
  }
  const pendingTipsMatch = /^Pending tips for (.+)\.$/.exec(message);
  if (pendingTipsMatch) {
    return `Propinas pendientes del ${pendingTipsMatch[1]}.`;
  }
  const bottleScanMatch =
    /^Bottle scan saved\. Fill ([0-9.]+)% • Spent ([0-9.]+) ml\.$/.exec(
      message,
    );
  if (bottleScanMatch) {
    return `Escaneo de botella guardado. Nivel ${bottleScanMatch[1]}% • Consumido ${bottleScanMatch[2]} ml.`;
  }
  const invoiceAnalyzeMatch =
    /^Invoice analyzed\. ([0-9]+) rows extracted\.$/.exec(message);
  if (invoiceAnalyzeMatch) {
    return `Factura analizada. ${invoiceAnalyzeMatch[1]} filas extraídas.`;
  }
  const liquorExportMatch = /^([A-Z]+) ready for liquor control (.+)\.$/.exec(
    message,
  );
  if (liquorExportMatch) {
    return `${liquorExportMatch[1]} listo para control de licor ${liquorExportMatch[2]}.`;
  }
  const aiCatalogMatch = /^AI found ([0-9]+) catalog matches\.$/.exec(message);
  if (aiCatalogMatch) {
    return `La IA encontró ${aiCatalogMatch[1]} coincidencias en el catálogo.`;
  }
  const map: Record<string, string> = {
    "Unable to access local storage for download.":
      "No se puede acceder al almacenamiento local para la descarga.",
    "Download ready": "Descarga lista",
    "Enter tenant, username, and password.":
      "Ingresa tenant, usuario y contraseña.",
    "Select an employee.": "Selecciona un empleado.",
    "Subject is required.": "El asunto es obligatorio.",
    "Message is required.": "El mensaje es obligatorio.",
    "Clock-in override rejected.": "Anulación de entrada rechazada.",
    "Clock-in override approved.": "Anulación de entrada aprobada.",
    "Enter a full name.": "Ingresa el nombre completo.",
    "User created.": "Usuario creado.",
    "User disabled.": "Usuario deshabilitado.",
    "User enabled.": "Usuario habilitado.",
    "Loaded user for editing.": "Usuario cargado para edición.",
    "Select a user to edit.": "Selecciona un usuario para editar.",
    "Full name is required.": "El nombre completo es obligatorio.",
    "PIN must be 4 digits.": "El PIN debe tener 4 dígitos.",
    "Hourly rate must be 0 or higher.":
      "La tarifa por hora debe ser 0 o mayor.",
    "User updated.": "Usuario actualizado.",
    "Enter a location name.": "Ingresa un nombre de ubicación.",
    "Enter valid numeric geofence values.":
      "Ingresa valores numéricos válidos para la geocerca.",
    "Latitude and longitude are required together.":
      "Latitud y longitud son requeridas en conjunto.",
    "Location created. Switched to new location panel.":
      "Ubicación creada. Se cambió al panel de la nueva ubicación.",
    "Select a location first.": "Selecciona una ubicación primero.",
    "Location geofence updated.": "Geocerca de ubicación actualizada.",
    "Enter a group name.": "Ingresa un nombre de grupo.",
    "Group created.": "Grupo creado.",
    "From and To dates are required.":
      "Las fechas Desde y Hasta son obligatorias.",
    "Use MM/DD/YYYY dates.": "Usa fechas MM/DD/YYYY.",
    "Report date is required in MM/DD/YYYY format.":
      "La fecha del reporte es obligatoria en formato MM/DD/YYYY.",
    "Daily sales report saved.": "Reporte de ventas diarias guardado.",
    "Receipt photo attached.": "Foto del recibo adjunta.",
    "Unable to resolve today date.": "No se pudo resolver la fecha de hoy.",
    "Company name is required.": "El nombre de la empresa es obligatorio.",
    "Invoice number is required.": "El número de factura es obligatorio.",
    "Expense amount must be a non-negative number.":
      "El monto del gasto debe ser un número no negativo.",
    "Check number is required for check expenses.":
      "El número de cheque es obligatorio para gastos en cheque.",
    "Pay-to company is required for check expenses.":
      "La empresa beneficiaria es obligatoria para gastos en cheque.",
    "Expense saved, but receipt upload could not start.":
      "Gasto guardado, pero la carga del recibo no pudo iniciar.",
    "Daily expense and receipt saved.": "Gasto diario y recibo guardados.",
    "Daily expense saved.": "Gasto diario guardado.",
    "Tips must be valid non-negative amounts.":
      "Las propinas deben ser montos válidos no negativos.",
    "You are clocked out.": "Has marcado salida.",
    "You are clocked in.": "Has marcado entrada.",
    "Unable to record your punch.": "No se pudo registrar tu marcación.",
    "Employee clocked out.": "Empleado con salida registrada.",
    "Employee clocked in.": "Empleado con entrada registrada.",
    "Unable to clock out employee.":
      "No se pudo registrar la salida del empleado.",
    "Manager reports access is required for liquor control.":
      "Se requiere acceso de reportes de manager para control de licor.",
    "UPC is required.": "El UPC es obligatorio.",
    "UPC matched an existing liquor catalog item.":
      "El UPC coincide con un artículo existente del catálogo de licor.",
    "UPC candidate loaded from lookup source.":
      "Candidato de UPC cargado desde la fuente de búsqueda.",
    "UPC lookup found no match.": "La búsqueda UPC no encontró coincidencias.",
    "Unable to lookup UPC.": "No se pudo buscar el UPC.",
    "Liquor name is required.": "El nombre del licor es obligatorio.",
    "Kind name is required.": "El nombre del tipo es obligatorio.",
    "Kind saved.": "Tipo guardado.",
    "Select a kind to delete.": "Selecciona un tipo para eliminar.",
    "Kind deleted.": "Tipo eliminado.",
    "Unable to save kind.": "No se pudo guardar el tipo.",
    "Unable to delete kind.": "No se pudo eliminar el tipo.",
    "Liquor catalog item created.": "Artículo del catálogo de licor creado.",
    "Unable to create liquor catalog item.":
      "No se pudo crear el artículo del catálogo de licor.",
    "Select an item for the movement.":
      "Selecciona un artículo para el movimiento.",
    "Select a location before creating a liquor movement.":
      "Selecciona una ubicación antes de crear un movimiento de licor.",
    "Movement quantity must be greater than zero.":
      "La cantidad del movimiento debe ser mayor que cero.",
    "Movement date/time is invalid.":
      "La fecha/hora del movimiento no es válida.",
    "Liquor movement saved.": "Movimiento de licor guardado.",
    "Unable to save liquor movement.":
      "No se pudo guardar el movimiento de licor.",
    "Select an item for the count.": "Selecciona un artículo para el conteo.",
    "Count quantity must be zero or greater.":
      "La cantidad del conteo debe ser cero o mayor.",
    "Liquor count saved.": "Conteo de licor guardado.",
    "Unable to save liquor count.": "No se pudo guardar el conteo de licor.",
    "Select a location before saving liquor inventory.":
      "Selecciona una ubicación antes de guardar el inventario de licor.",
    "Select a location before bottle scan.":
      "Selecciona una ubicación antes de escanear botella.",
    "Price must be zero or greater.": "El precio debe ser cero o mayor.",
    "Qty/ML must be greater than zero.": "Cant/ML debe ser mayor que cero.",
    "Liquor catalog row saved.": "Fila del catálogo de licor guardada.",
    "Unable to save liquor catalog row.":
      "No se pudo guardar la fila del catálogo de licor.",
    "Bar quantity must be zero or greater.":
      "La cantidad de bar debe ser cero o mayor.",
    "Bodega quantity must be zero or greater.":
      "La cantidad de bodega debe ser cero o mayor.",
    "Bodega bottle count must be zero or greater.":
      "La cantidad de botellas en bodega debe ser cero o mayor.",
    "Qty/ML is required before entering bodega bottles.":
      "Cant/ML es obligatorio antes de ingresar botellas de bodega.",
    "Count date must use YYYY-MM-DD format.":
      "La fecha de conteo debe usar formato YYYY-MM-DD.",
    "Liquor inventory row saved.": "Fila de inventario de licor guardada.",
    "Unable to save liquor inventory row.":
      "No se pudo guardar la fila de inventario de licor.",
    "Camera permission is required for bottle scan.":
      "Se requiere permiso de cámara para escanear botella.",
    "Unable to analyze bottle photo.":
      "No se pudo analizar la foto de la botella.",
    "Photo library permission is required for invoice OCR.":
      "Se requiere permiso de galería para OCR de factura.",
    "Select a location before invoice OCR.":
      "Selecciona una ubicación antes del OCR de factura.",
    "Select an invoice photo first.": "Selecciona primero una foto de factura.",
    "Analyze an invoice with at least one row before applying.":
      "Analiza una factura con al menos una fila antes de aplicar.",
    "Invoice rows applied.": "Filas de factura aplicadas.",
    "Unable to analyze invoice photo.":
      "No se pudo analizar la foto de la factura.",
    "Unable to apply invoice rows.":
      "No se pudieron aplicar las filas de factura.",
    "Unable to export liquor control.":
      "No se pudo exportar el control de licor.",
    "Premium liquor features are disabled for this tenant.":
      "Las funciones premium de licor están deshabilitadas para este tenant.",
    "No report data for selected period.":
      "No hay datos de reporte para el periodo seleccionado.",
    "No liquor items yet.": "No hay artículos de licor todavía.",
    "No matching liquor items.": "No hay artículos de licor que coincidan.",
    "Enter an AI catalog request first.":
      "Primero escribe una solicitud para la IA del catálogo.",
    "AI found no catalog matches.":
      "La IA no encontró coincidencias en el catálogo.",
    "Unable to run AI catalog assistant.":
      "No se pudo ejecutar el asistente IA del catálogo.",
    "AI assist is not configured on this server. Showing smart local matches.":
      "La asistencia IA no está configurada en este servidor. Mostrando coincidencias locales inteligentes.",
    "AI found no strong matches. Showing smart local matches instead.":
      "La IA no encontró coincidencias fuertes. Mostrando coincidencias locales inteligentes.",
    "AI catalog assistant is temporarily unavailable. Showing smart local matches.":
      "El asistente IA del catálogo no está disponible temporalmente. Mostrando coincidencias locales inteligentes.",
    "AI endpoint unavailable on this API. Using smart local catalog ranking.":
      "El endpoint IA no está disponible en esta API. Usando ranking local inteligente del catálogo.",
    "Smart local catalog ranking applied.":
      "Se aplicó ranking local inteligente del catálogo.",
    "No local catalog matches found.":
      "No se encontraron coincidencias locales del catálogo.",
    "Enter at least one item quantity.":
      "Ingresa al menos una cantidad de artículo.",
    "Unable to export company order.":
      "No se pudo exportar la orden de empresa.",
    "Select an employee first.": "Selecciona primero un empleado.",
    "Schedule saved.": "Horario guardado.",
    "Clock Out": "Marcar Salida",
    "Clock In": "Marcar Entrada",
    Servers: "Meseros",
    "Working...": "Procesando...",
    "Saving tips...": "Guardando propinas...",
    Approve: "Aprobar",
    Active: "Activo",
    Disabled: "Deshabilitado",
    Yes: "Sí",
    "Save Changes": "Guardar Cambios",
    Disable: "Deshabilitar",
    Enable: "Habilitar",
    "Saving...": "Guardando...",
    Current: "Actual",
    Switch: "Cambiar",
    "Generating...": "Generando...",
    "Sending...": "Enviando...",
    "Refreshing...": "Actualizando...",
    "Preparing...": "Preparando...",
    "Submitting...": "Enviando...",
    "Refresh Orders": "Actualizar Órdenes",
    "Refresh Liquor": "Actualizar Licor",
    "Inventory Sheet": "Hoja de Inventario",
    "Search Items": "Buscar artículos",
    Catalog: "Catálogo",
    "Kind Library": "Biblioteca de Tipos",
    "Pick a preset or type a new kind. You can also remove kinds you no longer use.":
      "Elige un tipo predefinido o escribe uno nuevo. También puedes eliminar tipos que ya no uses.",
    "New Kind": "Nuevo Tipo",
    "e.g. Tequila Reposado": "Ej. Tequila Reposado",
    "Add Kind": "Agregar Tipo",
    "Delete Kind": "Eliminar Tipo",
    "Type to find kind": "Escribe para buscar tipo",
    "No kinds configured.": "No hay tipos configurados.",
    "Kinds Available": "Tipos Disponibles",
    "Search Catalog": "Buscar catálogo",
    "Search by liquor, company, kind or UPC":
      "Busca por licor, empresa, tipo o UPC",
    "Select or type kind": "Selecciona o escribe tipo",
    "AI Catalog Assistant": "Asistente IA de Catálogo",
    "Describe bottle, company, size, budget...":
      "Describe botella, empresa, tamaño, presupuesto...",
    "Find with AI": "Buscar con IA",
    "Apply to Catalog Search": "Aplicar a Búsqueda Catálogo",
    "Jump to Inventory Sheet": "Ir a Hoja de Inventario",
    "AI Top Matches": "Mejores Coincidencias IA",
    "No AI matches yet.": "Aún no hay coincidencias IA.",
    "AI is enabled only for premium tenants.":
      "La IA está habilitada solo para tenants premium.",
    "Show More": "Mostrar más",
    Operations: "Operaciones",
    "Bottle Scan": "Escaneo Botella",
    "Invoice OCR": "OCR Facturas",
    Analytics: "Analítica",
    Activity: "Actividad",
    "Export Data": "Exportar",
    "All exports include summary, month comparison, item variance, movements, counts, and scans.":
      "Todas las exportaciones incluyen resumen, comparación mensual, variación por artículo, movimientos, conteos y escaneos.",
    "Month-over-Month Comparison": "Comparación Mes a Mes",
    "Current Month": "Mes actual",
    "Previous Month": "Mes anterior",
    "Current Usage ML": "Consumo actual ML",
    "Previous Usage ML": "Consumo anterior ML",
    "Delta Usage ML": "Delta consumo ML",
    "Current Usage Cost": "Costo de consumo actual",
    "Previous Usage Cost": "Costo de consumo anterior",
    "Delta Usage Cost": "Delta costo de consumo",
    "Largest Bottle Spend Changes": "Mayores cambios de gasto por botella",
    "No month comparison data available.":
      "No hay datos de comparación mensual disponibles.",
    "Lookup UPC": "Buscar UPC",
    "Add Catalog Item": "Agregar Artículo",
    "Movements & Counts": "Movimientos y Conteos",
    "Post Movement": "Registrar Movimiento",
    "Quick Count": "Conteo Rápido",
    "AI Bottle Scan": "Escaneo AI de Botella",
    "Save Item": "Guardar Artículo",
    "Save Count": "Guardar Conteo",
    "Bodega Bottles": "Botellas Bodega",
    "Bodega ML": "ML Bodega",
    "Scan Bottle": "Escanear Botella",
    "Invoice OCR + Cost Shock": "OCR de Facturas + Choque de Costos",
    "Invoice Date": "Fecha Factura",
    "Invoice #": "Factura #",
    Supplier: "Proveedor",
    Notes: "Notas",
    "Create purchase movements": "Crear movimientos de compra",
    "Invoice Photo": "Foto de Factura",
    "Analyze Invoice": "Analizar Factura",
    "Apply Invoice Rows": "Aplicar Filas",
    "No invoice rows extracted yet.": "Aún no hay filas de factura extraídas.",
    Match: "Coincidencia",
    Severity: "Severidad",
  };
  return map[message] || message;
}
