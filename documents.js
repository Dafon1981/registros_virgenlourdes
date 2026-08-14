(() => {
  const api = window.TurnosApp;
  if (!api?.sb || !document.querySelector("#documentos")) return;

  const { sb, $, state, escapeHtml, setMessage, limaDate, numberOrNull } = api;
  const docs = state.documents;
  const A4_WIDTH = 210, A4_HEIGHT = 297;
  const defaults = {
    titulo: { x: 105, y: 24, tamano: 16 },
    paciente: { x: 28, y: 45, tamano: 10 },
    dni: { x: 28, y: 52, tamano: 10 },
    edad: { x: 130, y: 52, tamano: 10 },
    fecha: { x: 28, y: 59, tamano: 10 },
    diagnostico: { x: 28, y: 70, tamano: 10 },
    dosis: { x: 28, y: 98, tamano: 10 },
    firma: { x: 150, y: 245, ancho: 38, alto: 22 },
    firmante: { x: 168, y: 273, tamano: 9 },
    fondo_url: "",
  };

  const clone = value => JSON.parse(JSON.stringify(value));
  const byId = id => $(id);
  const asNumber = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const pctX = mm => `${(Math.max(0, Math.min(A4_WIDTH, asNumber(mm, 0))) / A4_WIDTH) * 100}%`;
  const pctY = mm => `${(Math.max(0, Math.min(A4_HEIGHT, asNumber(mm, 0))) / A4_HEIGHT) * 100}%`;
  const formatPatientName = patient => patient?.nombre_completo || patient?.nombres || "Paciente sin nombre";
  const currentSignature = () => docs.signatures.find(item => String(item.id) === byId("#documentSignature").value) || null;
  const selectedPatientIds = () => [...docs.selectedIds];

  function mergedConfig(raw) {
    const input = raw && typeof raw === "object" ? raw : {};
    return {
      titulo: { ...defaults.titulo, ...(input.titulo || {}) },
      paciente: { ...defaults.paciente, ...(input.paciente || {}) },
      dni: { ...defaults.dni, ...(input.dni || {}) },
      edad: { ...defaults.edad, ...(input.edad || {}) },
      fecha: { ...defaults.fecha, ...(input.fecha || {}) },
      diagnostico: { ...defaults.diagnostico, ...(input.diagnostico || {}) },
      dosis: { ...defaults.dosis, ...(input.dosis || {}) },
      firma: { ...defaults.firma, ...(input.firma || {}) },
      firmante: { ...defaults.firmante, ...(input.firmante || {}) },
      fondo_url: input.fondo_url || "",
    };
  }

  function activeTemplate() {
    return docs.templates.find(item => String(item.id) === byId("#documentTemplate").value) || null;
  }

  function configFromControls() {
    const base = mergedConfig(activeTemplate()?.configuracion);
    return {
      ...base,
      titulo: { ...base.titulo, x: asNumber(byId("#coordTitleX").value, base.titulo.x), y: asNumber(byId("#coordTitleY").value, base.titulo.y) },
      paciente: { ...base.paciente, y: asNumber(byId("#coordPatientY").value, base.paciente.y) },
      dni: { ...base.dni, y: asNumber(byId("#coordDniY").value, base.dni.y) },
      diagnostico: { ...base.diagnostico, y: asNumber(byId("#coordDiagnosticY").value, base.diagnostico.y) },
      dosis: { ...base.dosis, y: asNumber(byId("#coordDoseY").value, base.dosis.y) },
      firma: { ...base.firma, x: asNumber(byId("#coordSignatureX").value, base.firma.x), y: asNumber(byId("#coordSignatureY").value, base.firma.y) },
      fondo_url: docs.letterheadUrl || base.fondo_url || "",
    };
  }

  function setControlValues(config) {
    const value = mergedConfig(config);
    byId("#coordTitleX").value = value.titulo.x;
    byId("#coordTitleY").value = value.titulo.y;
    byId("#coordPatientY").value = value.paciente.y;
    byId("#coordDniY").value = value.dni.y;
    byId("#coordDiagnosticY").value = value.diagnostico.y;
    byId("#coordDoseY").value = value.dosis.y;
    byId("#coordSignatureX").value = value.firma.x;
    byId("#coordSignatureY").value = value.firma.y;
    docs.letterheadUrl = value.fondo_url || "";
  }

  function clinicalText(patient) {
    const diagnosis = patient?.diagnostico || "Diagnóstico no registrado";
    const dose = [
      `Peso seco: ${patient?.peso_seco_kg ?? "—"} kg`,
      `Tiempo de diálisis: ${patient?.tiempo_dialisis_horas ?? "—"} horas`,
      `Qb: ${patient?.qb_ml_min ?? "—"}`, `Qd: ${patient?.qd_ml_min ?? "—"}`,
      `Filtro: ${patient?.filtro || "—"}`, `Membrana: ${patient?.membrana || "—"}`,
      `Acceso vascular: ${patient?.acceso_vascular || "—"}`, `Heparina: ${patient?.heparina_iu ?? "—"}`,
    ].join("\n");
    return { diagnosis, dose };
  }

  function renderPreview() {
    const container = byId("#documentPreview");
    const patient = docs.previewPatient;
    const config = configFromControls();
    const signature = currentSignature();
    if (!patient) {
      container.innerHTML = '<div class="doc-element doc-title" style="left:50%;top:8%;font-size:4%">EPICRISIS</div><div class="doc-element doc-copy" style="left:13%;top:18%">Selecciona un paciente para previsualizar los datos clínicos en la plantilla A4.</div>';
      return;
    }
    const info = clinicalText(patient);
    const date = byId("#documentDate").value || limaDate();
    const signatureHtml = signature?.archivo_url ? `<img class="doc-element doc-signature" style="left:${pctX(config.firma.x)};top:${pctY(config.firma.y)}" src="${escapeHtml(signature.archivo_url)}" alt="Firma de ${escapeHtml(signature.nombre_profesional)}" />` : "";
    const background = config.fondo_url ? `<img class="letterhead" src="${escapeHtml(config.fondo_url)}" alt="Fondo membretado" />` : "";
    container.innerHTML = `${background}
      <div class="doc-element doc-title" style="left:${pctX(config.titulo.x)};top:${pctY(config.titulo.y)};font-size:${Math.max(2.4, config.titulo.tamano / 4)}%">EPICRISIS</div>
      <div class="doc-element doc-copy" style="left:${pctX(config.paciente.x)};top:${pctY(config.paciente.y)}">PACIENTE: <strong>${escapeHtml(formatPatientName(patient))}</strong></div>
      <div class="doc-element doc-copy" style="left:${pctX(config.dni.x)};top:${pctY(config.dni.y)}">DNI: ${escapeHtml(patient.dni || "—")}</div>
      <div class="doc-element doc-copy" style="left:${pctX(config.edad.x)};top:${pctY(config.edad.y)}">EDAD: ${escapeHtml(patient.edad_anos ?? "—")} AÑOS</div>
      <div class="doc-element doc-copy" style="left:${pctX(config.fecha.x)};top:${pctY(config.fecha.y)}">FECHA: ${escapeHtml(date)}</div>
      <div class="doc-element doc-copy" style="left:${pctX(config.diagnostico.x)};top:${pctY(config.diagnostico.y)}">DIAGNÓSTICO: ${escapeHtml(info.diagnosis)}\n\nPaciente con antecedente de enfermedad renal crónica, en programa de diálisis ambulatoria crónica (hemodiálisis) tres veces a la semana.</div>
      <div class="doc-element doc-copy" style="left:${pctX(config.dosis.x)};top:${pctY(config.dosis.y)}"><strong>DOSIS DE DIÁLISIS:</strong>\n${escapeHtml(info.dose)}\n\n<strong>RESULTADOS DE LABORATORIO:</strong>\nPaciente ingresa, fecha posterior a toma de muestra.\n\nAtentamente.</div>
      ${signatureHtml}
      <div class="doc-element doc-signatory" style="left:${pctX(config.firmante.x)};top:${pctY(config.firmante.y)}">${escapeHtml(signature?.nombre_profesional || "Firma pendiente")}<br><span>${escapeHtml(signature?.cargo || "")}</span></div>`;
    byId("#documentPreviewLabel").textContent = `${formatPatientName(patient)} · vista previa`;
  }

  function renderPatientSelector() {
    const list = byId("#documentPatientList");
    byId("#documentPatientCount").textContent = `${docs.selectedIds.size} seleccionado${docs.selectedIds.size === 1 ? "" : "s"} de ${docs.patients.length}`;
    list.innerHTML = docs.patients.length ? docs.patients.map(patient => `<label class="document-patient-row"><input type="checkbox" data-document-patient="${patient.id}" ${docs.selectedIds.has(patient.id) ? "checked" : ""} /><div><strong>${escapeHtml(patient.nombre_completo)}</strong><span>DNI ${escapeHtml(patient.dni || "—")} · ${escapeHtml(patient.sede_nombre || "Sin sede")}</span></div></label>`).join("") : '<p class="empty">No se encontraron pacientes.</p>';
    document.querySelectorAll("[data-document-patient]").forEach(input => input.addEventListener("change", async () => {
      const id = Number(input.dataset.documentPatient);
      if (input.checked) docs.selectedIds.add(id); else docs.selectedIds.delete(id);
      if (input.checked && !docs.previewPatient) await loadPreviewPatient(id);
      if (!input.checked && docs.previewPatient?.id === id) await loadPreviewPatient(selectedPatientIds()[0]);
      renderPatientSelector(); renderPreview();
    }));
  }

  async function loadDocumentPatients() {
    const { data, error } = await sb.rpc("clinic_listar_pacientes", { p_busqueda: byId("#documentPatientSearch").value.trim(), p_limite: 200 });
    if (error) return setMessage("#documentMessage", error.message, true);
    docs.patients = data || [];
    renderPatientSelector();
  }

  async function loadPreviewPatient(id) {
    if (!id) { docs.previewPatient = null; renderPreview(); return; }
    const { data, error } = await sb.rpc("clinic_obtener_paciente", { p_paciente_id: Number(id) });
    if (error) return setMessage("#documentMessage", error.message, true);
    docs.previewPatient = data;
    renderPreview();
  }

  function renderTemplates() {
    const select = byId("#documentTemplate"), selected = select.value;
    select.innerHTML = docs.templates.map(template => `<option value="${template.id}">${escapeHtml(template.nombre)}</option>`).join("");
    if (docs.templates.some(item => String(item.id) === selected)) select.value = selected;
    const template = activeTemplate();
    if (template) setControlValues(template.configuracion);
  }

  async function loadTemplates() {
    const { data, error } = await sb.rpc("clinic_listar_plantillas_documento");
    if (error) return setMessage("#documentMessage", error.message, true);
    docs.templates = data || [];
    renderTemplates(); renderPreview();
  }

  function renderSignatures() {
    const select = byId("#documentSignature"), selected = select.value;
    select.innerHTML = `<option value="">Sin firma cargada</option>${docs.signatures.map(signature => `<option value="${signature.id}">${escapeHtml(signature.nombre_profesional)}${signature.cargo ? ` · ${escapeHtml(signature.cargo)}` : ""}</option>`).join("")}`;
    if (docs.signatures.some(item => String(item.id) === selected)) select.value = selected;
    byId("#signatureList").innerHTML = docs.signatures.length ? docs.signatures.map(signature => `<article class="signature-item"><div><strong>${escapeHtml(signature.nombre_profesional)}</strong><span>${escapeHtml(signature.cargo || "Sin cargo")}</span></div>${signature.archivo_url ? `<img src="${escapeHtml(signature.archivo_url)}" alt="Firma cargada" />` : ""}</article>`).join("") : '<p class="empty">Aún no hay firmas cargadas.</p>';
  }

  async function loadSignatures() {
    const { data, error } = await sb.rpc("clinic_listar_firmas_profesionales");
    if (error) return setMessage("#documentMessage", error.message, true);
    docs.signatures = data || [];
    renderSignatures(); renderPreview();
  }

  async function uploadImage(file, folder) {
    if (!file || !["image/png", "image/jpeg"].includes(file.type)) throw new Error("Selecciona una imagen PNG o JPG.");
    if (file.size > 5 * 1024 * 1024) throw new Error("La imagen supera el límite de 5 MB.");
    const extension = file.name.toLowerCase().endsWith(".png") ? "png" : "jpg";
    const path = `${folder}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const { error } = await sb.storage.from("clinic-documentos").upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    const { data } = sb.storage.from("clinic-documentos").getPublicUrl(path);
    return data.publicUrl;
  }

  async function saveTemplate() {
    try {
      const file = byId("#letterheadFile").files[0];
      if (file) docs.letterheadUrl = await uploadImage(file, "fondos");
      const template = activeTemplate();
      const { data, error } = await sb.rpc("clinic_guardar_plantilla_documento", {
        p_codigo: template?.codigo || "epicrisis_estandar",
        p_nombre: template?.nombre || "Epicrisis A4 estándar",
        p_tipo_documento: byId("#documentType").value,
        p_configuracion: configFromControls(),
      });
      if (error) return setMessage("#documentMessage", error.message, true);
      setMessage("#documentMessage", `Plantilla ${data.nombre} guardada.`);
      await loadTemplates();
    } catch (error) { setMessage("#documentMessage", error.message || "No se pudo guardar la plantilla.", true); }
  }

  async function submitSignature(event) {
    event.preventDefault();
    try {
      const file = byId("#signatureFile").files[0];
      const url = await uploadImage(file, "firmas");
      const { error } = await sb.rpc("clinic_guardar_firma_profesional", {
        p_nombre_profesional: byId("#signatureName").value.trim(),
        p_cargo: byId("#signatureRole").value.trim() || null,
        p_archivo_url: url,
        p_archivo_nombre: file.name,
      });
      if (error) return setMessage("#documentMessage", error.message, true);
      byId("#signatureForm").reset();
      setMessage("#documentMessage", "Firma cargada y disponible para la epicrisis.");
      await loadSignatures();
    } catch (error) { setMessage("#documentMessage", error.message || "No se pudo cargar la firma.", true); }
  }

  function imageFormat(dataUrl) {
    return /^data:image\/png/i.test(dataUrl || "") ? "PNG" : "JPEG";
  }

  async function urlToDataUrl(url) {
    if (!url) return null;
    const response = await fetch(url);
    if (!response.ok) throw new Error("No se pudo cargar una imagen para el PDF.");
    const blob = await response.blob();
    return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob); });
  }

  function drawEpicrisis(pdf, patient, config, signature, backgroundData, signatureData) {
    const info = clinicalText(patient), date = byId("#documentDate").value || limaDate();
    if (backgroundData) pdf.addImage(backgroundData, imageFormat(backgroundData), 0, 0, A4_WIDTH, A4_HEIGHT);
    pdf.setTextColor(20, 35, 48); pdf.setFont("helvetica", "bold"); pdf.setFontSize(config.titulo.tamano);
    pdf.text("EPICRISIS", config.titulo.x, config.titulo.y, { align: "center" });
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(config.paciente.tamano);
    pdf.text(`PACIENTE: ${formatPatientName(patient)}`, config.paciente.x, config.paciente.y);
    pdf.text(`DNI: ${patient.dni || "—"}`, config.dni.x, config.dni.y);
    pdf.text(`EDAD: ${patient.edad_anos ?? "—"} AÑOS`, config.edad.x, config.edad.y);
    pdf.text(`FECHA: ${date}`, config.fecha.x, config.fecha.y);
    const diagnosis = pdf.splitTextToSize(`DIAGNÓSTICO: ${info.diagnosis}\n\nPaciente con antecedente de enfermedad renal crónica, en programa de diálisis ambulatoria crónica (hemodiálisis) tres veces a la semana.`, 152);
    pdf.text(diagnosis, config.diagnostico.x, config.diagnostico.y);
    const dose = pdf.splitTextToSize(`DOSIS DE DIÁLISIS:\n${info.dose}\n\nRESULTADOS DE LABORATORIO:\nPaciente ingresa, fecha posterior a toma de muestra.\n\nAtentamente.`, 152);
    pdf.text(dose, config.dosis.x, config.dosis.y);
    if (signatureData) pdf.addImage(signatureData, imageFormat(signatureData), config.firma.x, config.firma.y, config.firma.ancho, config.firma.alto);
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(config.firmante.tamano);
    pdf.text(signature?.nombre_profesional || "Firma pendiente", config.firmante.x, config.firmante.y, { align: "center", maxWidth: 60 });
    if (signature?.cargo) { pdf.setFont("helvetica", "normal"); pdf.text(signature.cargo, config.firmante.x, config.firmante.y + 5, { align: "center", maxWidth: 60 }); }
  }

  async function generateEpicrisisPdf() {
    try {
      const ids = selectedPatientIds();
      if (!ids.length) return setMessage("#documentMessage", "Selecciona al menos un paciente.", true);
      if (ids.length > 100) return setMessage("#documentMessage", "Selecciona como máximo 100 pacientes por generación.", true);
      if (!window.jspdf?.jsPDF) throw new Error("No se pudo cargar el generador PDF. Verifica tu conexión e inténtalo nuevamente.");
      const template = activeTemplate();
      if (!template) return setMessage("#documentMessage", "Selecciona una plantilla.", true);
      const signature = currentSignature(), config = configFromControls();
      const [backgroundData, signatureData, patients] = await Promise.all([
        urlToDataUrl(config.fondo_url).catch(() => null),
        urlToDataUrl(signature?.archivo_url).catch(() => null),
        Promise.all(ids.map(async id => { const { data, error } = await sb.rpc("clinic_obtener_paciente", { p_paciente_id: id }); if (error) throw error; return data; })),
      ]);
      const pdf = new window.jspdf.jsPDF({ orientation: "p", unit: "mm", format: "a4" });
      patients.forEach((patient, index) => { if (index) pdf.addPage("a4", "p"); drawEpicrisis(pdf, patient, config, signature, backgroundData, signatureData); });
      const filename = `epicrisis-${byId("#documentDate").value || limaDate()}-${patients.length}-pacientes.pdf`;
      const { error } = await sb.rpc("clinic_registrar_documentos_generados", {
        p_pacientes_ids: ids,
        p_plantilla_id: Number(template.id),
        p_tipo_documento: byId("#documentType").value,
        p_firmante_nombre: signature?.nombre_profesional || null,
        p_firmante_cargo: signature?.cargo || null,
        p_metadata: { archivo_nombre: filename, generado_en_navegador: true, fondo_url: config.fondo_url || null },
      });
      if (error) return setMessage("#documentMessage", `El PDF se preparó, pero no se registró el historial: ${error.message}`, true);
      pdf.save(filename);
      setMessage("#documentMessage", `${patients.length} epicrisis generada(s). Revisa el PDF y la firma profesional antes de utilizarlo.`);
      if (docs.previewPatient) await loadPreviewPatient(docs.previewPatient.id);
    } catch (error) { setMessage("#documentMessage", error.message || "No se pudo generar el PDF.", true); }
  }

  function bindEvents() {
    byId("#documentTemplate").addEventListener("change", () => { const template = activeTemplate(); if (template) setControlValues(template.configuracion); renderPreview(); });
    byId("#documentSignature").addEventListener("change", renderPreview);
    byId("#documentDate").addEventListener("change", renderPreview);
    ["#coordTitleX", "#coordTitleY", "#coordPatientY", "#coordDniY", "#coordDiagnosticY", "#coordDoseY", "#coordSignatureX", "#coordSignatureY"].forEach(selector => byId(selector).addEventListener("input", renderPreview));
    byId("#saveDocumentTemplate").addEventListener("click", saveTemplate);
    byId("#signatureForm").addEventListener("submit", submitSignature);
    byId("#searchDocumentPatients").addEventListener("click", loadDocumentPatients);
    byId("#documentPatientSearch").addEventListener("keydown", event => { if (event.key === "Enter") { event.preventDefault(); loadDocumentPatients(); } });
    byId("#selectAllDocumentPatients").addEventListener("click", async () => { docs.patients.forEach(patient => docs.selectedIds.add(patient.id)); if (!docs.previewPatient && docs.patients[0]) await loadPreviewPatient(docs.patients[0].id); renderPatientSelector(); renderPreview(); });
    byId("#clearDocumentPatients").addEventListener("click", () => { docs.selectedIds.clear(); docs.previewPatient = null; renderPatientSelector(); renderPreview(); });
    byId("#generateEpicrisisPdf").addEventListener("click", generateEpicrisisPdf);
  }

  async function initDocuments() {
    byId("#documentDate").value = limaDate();
    bindEvents();
    await Promise.all([loadTemplates(), loadSignatures(), loadDocumentPatients()]);
    renderPreview();
  }

  initDocuments();
})();
