const cfg = window.TURNOS_CONFIG || {};
const sb = window.supabase?.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
const $ = selector => document.querySelector(selector);
const state = { registers: [], schedule: [], report: [], monthlySchedule: [] };

const limaDate = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date());
const fmtDate = date => new Intl.DateTimeFormat("es-PE", { dateStyle: "full", timeZone: "America/Lima" }).format(new Date(`${date}T12:00:00`));
const fmtTime = value => value ? new Intl.DateTimeFormat("es-PE", { hour: "2-digit", minute: "2-digit", timeZone: "America/Lima" }).format(new Date(value)) : "—";
const setMessage = (id, text, error = false) => { const el = $(id); el.textContent = text; el.className = `message ${error ? "error" : "ok"}`; };
const sequenceForDate = date => { const d = new Date(`${date}T12:00:00`).getDay(); return [1, 3, 5].includes(d) ? "LMX" : [2, 4, 6].includes(d) ? "MJS" : "—"; };

function activeTab(id) {
  document.querySelectorAll(".tab").forEach(button => button.classList.toggle("active", button.dataset.tab === id));
  document.querySelectorAll(".tab-panel").forEach(panel => panel.classList.toggle("active", panel.id === id));
}

function parsePatientLine(value) {
  const clean = value.trim().replace(/\s+/g, " ");
  const match = clean.match(/^(.*?)\s+(\d{8})(?:\s+(I|II))?$/i);
  if (!match) throw new Error("Pega el dato como: NOMBRE Y APELLIDOS 10174612 o NOMBRE Y APELLIDOS 10174612 I.");
  return { nombre: match[1].trim(), dni: match[2], turno: match[3]?.toUpperCase() || null };
}

function registerRow(row) {
  return `<tr class="${row.estado === "retirado" ? "row-out" : ""}" data-register-id="${row.id}" title="Doble clic para marcar retiro">
    <td>${fmtTime(row.registrado_en)}</td>
    <td><strong>${row.nombre_completo}</strong></td>
    <td>${row.dni}</td>
    <td><span class="sequence-chip">${row.secuencia || "—"}</span></td>
    <td><span class="status ${row.estado}"><i class="dot"></i>${row.estado === "retirado" ? "Retirado" : "En sala"}</span></td>
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
}

function renderShift(shift) {
  const rows = state.registers.filter(row => row.turno === shift);
  const body = $(`#registerBody${shift}`);
  $(`#registerCount${shift}`).textContent = `${rows.length} paciente${rows.length === 1 ? "" : "s"}`;
  body.innerHTML = rows.length ? rows.map(registerRow).join("") : `<tr><td colspan="5" class="empty">Sin pacientes registrados en turno ${shift}.</td></tr>`;
}

function renderRegisters() {
  renderShift("I");
  renderShift("II");
  $("#registerCount").textContent = `${state.registers.length} paciente${state.registers.length === 1 ? "" : "s"} registrados`;
  attachRetirementEvents();
}

async function loadRegisters() {
  const { data, error } = await sb.rpc("clinic_listar_registros_hoy");
  if (error) return setMessage("#registerMessage", error.message, true);
  state.registers = data || [];
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
    setMessage("#registerMessage", `${data.nombre_completo} · Turno ${data.turno} · Secuencia ${data.secuencia}. Guardado a las ${fmtTime(data.registrado_en)}.`);
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
  const text = [`Centro de Diálisis Virgen del Lourdes`, `Lista de asistencia · ${fmtDate(limaDate())}`, `Turno ${shift} · Secuencia ${sequence}`, "", ...rows.map((row, index) => `${index + 1}. ${row.nombre_completo} · DNI ${row.dni} · ${row.estado === "retirado" ? "RETIRADO" : "PRESENTE"}`)].join("\n");
  try {
    if (navigator.share) await navigator.share({ title: `Lista turno ${shift}`, text });
    else { await navigator.clipboard.writeText(text); alert("Lista copiada al portapapeles para compartir."); }
  } catch (error) { if (error.name !== "AbortError") alert("No se pudo abrir la opción de compartir."); }
}

function renderSchedule() {
  const rows = state.schedule;
  $("#scheduleBody").innerHTML = rows.length ? rows.map(row => `<tr><td><input class="check" data-program="${row.programacion_id}" type="checkbox" ${row.asistencia_estado === "presente" ? "checked" : ""} aria-label="Marcar asistencia de ${row.nombre_completo}" /></td><td><strong>${row.nombre_completo}</strong><br><span class="muted">${row.numero_documento}</span></td><td>${row.cargo}</td><td><strong>${row.horario}</strong>${row.modulo ? `<br><span class="muted">${row.modulo}</span>` : ""}</td><td>${row.asistencia_estado === "pendiente" ? '<span class="muted">Pendiente</span>' : `<span class="status ${row.asistencia_estado === "presente" ? "active" : "retirado"}"><i class="dot"></i>${row.asistencia_estado === "presente" ? "Presente" : "Ausente"}</span><br><span class="muted">${fmtTime(row.asistencia_marcada_en)}</span>`}</td></tr>`).join("") : `<tr><td colspan="5" class="empty">No hay turnos programados para esta fecha.</td></tr>`;
  document.querySelectorAll("[data-program]").forEach(check => check.addEventListener("change", async () => { check.disabled = true; const { error } = await sb.rpc("clinic_marcar_asistencia_profesional", { p_programacion_id: Number(check.dataset.program), p_presente: check.checked }); if (error) { alert(error.message); check.checked = !check.checked; } await loadSchedule(); }));
}

async function loadSchedule() { const { data, error } = await sb.rpc("clinic_turnos_profesionales", { p_fecha: $("#scheduleDate").value }); if (error) { $("#scheduleBody").innerHTML = `<tr><td colspan="5" class="empty">${error.message}</td></tr>`; return; } state.schedule = data || []; renderSchedule(); }

function periodRange(scope, base) { const d = new Date(`${base}T12:00:00`), start = new Date(d), end = new Date(d); if (scope === "week") { const day = (d.getDay() + 6) % 7; start.setDate(d.getDate() - day); end.setDate(start.getDate() + 6); } if (scope === "month") { start.setDate(1); end.setMonth(d.getMonth() + 1, 0); } return [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)]; }
function renderReport() { const rows = state.report, totals = rows.reduce((acc, row) => ({ programados: acc.programados + Number(row.programados), presentes: acc.presentes + Number(row.presentes), ausentes: acc.ausentes + Number(row.ausentes), pendientes: acc.pendientes + Number(row.pendientes) }), { programados: 0, presentes: 0, ausentes: 0, pendientes: 0 }); $("#reportSummary").innerHTML = [["Programados", totals.programados], ["Presentes", totals.presentes], ["Ausentes", totals.ausentes], ["Pendientes", totals.pendientes]].map(item => `<article><span>${item[0]}</span><strong>${item[1]}</strong></article>`).join(""); $("#reportBody").innerHTML = rows.length ? rows.map(row => `<tr><td><strong>${row.nombre_completo}</strong></td><td>${row.cargo}</td><td>${row.programados}</td><td>${row.presentes}</td><td>${row.ausentes}</td><td>${row.pendientes}</td></tr>`).join("") : `<tr><td colspan="6" class="empty">No hay programación en el período seleccionado.</td></tr>`; }
async function generateReport() { const [from, to] = periodRange($("#reportScope").value, $("#reportDate").value); const { data, error } = await sb.rpc("clinic_reporte_asistencia_profesional", { p_desde: from, p_hasta: to }); if (error) return alert(error.message); state.report = data || []; renderReport(); }
function downloadReport() { if (!state.report.length) return alert("Primero genera un reporte."); const headers = ["Profesional", "Cargo", "Programados", "Presentes", "Ausentes", "Pendientes"], lines = [headers, ...state.report.map(row => [row.nombre_completo, row.cargo, row.programados, row.presentes, row.ausentes, row.pendientes])].map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n"); const blob = new Blob([lines], { type: "text/csv;charset=utf-8;" }), link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `reporte-asistencia-${$("#reportDate").value}.csv`; link.click(); URL.revokeObjectURL(link.href); }

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

async function generateMonthlySchedule() {
  const period = $("#monthlyScheduleMonth").value;
  if (!period) return alert("Selecciona un mes.");
  const { data, error } = await sb.rpc("clinic_reporte_horario_mensual", { p_periodo: `${period}-01` });
  if (error) return alert(error.message);
  state.monthlySchedule = data || [];
  renderMonthlySchedule();
}

function downloadMonthlySchedule() {
  if (!state.monthlySchedule.length) return alert("Primero genera el reporte mensual.");
  const headers = ["Fecha", "Profesional", "Documento", "Cargo", "Horario", "Módulo"];
  const lines = [headers, ...state.monthlySchedule.map(row => [row.fecha, row.nombre_completo, row.numero_documento, row.cargo, row.horario, row.modulo || ""])].map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([lines], { type: "text/csv;charset=utf-8;" }), link = document.createElement("a");
  link.href = URL.createObjectURL(blob); link.download = `horario-profesionales-${$("#monthlyScheduleMonth").value}.csv`; link.click(); URL.revokeObjectURL(link.href);
}

function cellValue(row, index) { return String(row[index] ?? "").trim(); }
async function importSchedule() { const file = $("#scheduleFile").files[0]; if (!file) return setMessage("#importMessage", "Selecciona un archivo Excel, CSV o PDF.", true); const period = $("#importPeriod").value; if (!period) return setMessage("#importMessage", "Selecciona el período del horario.", true); if (file.name.toLowerCase().endsWith(".pdf")) return; const buffer = await file.arrayBuffer(), book = XLSX.read(buffer, { type: "array" }), sheet = book.Sheets[book.SheetNames[0]], matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }); const headerIndex = matrix.findIndex(row => row.some(value => String(value).trim().toLowerCase() === "profesional")); if (headerIndex < 0) return setMessage("#importMessage", "No se encontró la columna Profesional en el archivo.", true); const headers = matrix[headerIndex].map(value => String(value).trim()), idxName = headers.findIndex(h => h.toLowerCase() === "profesional"), idxRole = headers.findIndex(h => h.toLowerCase() === "especialidad"), idxDoc = headers.findIndex(h => h.toLowerCase() === "nro"), rows = []; matrix.slice(headerIndex + 1).forEach(row => { const documento = cellValue(row, idxDoc), nombre = cellValue(row, idxName), cargo = cellValue(row, idxRole); if (!documento || !nombre || !cargo) return; headers.forEach((header, index) => { if (!/^\d+(\.0)?$/.test(header)) return; const day = Number(header), raw = cellValue(row, index); if (!raw) return; const match = raw.match(/^(\d{2}:\d{2}\s*-\s*\d{2}:\d{2})(?:\s*-\s*(.*))?$/); rows.push({ documento, nombre, cargo, fecha: `${period}-${String(day).padStart(2, "0")}`, horario: match ? match[1] : raw, modulo: match?.[2] || "" }); }); }); if (!rows.length) return setMessage("#importMessage", "El archivo no contiene horarios reconocibles.", true); $("#importPreview").hidden = false; $("#importPreview").textContent = `${file.name}\n${rows.length} turnos detectados para ${period}.\n\nPrimeras filas:\n${JSON.stringify(rows.slice(0, 4), null, 2)}`; const { data, error } = await sb.rpc("clinic_importar_turnos_json", { p_archivo: file.name, p_periodo: `${period}-01`, p_filas: rows }); if (error) return setMessage("#importMessage", error.message, true); setMessage("#importMessage", `Importación realizada: ${data.filas_importadas} filas procesadas.`); await loadSchedule(); }

function init() {
  if (!sb) { document.body.innerHTML = '<p style="padding:30px;font-family:sans-serif">No se pudo inicializar Supabase.</p>'; return; }
  const today = limaDate();
  $("#todayLabel").textContent = `${fmtDate(today)} · Secuencia ${sequenceForDate(today)}`;
  $("#shiftISequence").textContent = `Secuencia ${sequenceForDate(today)}`;
  $("#shiftIISequence").textContent = `Secuencia ${sequenceForDate(today)}`;
  $("#scheduleDate").value = today; $("#reportDate").value = today;
  $("#monthlyScheduleMonth").value = today.slice(0, 7);
  $("#patientForm").addEventListener("submit", submitPatient);
  $("#refreshRegisters").addEventListener("click", loadRegisters);
  $("#shareShiftI").addEventListener("click", () => shareShift("I"));
  $("#shareShiftII").addEventListener("click", () => shareShift("II"));
  $("#scheduleDate").addEventListener("change", loadSchedule);
  $("#generateReport").addEventListener("click", generateReport);
  $("#downloadReport").addEventListener("click", downloadReport);
  $("#generateMonthlySchedule").addEventListener("click", generateMonthlySchedule);
  $("#downloadMonthlySchedule").addEventListener("click", downloadMonthlySchedule);
  $("#importSchedule").addEventListener("click", importSchedule);
  document.querySelectorAll(".tab").forEach(button => button.addEventListener("click", () => activeTab(button.dataset.tab)));
  loadRegisters(); loadSchedule();
}
init();
