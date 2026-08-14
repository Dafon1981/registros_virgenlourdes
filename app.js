const cfg = window.TURNOS_CONFIG || {};
const sb = window.supabase?.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
const $ = selector => document.querySelector(selector);
const state = { registers: [], schedule: [], report: [], monthlySchedule: [], reminders: [], calendarDate: null, professionalSearch: [], patients: [], patientDetail: null, sites: [], operationalReport: [], activeRegisterShift: "I", documents: { patients: [], selectedIds: new Set(), templates: [], signatures: [], letterheadUrl: "", previewPatient: null } };

const limaDate = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date());
const fmtDate = date => new Intl.DateTimeFormat("es-PE", { dateStyle: "full", timeZone: "America/Lima" }).format(new Date(`${date}T12:00:00`));
const fmtTime = value => value ? new Intl.DateTimeFormat("es-PE", { hour: "2-digit", minute: "2-digit", timeZone: "America/Lima" }).format(new Date(value)) : "—";
const fmtTimeInput = value => value ? new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "America/Lima" }).format(new Date(value)) : "05:30";
const setMessage = (id, text, error = false) => { const el = $(id); el.textContent = text; el.className = `message ${error ? "error" : "ok"}`; };
const sequenceForDate = date => { const d = new Date(`${date}T12:00:00`).getDay(); return [1, 3, 5].includes(d) ? "LMV" : [2, 4, 6].includes(d) ? "MJS" : "—"; };
const shiftHours = { I: "05:30–09:30", II: "09:30–14:00", III: "Tercer turno" };
const registerShifts = ["I", "II", "III"];
const clinicalCompare = (a, b) => String(a.fecha_operativa || "").localeCompare(String(b.fecha_operativa || ""))
  || String(a.secuencia || "").localeCompare(String(b.secuencia || ""))
  || registerShifts.indexOf(a.turno) - registerShifts.indexOf(b.turno)
  || Number(a.orden_clinico || 32767) - Number(b.orden_clinico || 32767)
  || new Date(a.registrado_en || 0) - new Date(b.registrado_en || 0);
const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
const validTime = value => /^([01]\d|2[0-3]):[0-5]\d$/.test(value || "");
const numberOrNull = value => String(value ?? "").trim() === "" ? null : Number(value);
const dateInput = value => value ? String(value).slice(0, 10) : "";
window.TurnosApp = { sb, $, state, escapeHtml, setMessage, limaDate, numberOrNull };

function activeTab(id) {
  document.querySelectorAll(".tab").forEach(button => button.classList.toggle("active", button.dataset.tab === id));
  document.querySelectorAll(".tab-panel").forEach(panel => panel.classList.toggle("active", panel.id === id));
}

function parsePatientLine(value) {
  const clean = value.trim().replace(/\s+/g, " ");
  const onlyDni = clean.match(/^(\d{1,8})(?:\s+(III|II|I))?$/i);
  if (onlyDni) return { nombre: "", dni: onlyDni[1].padStart(8, "0"), turno: onlyDni[2]?.toUpperCase() || null };
  const withDni = clean.match(/^(.*?)\s+(\d{1,8})(?:\s+(III|II|I))?$/i);
  if (withDni) return { nombre: withDni[1].trim(), dni: withDni[2].padStart(8, "0"), turno: withDni[3]?.toUpperCase() || null };
  const nameWithShift = clean.match(/^(.*?)(?:\s+(III|II|I))?$/i);
  if (!nameWithShift || nameWithShift[1].trim().length < 5) throw new Error("Ingresa DNI, nombre completo, o nombre + DNI. Si el paciente es nuevo, debes incluir nombre y DNI.");
  return { nombre: nameWithShift[1].trim(), dni: "", turno: nameWithShift[2]?.toUpperCase() || null };
}

function registerRow(row, index) {
  return `<tr class="${row.estado === "retirado" ? "row-out" : ""}" data-register-id="${row.id}" title="Doble clic para marcar retiro">
    <td><strong>${index + 1}</strong></td>
    <td>${fmtTime(row.registrado_en)}</td>
    <td><strong>${escapeHtml(row.nombre_completo)}</strong></td>
    <td>${escapeHtml(row.dni)}</td>
    <td><span class="sequence-chip">${row.secuencia || "—"}</span></td>
    <td><span class="status ${row.estado}"><i class="dot"></i>${row.estado === "retirado" ? "Retirado" : "En sala"}</span></td>
    <td><button type="button" class="table-action" data-edit-patient="${row.id}">Ajustar hora</button></td>
  </tr>`;
}

function attachRetirementEvents() {
  document.querySelectorAll("[data-register-id]").forEach(row => row.addEventListener("dblclick", async () => {
    const id = Number(row.dataset.registerId);
    const register = state.registers.find(item => item.id === id);
    if (!register || register.estado === "retirado") return;
    if (!confirm(`¿Marcar como retirado a ${register.nombre_completo}?`)) return;
    const { error } = await sb.rpc("clinic_marcar_retiro_paciente", { p_registro_id: id });
    if (error) return setMessage("#registerMessage", error.message, true);
    await loadRegisters();
  }));
  document.querySelectorAll("[data-edit-patient]").forEach(button => button.addEventListener("click", async event => {
    event.stopPropagation();
    const id = Number(button.dataset.editPatient);
    const register = state.registers.find(item => item.id === id);
    if (!register) return;
    const hora = prompt(`Hora de asistencia para ${register.nombre_completo} (formato 24 h HH:MM):`, fmtTimeInput(register.registrado_en));
    if (hora === null) return;
    if (!validTime(hora)) return setMessage("#registerMessage", "Usa una hora válida en formato HH:MM.", true);
    const motivo = prompt("Motivo del ajuste de hora (mínimo 3 caracteres):");
    if (motivo === null) return;
    if (motivo.trim().length < 3) return setMessage("#registerMessage", "Indica un motivo de al menos 3 caracteres para conservar la trazabilidad.", true);
    button.disabled = true;
    const { error } = await sb.rpc("clinic_ajustar_hora_registro_paciente", { p_registro_id: id, p_hora_local: hora, p_motivo: motivo.trim() });
    if (error) setMessage("#registerMessage", error.message, true);
    else setMessage("#registerMessage", `Hora de ${register.nombre_completo} actualizada con motivo registrado.`);
    await loadRegisters();
  }));
}

function renderShift(shift) {
  const rows = state.registers.filter(row => row.turno === shift);
  const body = $(`#registerBody${shift}`);
  $(`#registerCount${shift}`).textContent = `${rows.length} paciente${rows.length === 1 ? "" : "s"}`;
  body.innerHTML = rows.length ? rows.map(registerRow).join("") : `<tr><td colspan="7" class="empty">Sin pacientes registrados en turno ${shift}.</td></tr>`;
}

function renderRegisters() {
  renderShift("I");
  renderShift("II");
  renderShift("III");
  renderRegisterShiftView();
  $("#registerCount").textContent = `${state.registers.length} paciente${state.registers.length === 1 ? "" : "s"} registrados`;
  attachRetirementEvents();
}

function renderRegisterShiftView() {
  const active = state.activeRegisterShift;
  registerShifts.forEach(shift => { $(`#registerShiftView${shift}`).hidden = active !== shift; });
  $("#activeRegisterShiftLabel").textContent = `Turno ${active} · ${shiftHours[active]}`;
  const index = registerShifts.indexOf(active);
  $("#previousRegisterShift").disabled = index <= 0;
  $("#nextRegisterShift").disabled = index >= registerShifts.length - 1;
}

function changeRegisterShift(direction) {
  const currentIndex = Math.max(0, registerShifts.indexOf(state.activeRegisterShift));
  const next = registerShifts[Math.max(0, Math.min(registerShifts.length - 1, currentIndex + (direction === "next" ? 1 : -1)))];
  state.activeRegisterShift = next;
  renderRegisterShiftView();
  document.querySelector(`#registerShiftView${next}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function loadRegisters() {
  const { data, error } = await sb.rpc("clinic_listar_registros_hoy_ordenado");
  if (error) return setMessage("#registerMessage", error.message, true);
  state.registers = [...(data || [])].sort(clinicalCompare);
  renderRegisters();
}

async function submitPatient(event) {
  event.preventDefault();
  try {
    const parsed = parsePatientLine($("#patientLine").value);
    const fallbackTurn = $("#fallbackTurn").value;
    const { data, error } = await sb.rpc("clinic_registrar_asistencia_paciente", {
      p_nombre: parsed.nombre,
      p_dni: parsed.dni,
      p_turno_si_no_programado: parsed.turno || fallbackTurn || null,
    });
    if (error) return setMessage("#registerMessage", error.message, true);
    try { await navigator.clipboard.writeText(data.dni); } catch { /* El registro continúa aunque el navegador no habilite el portapapeles. */ }
    const profileText = data.paciente_existente ? "Perfil existente: solo se registró su asistencia." : "Paciente nuevo creado y asistencia registrada.";
    const previousText = data.registro_previo ? " Ya tenía un ingreso hoy; se conservó la hora original." : "";
    setMessage("#registerMessage", `${data.nombre_completo} · Turno ${data.turno} · Secuencia ${data.secuencia}. ${profileText}${previousText} DNI ${data.dni} copiado al portapapeles.`);
    state.activeRegisterShift = data.turno;
    $("#patientForm").reset();
    $("#patientLine").focus();
    await loadRegisters();
  } catch (error) { setMessage("#registerMessage", error.message, true); }
}

async function shareShift(shift) {
  const rows = state.registers.filter(row => row.turno === shift);
  if (!rows.length) return alert(`No hay pacientes registrados en el turno ${shift}.`);
  if (!confirm("La lista incluye nombres y DNI. Confirma que tienes autorización para compartir estos datos.")) return;
  const sequence = sequenceForDate(limaDate());
  const text = [`Centro de Diálisis Virgen del Lourdes`, `Lista de asistencia · ${fmtDate(limaDate())}`, `Turno ${shift} · Horario ${shiftHours[shift]} · Secuencia ${sequence}`, "", ...rows.map((row, index) => `${index + 1}. ${row.nombre_completo} · DNI ${row.dni} · ${fmtTime(row.registrado_en)} · ${row.estado === "retirado" ? "RETIRADO" : "PRESENTE"}`)].join("\n");
  try {
    if (navigator.share) await navigator.share({ title: `Lista turno ${shift}`, text });
    else { await navigator.clipboard.writeText(text); alert("Lista copiada al portapapeles para compartir."); }
  } catch (error) { if (error.name !== "AbortError") alert("No se pudo abrir la opción de compartir."); }
}

function renderSchedule() {
  const rows = state.schedule;
  $("#scheduleBody").innerHTML = rows.length ? rows.map(row => `<tr><td><input class="check" data-program="${row.programacion_id}" type="checkbox" ${row.asistencia_estado === "presente" ? "checked" : ""} aria-label="Marcar asistencia de ${escapeHtml(row.nombre_completo)}" /></td><td><strong>${escapeHtml(row.nombre_completo)}</strong><br><span class="muted">${escapeHtml(row.numero_documento)}</span></td><td>${escapeHtml(row.cargo)}</td><td><strong>${escapeHtml(row.horario)}</strong>${row.modulo ? `<br><span class="muted">${escapeHtml(row.modulo)}</span>` : ""}</td><td>${row.asistencia_estado === "pendiente" ? '<span class="muted">Pendiente</span>' : `<span class="status ${row.asistencia_estado === "presente" ? "active" : "retirado"}"><i class="dot"></i>${row.asistencia_estado === "presente" ? "Presente" : "Ausente"}</span><br><span class="muted">${fmtTime(row.asistencia_marcada_en)}</span>`}</td><td><button type="button" class="table-action" data-edit-professional="${row.programacion_id}">Ajustar hora</button></td></tr>`).join("") : `<tr><td colspan="6" class="empty">No hay turnos programados para esta fecha.</td></tr>`;
  document.querySelectorAll("[data-program]").forEach(check => check.addEventListener("change", async () => { check.disabled = true; const { error } = await sb.rpc("clinic_marcar_asistencia_profesional", { p_programacion_id: Number(check.dataset.program), p_presente: check.checked }); if (error) { alert(error.message); check.checked = !check.checked; } await loadSchedule(); }));
  document.querySelectorAll("[data-edit-professional]").forEach(button => button.addEventListener("click", async () => {
    const programacionId = Number(button.dataset.editProfessional), row = state.schedule.find(item => item.programacion_id === programacionId);
    if (!row) return;
    const hora = prompt(`Hora de asistencia para ${row.nombre_completo} (formato 24 h HH:MM):`, fmtTimeInput(row.asistencia_marcada_en));
    if (hora === null) return;
    if (!validTime(hora)) return alert("Usa una hora válida en formato HH:MM.");
    const motivo = prompt("Motivo del ajuste de hora (mínimo 3 caracteres):");
    if (motivo === null) return;
    if (motivo.trim().length < 3) return alert("Indica un motivo de al menos 3 caracteres para conservar la trazabilidad.");
    button.disabled = true;
    const { error } = await sb.rpc("clinic_ajustar_hora_asistencia_profesional", { p_programacion_id: programacionId, p_hora_local: hora, p_motivo: motivo.trim() });
    if (error) alert(error.message);
    await loadSchedule();
  }));
}

function setReminderProfessionals() {
  const select = $("#reminderProfessional"), selected = select.value;
  const people = [...new Map(state.schedule.map(row => [row.profesional_id, row])).values()];
  select.innerHTML = `<option value="">Selecciona un profesional del turno</option>${people.map(person => `<option value="${person.profesional_id}">${escapeHtml(person.nombre_completo)} · ${escapeHtml(person.cargo)}</option>`).join("")}`;
  if (people.some(person => String(person.profesional_id) === selected)) select.value = selected;
}

function renderReminders() {
  const container = $("#remindersBody");
  container.innerHTML = state.reminders.length ? state.reminders.map(row => `<article class="reminder-item"><div><strong>${escapeHtml(row.nombre_completo)}</strong><span>${escapeHtml(row.cargo)} · ${escapeHtml(row.horario)}</span><p>${escapeHtml(row.titulo)}${row.descripcion ? ` — ${escapeHtml(row.descripcion)}` : ""}</p></div><button class="table-action" type="button" data-complete-reminder="${row.id}">Completar</button></article>`).join("") : '<p class="empty">No hay recordatorios pendientes para el turno seleccionado.</p>';
  document.querySelectorAll("[data-complete-reminder]").forEach(button => button.addEventListener("click", async () => {
    if (!confirm("¿Marcar este recordatorio como completado?")) return;
    button.disabled = true;
    const { error } = await sb.rpc("clinic_actualizar_estado_recordatorio", { p_recordatorio_id: Number(button.dataset.completeReminder), p_estado: "completado" });
    if (error) setMessage("#reminderMessage", error.message, true);
    else { setMessage("#reminderMessage", "Recordatorio marcado como completado."); await loadReminders(); }
  }));
}

async function loadReminders() {
  const { data, error } = await sb.rpc("clinic_listar_recordatorios_turno", { p_fecha: $("#scheduleDate").value });
  if (error) return setMessage("#reminderMessage", error.message, true);
  state.reminders = data || [];
  renderReminders();
}

async function submitReminder(event) {
  event.preventDefault();
  const professionalId = Number($("#reminderProfessional").value), title = $("#reminderTitle").value.trim(), description = $("#reminderDescription").value.trim();
  if (!professionalId) return setMessage("#reminderMessage", "Selecciona un profesional programado.", true);
  const { error } = await sb.rpc("clinic_guardar_recordatorio", { p_profesional_id: professionalId, p_titulo: title, p_descripcion: description || null });
  if (error) return setMessage("#reminderMessage", error.message, true);
  $("#reminderForm").reset();
  setMessage("#reminderMessage", "Recordatorio registrado. Se mostrará cuando el profesional esté de turno.");
  await loadReminders();
}

async function loadSchedule() {
  const { data, error } = await sb.rpc("clinic_turnos_profesionales", { p_fecha: $("#scheduleDate").value });
  if (error) { $("#scheduleBody").innerHTML = `<tr><td colspan="6" class="empty">${escapeHtml(error.message)}</td></tr>`; return; }
  state.schedule = data || [];
  renderSchedule();
  setReminderProfessionals();
  await loadReminders();
}

function periodRange(scope, base) { const d = new Date(`${base}T12:00:00`), start = new Date(d), end = new Date(d); if (scope === "week") { const day = (d.getDay() + 6) % 7; start.setDate(d.getDate() - day); end.setDate(start.getDate() + 6); } if (scope === "month") { start.setDate(1); end.setMonth(d.getMonth() + 1, 0); } return [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)]; }
function renderReport() { const rows = state.report, totals = rows.reduce((acc, row) => ({ programados: acc.programados + Number(row.programados), presentes: acc.presentes + Number(row.presentes), ausentes: acc.ausentes + Number(row.ausentes), pendientes: acc.pendientes + Number(row.pendientes) }), { programados: 0, presentes: 0, ausentes: 0, pendientes: 0 }); $("#reportSummary").innerHTML = [["Programados", totals.programados], ["Presentes", totals.presentes], ["Ausentes", totals.ausentes], ["Pendientes", totals.pendientes]].map(item => `<article><span>${item[0]}</span><strong>${item[1]}</strong></article>`).join(""); $("#reportBody").innerHTML = rows.length ? rows.map(row => `<tr><td><strong>${row.nombre_completo}</strong></td><td>${row.cargo}</td><td>${row.programados}</td><td>${row.presentes}</td><td>${row.ausentes}</td><td>${row.pendientes}</td></tr>`).join("") : `<tr><td colspan="6" class="empty">No hay programación en el período seleccionado.</td></tr>`; }
async function generateReport() { const [from, to] = periodRange($("#reportScope").value, $("#reportDate").value); const { data, error } = await sb.rpc("clinic_reporte_asistencia_profesional", { p_desde: from, p_hasta: to }); if (error) return alert(error.message); state.report = data || []; renderReport(); }
function downloadReport() { if (!state.report.length) return alert("Primero genera un reporte."); const headers = ["Profesional", "Cargo", "Programados", "Presentes", "Ausentes", "Pendientes"], lines = [headers, ...state.report.map(row => [row.nombre_completo, row.cargo, row.programados, row.presentes, row.ausentes, row.pendientes])].map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n"); const blob = new Blob([lines], { type: "text/csv;charset=utf-8;" }), link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `reporte-asistencia-${$("#reportDate").value}.csv`; link.click(); URL.revokeObjectURL(link.href); }

function downloadExcel(filename, sheetName, rows) {
  if (!rows.length) return alert("No hay datos para exportar en el período seleccionado.");
  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = Object.keys(rows[0]).map(key => ({ wch: Math.min(40, Math.max(key.length + 2, ...rows.map(row => String(row[key] ?? "").length + 2))) }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  XLSX.writeFile(workbook, filename);
}

async function downloadProfessionalExcel() {
  const [from, to] = periodRange($("#reportScope").value, $("#reportDate").value);
  const { data, error } = await sb.rpc("clinic_reporte_asistencia_profesional_detallado", { p_desde: from, p_hasta: to });
  if (error) return alert(error.message);
  const rows = (data || []).map(row => ({ Fecha: row.fecha, Profesional: row.nombre_completo, Profesión: row.cargo, Horario: row.horario, Módulo: row.modulo || "", Estado: row.estado, "Hora de marcación": fmtTime(row.marcado_en), "Hora corregida": row.hora_editada_en ? fmtTime(row.hora_editada_en) : "" }));
  downloadExcel(`asistencia-personal-${from}-${to}.xlsx`, "Personal", rows);
}

async function downloadPatientExcel() {
  const [from, to] = periodRange($("#reportScope").value, $("#reportDate").value);
  const { data, error } = await sb.rpc("clinic_reporte_asistencia_pacientes_ordenado", { p_desde: from, p_hasta: to });
  if (error) return alert(error.message);
  const rows = [...(data || [])].sort(clinicalCompare).map(row => ({ Fecha: row.fecha_operativa, Nombre: row.nombre_completo, Profesión: "Paciente", DNI: row.dni, Turno: row.turno || "", Secuencia: row.secuencia || "", Estado: row.estado, "Hora de registro": fmtTime(row.registrado_en), "Hora corregida": row.hora_editada_en ? fmtTime(row.hora_editada_en) : "" }));
  downloadExcel(`asistencia-pacientes-${from}-${to}.xlsx`, "Pacientes", rows);
}

function renderOperationalReport() {
  const rows = state.operationalReport;
  $("#operationalReportBody").innerHTML = rows.length ? rows.map(row => `<tr><td><strong>${escapeHtml(row.apellidos_y_nombres)}</strong></td><td>${escapeHtml(row.cargo_o_especialidad)}</td><td>${escapeHtml(row.ingreso || "")}</td><td>${escapeHtml(row.salida || "")}</td><td>${escapeHtml(row.observacion || "")}</td></tr>`).join("") : '<tr><td colspan="5" class="empty">No hay personal programado en esta fecha.</td></tr>';
}

async function loadOperationalReport() {
  const date = $("#operationalReportDate").value;
  if (!date) return setMessage("#operationalReportMessage", "Selecciona una fecha.", true);
  const { data, error } = await sb.rpc("clinic_formato_asistencia_operativa", { p_fecha: date });
  if (error) return setMessage("#operationalReportMessage", error.message, true);
  state.operationalReport = data || [];
  renderOperationalReport();
  setMessage("#operationalReportMessage", `${state.operationalReport.length} filas preparadas para el formato de asistencia.`);
}

async function copyText(text, message) {
  if (!text) return alert("No hay datos para copiar.");
  try { await navigator.clipboard.writeText(text); }
  catch { const fallback = document.createElement("textarea"); fallback.value = text; document.body.appendChild(fallback); fallback.select(); document.execCommand("copy"); fallback.remove(); }
  setMessage("#operationalReportMessage", message || "Datos copiados al portapapeles.");
}

function parseClock(value) {
  const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function formatClock(minutes) {
  const normalized = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
}

function parseClockList(value) {
  const tokens = String(value || "").split(/[\n,;\s]+/).map(item => item.trim()).filter(Boolean);
  const invalid = tokens.filter(token => parseClock(token) === null);
  if (invalid.length) throw new Error(`Hay horas inválidas: ${invalid.slice(0, 4).join(", ")}. Usa HH:MM, una por línea.`);
  return tokens.map(parseClock);
}

function selectedShiftRows() {
  return state.registers.filter(row => row.turno === state.activeRegisterShift);
}

function currentDoctorEntryTime() {
  const doctor = state.schedule.find(row => /m[eé]dic/.test(String(row.cargo || "").toLowerCase()) && row.asistencia_marcada_en);
  return doctor ? fmtTimeInput(doctor.asistencia_marcada_en) : "";
}

function copyPatientHours() {
  const rows = selectedShiftRows();
  if (!rows.length) return setMessage("#registerMessage", `No hay pacientes registrados en el Turno ${state.activeRegisterShift}.`, true);
  copyText(rows.map(row => fmtTimeInput(row.registrado_en)).join("\n"), `Horas de entrada del Turno ${state.activeRegisterShift} copiadas en el orden clínico programado.`);
  setMessage("#registerMessage", `Horas del Turno ${state.activeRegisterShift} copiadas para pegar en Excel.`);
}

function buildTimeTool(type) {
  const isStart = type === "doctor-start";
  const isEnd = type === "doctor-end";
  const doctorEntry = currentDoctorEntryTime();
  $("#registerToolPanel").hidden = false;
  $("#registerToolTitle").textContent = isStart ? "Hora inicial de atención" : "Hora final de atención";
  $("#registerToolSubtitle").textContent = isStart
    ? "Parte de la hora de asistencia del médico y evita resultados iguales o anteriores a la lista comparativa."
    : "Procesa una lista base de horas para producir valores finales diferenciados por módulos.";
  $("#registerToolContent").innerHTML = `
    <div class="register-tool-grid">
      <label>Hora ${isStart ? "de ingreso del médico" : "base final del médico"}<input id="calculationDoctorTime" type="time" value="${doctorEntry}" /></label>
      <label>Turno de pacientes<select id="calculationShift">${registerShifts.map(shift => `<option value="${shift}" ${state.activeRegisterShift === shift ? "selected" : ""}>Turno ${shift}</option>`).join("")}</select></label>
      <label>Desfase del primer paciente (min)<input id="calculationInitialOffset" type="number" min="0" max="30" value="3" /></label>
      <label>Separación módulo 1 (min)<input id="calculationModule1" type="number" min="0" max="30" value="2" /></label>
      <label>Separación módulo 2 (min)<input id="calculationModule2" type="number" min="0" max="30" value="2" /></label>
      <label>Separación módulo 3 (min)<input id="calculationModule3" type="number" min="0" max="30" value="2" /></label>
      <label>Separación módulo 4 (min)<input id="calculationModule4" type="number" min="0" max="30" value="2" /></label>
    </div>
    ${isEnd ? '<label class="tool-wide-label">Lista base de horas de fin (una por línea). Se aplicará el incremento correspondiente a cada módulo.<textarea id="calculationBaseList" placeholder="09:00\n09:02\n09:04"></textarea></label>' : ""}
    <label class="tool-wide-label">Lista comparativa opcional (una hora por línea). Si un resultado es igual o anterior a esa fila, se ajusta un minuto después.<textarea id="calculationComparable" placeholder="05:42\n05:44\n05:46"></textarea></label>
    <p class="register-tool-note">Las posiciones se agrupan de cinco en cinco: 1–5 Módulo 1, 6–10 Módulo 2, 11–15 Módulo 3 y 16–20 Módulo 4. Puedes usar, por ejemplo, 1/2/3 o 3/2/1 minutos según el formato del día.</p>
    <div class="register-tool-actions"><button class="primary-btn" id="processTimeCalculation" type="button">Procesar lista</button><button class="secondary-btn" id="copyTimeCalculation" type="button" disabled>Copiar resultados</button></div>
    <pre class="register-tool-output" id="timeCalculationOutput">Aún no se ha procesado ninguna lista.</pre>`;
  $("#registerToolMessage").textContent = "";
  $("#processTimeCalculation").addEventListener("click", () => processTimeCalculation(type));
  $("#copyTimeCalculation").addEventListener("click", () => copyText($("#timeCalculationOutput").dataset.values || "", "Horas calculadas copiadas. Pégalas en la columna del Excel."));
  $("#registerToolPanel").scrollIntoView({ behavior: "smooth", block: "start" });
}

function processTimeCalculation(type) {
  try {
    const base = parseClock($("#calculationDoctorTime").value);
    if (base === null) throw new Error("Indica una hora base válida del médico en formato HH:MM.");
    const shift = $("#calculationShift").value;
    const registered = state.registers.filter(row => row.turno === shift);
    const baseList = type === "doctor-end" ? parseClockList($("#calculationBaseList").value) : [];
    if (type === "doctor-end" && !baseList.length) throw new Error("Pega una lista base de horas para calcular la salida final.");
    const count = type === "doctor-end" ? baseList.length : (registered.length || 15);
    const initialOffset = Number($("#calculationInitialOffset").value);
    const intervals = [Number($("#calculationModule1").value), Number($("#calculationModule2").value), Number($("#calculationModule3").value), Number($("#calculationModule4").value)];
    if (![initialOffset, ...intervals].every(value => Number.isFinite(value) && value >= 0)) throw new Error("Los incrementos deben ser números positivos o cero.");
    const comparisons = parseClockList($("#calculationComparable").value);
    let running = base + initialOffset;
    const values = Array.from({ length: count }, (_, index) => {
      const module = Math.min(3, Math.floor(index / 5));
      if (type === "doctor-end") running = baseList[index] + intervals[module];
      else if (index > 0) running += intervals[module];
      const comparison = comparisons[index];
      if (comparison !== undefined && running <= comparison) running = comparison + 1;
      return running;
    }).map(formatClock);
    $("#timeCalculationOutput").textContent = values.map((value, index) => `${String(index + 1).padStart(2, "0")}. ${value}`).join("\n");
    $("#timeCalculationOutput").dataset.values = values.join("\n");
    $("#copyTimeCalculation").disabled = false;
    setMessage("#registerToolMessage", `${values.length} horas procesadas para el Turno ${shift}. Las comparaciones, si se ingresaron, se respetaron sin repetir ni adelantar horas.`);
  } catch (error) { setMessage("#registerToolMessage", error.message, true); }
}

function openRegisterTool(tool) {
  if (tool === "copy-patient-hours") return copyPatientHours();
  buildTimeTool(tool);
}

function copyOperationalReport(type) {
  const rows = state.operationalReport;
  if (!rows.length) return alert("Primero genera el formato operativo.");
  const columns = {
    names: row => row.apellidos_y_nombres,
    roles: row => row.cargo_o_especialidad,
    entry: row => row.ingreso,
    exit: row => row.salida,
    notes: row => row.observacion,
    all: row => [row.apellidos_y_nombres, row.cargo_o_especialidad, row.ingreso, row.salida, row.observacion].join("\t"),
  };
  const message = type === "all" ? "Tabla completa copiada. Pégala en cinco columnas del Excel." : "Columna copiada. Pégala en la columna correspondiente del Excel.";
  copyText(rows.map(columns[type]).join("\n"), message);
}

function renderPatientList() {
  const body = $("#patientListBody"), selectedId = state.patientDetail?.id;
  $("#patientListCount").textContent = `${state.patients.length} paciente${state.patients.length === 1 ? "" : "s"}`;
  body.innerHTML = state.patients.length ? state.patients.map(patient => `<tr data-patient-row="${patient.id}" class="${patient.id === selectedId ? "selected" : ""}"><td class="patient-name-cell"><strong>${escapeHtml(patient.nombre_completo)}</strong><span>${escapeHtml(patient.diagnostico || "Sin diagnóstico registrado")}</span></td><td>${escapeHtml(patient.dni || "—")}</td><td>${patient.edad_anos ?? "—"}</td><td>${patient.peso_seco_kg ?? "—"}${patient.peso_seco_kg ? " kg" : ""}</td><td><span class="vital-badge ${patient.estado_vital === "fallecido" ? "fallecido" : ""}">${escapeHtml(patient.estado_vital || "sin_confirmar")}</span></td><td>${escapeHtml(patient.sede_nombre || "Sin sede")}</td></tr>`).join("") : '<tr><td colspan="6" class="empty">No se encontraron pacientes.</td></tr>';
  document.querySelectorAll("[data-patient-row]").forEach(row => row.addEventListener("click", () => loadPatientDetail(Number(row.dataset.patientRow))));
}

function populatePatientSites() {
  const select = $("#patientSede"), selected = String(state.patientDetail?.sede_atencion_id || "");
  select.innerHTML = `<option value="">Sin sede asignada</option>${state.sites.map(site => `<option value="${site.id}">${escapeHtml(site.nombre)}</option>`).join("")}`;
  select.value = selected;
}

function renderPatientDetail() {
  const patient = state.patientDetail;
  if (!patient) return;
  $("#patientDetailForm").hidden = false;
  $("#patientDetailTitle").textContent = patient.nombre_completo || "Detalle del paciente";
  $("#patientDetailSubtitle").textContent = `DNI ${patient.dni || "sin registrar"} · ${patient.sede_nombre || "Sin sede asignada"}`;
  $("#patientId").value = patient.id;
  $("#patientApellidoPaterno").value = patient.apellido_paterno || "";
  $("#patientApellidoMaterno").value = patient.apellido_materno || "";
  $("#patientNombres").value = patient.nombres || "";
  $("#patientDni").value = patient.dni || "";
  $("#patientTelefono").value = patient.telefono || "";
  $("#patientDireccion").value = patient.direccion || "";
  $("#patientEdad").value = patient.edad_anos ?? "";
  $("#patientPesoSeco").value = patient.peso_seco_kg ?? "";
  $("#patientEstadoVital").value = patient.estado_vital || "sin_confirmar";
  $("#patientFechaFallecimiento").value = dateInput(patient.fecha_fallecimiento);
  $("#patientTiempoDialisis").value = patient.tiempo_dialisis_horas ?? "";
  $("#patientAccesoVascular").value = patient.acceso_vascular || "";
  $("#patientQb").value = patient.qb_ml_min ?? "";
  $("#patientQd").value = patient.qd_ml_min ?? "";
  $("#patientFiltro").value = patient.filtro || "";
  $("#patientMembrana").value = patient.membrana || "";
  $("#patientHeparina").value = patient.heparina_iu ?? "";
  $("#patientDiagnostico").value = patient.diagnostico || "";
  $("#patientObservacion").value = patient.observacion_clinica || "";
  populatePatientSites();
  const docs = patient.documentos || [];
  $("#patientDocuments").innerHTML = docs.length ? `<h4>Documentos registrados</h4><ul class="document-history">${docs.map(doc => `<li><div><strong>${escapeHtml(doc.tipo_documento)}</strong><span>${escapeHtml(doc.firmante_nombre || "Sin firmante")}</span></div><span>${escapeHtml(doc.fecha_emision || "")}</span></li>`).join("")}</ul>` : '<p class="empty">Todavía no hay documentos generados para este paciente.</p>';
  $("#patientWhatsApp").disabled = !patient.telefono;
  renderPatientList();
}

async function loadPatientDetail(id) {
  $("#patientDetailMessage").textContent = "Cargando perfil…";
  const { data, error } = await sb.rpc("clinic_obtener_paciente", { p_paciente_id: id });
  if (error) return setMessage("#patientDetailMessage", error.message, true);
  state.patientDetail = data;
  renderPatientDetail();
  setMessage("#patientDetailMessage", "Perfil cargado. Puedes actualizar los campos necesarios.");
}

async function loadPatientSites() {
  const { data, error } = await sb.rpc("clinic_listar_sedes_atencion");
  if (error) return setMessage("#patientDetailMessage", error.message, true);
  state.sites = data || [];
  if (state.patientDetail) populatePatientSites();
}

async function loadPatients() {
  const query = $("#patientSearchInput").value.trim();
  $("#patientListBody").innerHTML = '<tr><td colspan="6" class="empty">Cargando pacientes…</td></tr>';
  const { data, error } = await sb.rpc("clinic_listar_pacientes", { p_busqueda: query, p_limite: 200 });
  if (error) { $("#patientListBody").innerHTML = `<tr><td colspan="6" class="empty">${escapeHtml(error.message)}</td></tr>`; return; }
  state.patients = data || [];
  renderPatientList();
}

async function savePatientDetail(event) {
  event.preventDefault();
  const id = Number($("#patientId").value);
  if (!id) return;
  const payload = {
    apellido_paterno: $("#patientApellidoPaterno").value,
    apellido_materno: $("#patientApellidoMaterno").value,
    nombres: $("#patientNombres").value,
    telefono: $("#patientTelefono").value,
    direccion: $("#patientDireccion").value,
    edad_anos: numberOrNull($("#patientEdad").value),
    peso_seco_kg: numberOrNull($("#patientPesoSeco").value),
    estado_vital: $("#patientEstadoVital").value,
    fecha_fallecimiento: $("#patientFechaFallecimiento").value || null,
    sede_atencion_id: numberOrNull($("#patientSede").value),
    tiempo_dialisis_horas: numberOrNull($("#patientTiempoDialisis").value),
    acceso_vascular: $("#patientAccesoVascular").value,
    qb_ml_min: numberOrNull($("#patientQb").value),
    qd_ml_min: numberOrNull($("#patientQd").value),
    filtro: $("#patientFiltro").value,
    membrana: $("#patientMembrana").value,
    heparina_iu: numberOrNull($("#patientHeparina").value),
    diagnostico: $("#patientDiagnostico").value,
    observacion_clinica: $("#patientObservacion").value,
  };
  const { data, error } = await sb.rpc("clinic_guardar_paciente", { p_paciente_id: id, p_datos: payload });
  if (error) return setMessage("#patientDetailMessage", error.message, true);
  state.patientDetail = data;
  await loadPatients();
  renderPatientDetail();
  setMessage("#patientDetailMessage", "Cambios del paciente guardados.");
}

async function addPatientSite() {
  const nombre = prompt("Nombre de la nueva sede o lugar de atención:");
  if (nombre === null) return;
  const direccion = prompt("Dirección de la sede (opcional):");
  if (direccion === null) return;
  const { data, error } = await sb.rpc("clinic_guardar_sede_atencion", { p_nombre: nombre.trim(), p_direccion: direccion.trim() || null, p_telefono: null });
  if (error) return setMessage("#patientDetailMessage", error.message, true);
  await loadPatientSites();
  $("#patientSede").value = String(data.id);
  setMessage("#patientDetailMessage", "Sede registrada. Guarda el perfil para asignarla al paciente.");
}

function notifyPatientSiteChange() {
  const patient = state.patientDetail;
  if (!patient?.telefono) return alert("Registra un teléfono antes de abrir WhatsApp.");
  const site = state.sites.find(item => String(item.id) === $("#patientSede").value);
  if (!site) return alert("Selecciona la sede que deseas comunicar.");
  const number = String(patient.telefono).replace(/\D/g, "");
  if (number.length < 8) return alert("El teléfono registrado no parece válido para WhatsApp.");
  const suggestedText = `Hola ${patient.nombre_completo}. Le informamos que su lugar de atención es: ${site.nombre}. Por favor, comuníquese con el Centro de Diálisis Virgen de Lourdes ante cualquier consulta.`;
  const text = prompt("Edita el mensaje que se abrirá en WhatsApp:", suggestedText);
  if (text === null || !text.trim()) return;
  if (!confirm(`Se abrirá WhatsApp con un borrador de aviso para ${patient.nombre_completo}. Revisa el mensaje antes de enviarlo.`)) return;
  window.open(`https://wa.me/${number}?text=${encodeURIComponent(text.trim())}`, "_blank", "noopener");
}

function renderMonthlySchedule() {
  const grouped = new Map();
  state.monthlySchedule.forEach(row => {
    const key = `${row.numero_documento}|${row.cargo}`;
    if (!grouped.has(key)) grouped.set(key, { nombre: row.nombre_completo, cargo: row.cargo, turnos: [] });
    grouped.get(key).turnos.push(row);
  });
  $("#monthlyScheduleCount").textContent = `${grouped.size} profesional${grouped.size === 1 ? "" : "es"} · ${state.monthlySchedule.length} turnos`;
  $("#monthlyScheduleBody").innerHTML = grouped.size ? [...grouped.values()].map(person => `<article class="monthly-person"><h4>${person.nombre}</h4><p>${person.cargo}</p><div class="monthly-days">${person.turnos.map(turno => `<span>${new Date(`${turno.fecha}T12:00:00`).getDate()}: ${turno.horario}${turno.modulo ? ` · ${turno.modulo}` : ""}</span>`).join("")}</div></article>`).join("") : '<p class="empty">No hay horarios programados para este mes.</p>';
}

function monthRange(period) {
  const [year, month] = period.split("-").map(Number);
  const first = `${period}-01`, last = `${period}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}`;
  return [first, last];
}

function renderCalendarDetails() {
  const selected = state.calendarDate, rows = state.monthlySchedule.filter(row => row.fecha === selected);
  $("#calendarDetailTitle").textContent = selected ? `Turno · ${fmtDate(selected)}` : "Turno del día";
  $("#calendarDetailCount").textContent = selected ? `${rows.length} profesional${rows.length === 1 ? "" : "es"} programado${rows.length === 1 ? "" : "s"}` : "Selecciona una fecha";
  $("#calendarDetailBody").innerHTML = selected ? (rows.length ? `<ul class="calendar-turn-list">${rows.map(row => `<li><strong>${escapeHtml(row.nombre_completo)}</strong><span>${escapeHtml(row.cargo)} · ${escapeHtml(row.horario)}${row.modulo ? ` · ${escapeHtml(row.modulo)}` : ""}</span></li>`).join("")}</ul>` : '<p class="empty">No hay turnos programados para este día.</p>') : '<p class="empty">Selecciona un día del calendario.</p>';
}

function renderCalendar() {
  const period = $("#monthlyScheduleMonth").value;
  if (!period) return;
  const [year, month] = period.split("-").map(Number), days = new Date(year, month, 0).getDate();
  const firstWeekday = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const counts = state.monthlySchedule.reduce((map, row) => map.set(row.fecha, (map.get(row.fecha) || 0) + 1), new Map());
  const cells = Array.from({ length: firstWeekday }, () => '<span class="calendar-blank" aria-hidden="true"></span>');
  for (let day = 1; day <= days; day += 1) {
    const date = `${period}-${String(day).padStart(2, "0")}`, count = counts.get(date) || 0;
    cells.push(`<button type="button" class="calendar-day ${count ? "has-turn" : ""} ${state.calendarDate === date ? "selected" : ""}" data-calendar-date="${date}" aria-label="${date}: ${count} turnos"><strong>${day}</strong><span>${count ? `${count} turno${count === 1 ? "" : "s"}` : "Sin turno"}</span></button>`);
  }
  $("#monthlyCalendar").innerHTML = cells.join("");
  document.querySelectorAll("[data-calendar-date]").forEach(button => button.addEventListener("click", () => { state.calendarDate = button.dataset.calendarDate; renderCalendar(); renderCalendarDetails(); }));
  renderCalendarDetails();
}

async function generateMonthlySchedule() {
  const period = $("#monthlyScheduleMonth").value;
  if (!period) return setMessage("#monthlyScheduleMessage", "Selecciona un mes.", true);
  $("#monthlyScheduleCount").textContent = "Cargando reporte mensual…";
  setMessage("#monthlyScheduleMessage", "Consultando horarios del mes…");
  const { data, error } = await sb.rpc("clinic_reporte_horario_mensual", { p_periodo: `${period}-01` });
  if (error) { $("#monthlyScheduleCount").textContent = "No se pudo cargar el reporte"; return setMessage("#monthlyScheduleMessage", error.message, true); }
  state.monthlySchedule = data || [];
  renderMonthlySchedule();
  const [firstDay] = monthRange(period);
  if (!state.calendarDate || !state.calendarDate.startsWith(period)) state.calendarDate = firstDay;
  renderCalendar();
  setMessage("#monthlyScheduleMessage", state.monthlySchedule.length ? "Reporte mensual actualizado." : "No hay turnos cargados para este mes.");
}

function downloadMonthlySchedule() {
  if (!state.monthlySchedule.length) return alert("Primero genera el reporte mensual.");
  const headers = ["Fecha", "Profesional", "Documento", "Cargo", "Horario", "Módulo"];
  const lines = [headers, ...state.monthlySchedule.map(row => [row.fecha, row.nombre_completo, row.numero_documento, row.cargo, row.horario, row.modulo || ""])].map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([lines], { type: "text/csv;charset=utf-8;" }), link = document.createElement("a");
  link.href = URL.createObjectURL(blob); link.download = `horario-profesionales-${$("#monthlyScheduleMonth").value}.csv`; link.click(); URL.revokeObjectURL(link.href);
}

function renderProfessionalSearch() {
  const body = $("#professionalSearchBody"), rows = state.professionalSearch;
  body.innerHTML = rows.length ? rows.map(row => `<tr><td>${fmtDate(row.fecha)}</td><td><strong>${escapeHtml(row.nombre_completo)}</strong></td><td>${escapeHtml(row.cargo)}</td><td>${escapeHtml(row.horario)}</td><td>${escapeHtml(row.modulo || "—")}</td></tr>`).join("") : '<tr><td colspan="5" class="empty">No se encontraron turnos para esta búsqueda en el mes seleccionado.</td></tr>';
}

async function searchProfessionalSchedule() {
  const query = $("#professionalSearchInput").value.trim(), period = $("#monthlyScheduleMonth").value;
  if (query.length < 2) { $("#professionalSearchBody").innerHTML = '<tr><td colspan="5" class="empty">Escribe al menos 2 caracteres para buscar.</td></tr>'; return; }
  if (!period) return;
  const [from, to] = monthRange(period);
  const { data, error } = await sb.rpc("clinic_buscar_turnos_profesional", { p_busqueda: query, p_desde: from, p_hasta: to });
  if (error) { $("#professionalSearchBody").innerHTML = `<tr><td colspan="5" class="empty">${escapeHtml(error.message)}</td></tr>`; return; }
  state.professionalSearch = data || [];
  renderProfessionalSearch();
}

function cellValue(row, index) { return String(row[index] ?? "").trim(); }
async function importSchedule() { const file = $("#scheduleFile").files[0]; if (!file) return setMessage("#importMessage", "Selecciona un archivo Excel, CSV o PDF.", true); const period = $("#importPeriod").value; if (!period) return setMessage("#importMessage", "Selecciona el período del horario.", true); if (file.name.toLowerCase().endsWith(".pdf")) return; const buffer = await file.arrayBuffer(), book = XLSX.read(buffer, { type: "array" }), sheet = book.Sheets[book.SheetNames[0]], matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }); const headerIndex = matrix.findIndex(row => row.some(value => String(value).trim().toLowerCase() === "profesional")); if (headerIndex < 0) return setMessage("#importMessage", "No se encontró la columna Profesional en el archivo.", true); const headers = matrix[headerIndex].map(value => String(value).trim()), idxName = headers.findIndex(h => h.toLowerCase() === "profesional"), idxRole = headers.findIndex(h => h.toLowerCase() === "especialidad"), idxDoc = headers.findIndex(h => h.toLowerCase() === "nro"), rows = []; matrix.slice(headerIndex + 1).forEach(row => { const documento = cellValue(row, idxDoc), nombre = cellValue(row, idxName), cargo = cellValue(row, idxRole); if (!documento || !nombre || !cargo) return; headers.forEach((header, index) => { if (!/^\d+(\.0)?$/.test(header)) return; const day = Number(header), raw = cellValue(row, index); if (!raw) return; const match = raw.match(/^(\d{2}:\d{2}\s*-\s*\d{2}:\d{2})(?:\s*-\s*(.*))?$/); rows.push({ documento, nombre, cargo, fecha: `${period}-${String(day).padStart(2, "0")}`, horario: match ? match[1] : raw, modulo: match?.[2] || "" }); }); }); if (!rows.length) return setMessage("#importMessage", "El archivo no contiene horarios reconocibles.", true); $("#importPreview").hidden = false; $("#importPreview").textContent = `${file.name}\n${rows.length} turnos detectados para ${period}.\n\nPrimeras filas:\n${JSON.stringify(rows.slice(0, 4), null, 2)}`; const { data, error } = await sb.rpc("clinic_importar_turnos_json", { p_archivo: file.name, p_periodo: `${period}-01`, p_filas: rows }); if (error) return setMessage("#importMessage", error.message, true); setMessage("#importMessage", `Importación realizada: ${data.filas_importadas} filas procesadas.`); await loadSchedule(); }

function init() {
  if (!sb) { document.body.innerHTML = '<p style="padding:30px;font-family:sans-serif">No se pudo inicializar Supabase.</p>'; return; }
  const today = limaDate();
  $("#todayLabel").textContent = `${fmtDate(today)} · Secuencia ${sequenceForDate(today)}`;
  $("#shiftISequence").textContent = `Secuencia ${sequenceForDate(today)}`;
  $("#shiftIISequence").textContent = `Secuencia ${sequenceForDate(today)}`;
  $("#shiftIIISequence").textContent = `Secuencia ${sequenceForDate(today)}`;
  $("#scheduleDate").value = today; $("#reportDate").value = today; $("#operationalReportDate").value = today;
  $("#monthlyScheduleMonth").value = today.slice(0, 7);
  $("#patientForm").addEventListener("submit", submitPatient);
  $("#refreshRegisters").addEventListener("click", loadRegisters);
  $("#shareShiftI").addEventListener("click", () => shareShift("I"));
  $("#shareShiftII").addEventListener("click", () => shareShift("II"));
  $("#shareShiftIII").addEventListener("click", () => shareShift("III"));
  $("#previousRegisterShift").addEventListener("click", () => changeRegisterShift("previous"));
  $("#nextRegisterShift").addEventListener("click", () => changeRegisterShift("next"));
  document.querySelectorAll("[data-register-tool]").forEach(button => button.addEventListener("click", () => openRegisterTool(button.dataset.registerTool)));
  $("#closeRegisterTool").addEventListener("click", () => { $("#registerToolPanel").hidden = true; $("#registerToolContent").innerHTML = ""; });
  $("#scheduleDate").addEventListener("change", loadSchedule);
  $("#generateReport").addEventListener("click", generateReport);
  $("#downloadReport").addEventListener("click", downloadReport);
  $("#downloadProfessionalExcel").addEventListener("click", downloadProfessionalExcel);
  $("#downloadPatientExcel").addEventListener("click", downloadPatientExcel);
  $("#generateOperationalReport").addEventListener("click", loadOperationalReport);
  document.querySelectorAll("[data-copy-operational]").forEach(button => button.addEventListener("click", () => copyOperationalReport(button.dataset.copyOperational)));
  $("#searchPatients").addEventListener("click", loadPatients);
  $("#patientSearchInput").addEventListener("keydown", event => { if (event.key === "Enter") { event.preventDefault(); loadPatients(); } });
  $("#patientDetailForm").addEventListener("submit", savePatientDetail);
  $("#addPatientSite").addEventListener("click", addPatientSite);
  $("#patientWhatsApp").addEventListener("click", notifyPatientSiteChange);
  $("#generateMonthlySchedule").addEventListener("click", generateMonthlySchedule);
  $("#downloadMonthlySchedule").addEventListener("click", downloadMonthlySchedule);
  $("#searchProfessionalSchedule").addEventListener("click", searchProfessionalSchedule);
  $("#professionalSearchInput").addEventListener("keydown", event => { if (event.key === "Enter") { event.preventDefault(); searchProfessionalSchedule(); } });
  $("#reminderForm").addEventListener("submit", submitReminder);
  $("#importSchedule").addEventListener("click", importSchedule);
  document.querySelectorAll(".tab").forEach(button => button.addEventListener("click", () => activeTab(button.dataset.tab)));
  const requestedTab = new URLSearchParams(window.location.search).get("tab");
  if (["registro", "turnos", "reportes", "pacientes", "documentos", "horario-mensual", "movil"].includes(requestedTab)) activeTab(requestedTab);
  loadRegisters(); loadSchedule(); generateMonthlySchedule(); loadOperationalReport(); loadPatientSites(); loadPatients();
}
init();
