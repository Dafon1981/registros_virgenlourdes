(() => {
  const api = window.TurnosApp;
  if (!api?.sb || !document.querySelector("#documentos")) return;

  const { sb, $, state, escapeHtml, setMessage, limaDate } = api;
  const docs = state.documents;
  const A4_WIDTH = 210, A4_HEIGHT = 297;
  const defaults = {
    titulo: { x: 105, y: 24, tamano: 16, ancho: 154, alineacion: "center", justificado: false, texto: "EPICRISIS" },
    paciente: { x: 28, y: 45, tamano: 10, ancho: 154, alineacion: "left", justificado: false, texto: "PACIENTE: {{paciente}}" },
    dni: { x: 28, y: 52, tamano: 10, ancho: 72, alineacion: "left", justificado: false, texto: "DNI: {{dni}}" },
    edad: { x: 130, y: 52, tamano: 10, ancho: 52, alineacion: "left", justificado: false, texto: "EDAD: {{edad}} AÑOS" },
    fecha: { x: 28, y: 59, tamano: 10, ancho: 80, alineacion: "left", justificado: false, texto: "FECHA: {{fecha}}" },
    diagnostico: { x: 28, y: 70, tamano: 10, ancho: 152, alineacion: "left", justificado: true, texto: "DIAGNÓSTICO: {{diagnostico}}\n\nPaciente con antecedente de enfermedad renal crónica, en programa de diálisis ambulatoria crónica (hemodiálisis) tres veces a la semana." },
    dosis: { x: 28, y: 118, tamano: 10, ancho: 152, alineacion: "left", justificado: true, texto: "DOSIS DE DIÁLISIS:\n{{dosis}}\n\nRESULTADOS DE LABORATORIO:\nPaciente ingresa, fecha posterior a toma de muestra.\n\nAtentamente." },
    firma: { x: 150, y: 245, ancho: 38, alto: 22, alineacion: "left", justificado: false, texto: "Firma pendiente" },
    firmante: { x: 168, y: 273, tamano: 9, ancho: 60, alineacion: "center", justificado: false, texto: "{{firmante}}\n{{cargo}}" },
    fondo_url: "",
  };
  const editableBlocks = ["titulo", "paciente", "dni", "edad", "fecha", "diagnostico", "dosis", "firma", "firmante"];
  const clone = value => JSON.parse(JSON.stringify(value));
  const byId = id => $(id);
  const asNumber = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const pctX = mm => `${(clamp(asNumber(mm, 0), 0, A4_WIDTH) / A4_WIDTH) * 100}%`;
  const pctY = mm => `${(clamp(asNumber(mm, 0), 0, A4_HEIGHT) / A4_HEIGHT) * 100}%`;
  const formatPatientName = patient => patient?.nombre_completo || patient?.nombres || "Paciente sin nombre";
  const currentSignature = () => docs.signatures.find(item => String(item.id) === byId("#documentSignature").value) || null;
  const selectedPatientIds = () => [...docs.selectedIds];

  function mergedConfig(raw) {
    const input = raw && typeof raw === "object" ? raw : {};
    const block = key => ({ ...defaults[key], ...(input[key] || {}) });
    return {
      titulo: block("titulo"), paciente: block("paciente"), dni: block("dni"), edad: block("edad"), fecha: block("fecha"),
      diagnostico: block("diagnostico"), dosis: block("dosis"), firma: block("firma"), firmante: block("firmante"),
      fondo_url: input.fondo_url || "",
    };
  }

  function activeTemplate() {
    return docs.templates.find(item => String(item.id) === byId("#documentTemplate").value) || null;
  }

  function workingConfig() {
    if (!docs.workingConfig) docs.workingConfig = mergedConfig(activeTemplate()?.configuracion);
    return docs.workingConfig;
  }

  function syncCoordinateInputs(config = workingConfig()) {
    byId("#coordTitleX").value = config.titulo.x;
    byId("#coordTitleY").value = config.titulo.y;
    byId("#coordPatientY").value = config.paciente.y;
    byId("#coordDniY").value = config.dni.y;
    byId("#coordDiagnosticY").value = config.diagnostico.y;
    byId("#coordDoseY").value = config.dosis.y;
    byId("#coordSignatureX").value = config.firma.x;
    byId("#coordSignatureY").value = config.firma.y;
  }

  function syncBlockInspector() {
    const config = workingConfig();
    const key = editableBlocks.includes(docs.activeBlock) ? docs.activeBlock : "titulo";
    const block = config[key];
    byId("#documentActiveBlock").value = key;
    byId("#documentBlockAlign").value = block.alineacion || "left";
    byId("#documentBlockJustify").checked = Boolean(block.justificado);
    const textInput = byId("#documentBlockText");
    const fontInput = byId("#documentBlockFontSize");
    const applyButton = byId("#applyDocumentBlockText");
    const visibilityButton = byId("#toggleDocumentBlockVisibility");
    const isImageSignature = key === "firma" && Boolean(currentSignature()?.archivo_url);
    textInput.value = block.texto || defaults[key]?.texto || "";
    textInput.disabled = isImageSignature;
    fontInput.value = block.tamano || defaults[key]?.tamano || 10;
    fontInput.disabled = isImageSignature;
    applyButton.disabled = isImageSignature;
    visibilityButton.textContent = block.oculto ? "Restaurar bloque" : "Eliminar del documento";
    visibilityButton.setAttribute("aria-pressed", String(Boolean(block.oculto)));
    syncCoordinateInputs(config);
  }

  function setControlValues(config) {
    docs.workingConfig = mergedConfig(config);
    docs.letterheadUrl = docs.workingConfig.fondo_url || "";
    docs.activeBlock = docs.activeBlock || "titulo";
    syncBlockInspector();
  }

  function readCoordinatesIntoConfig() {
    const config = workingConfig();
    config.titulo.x = asNumber(byId("#coordTitleX").value, config.titulo.x);
    config.titulo.y = asNumber(byId("#coordTitleY").value, config.titulo.y);
    config.paciente.y = asNumber(byId("#coordPatientY").value, config.paciente.y);
    config.dni.y = asNumber(byId("#coordDniY").value, config.dni.y);
    config.diagnostico.y = asNumber(byId("#coordDiagnosticY").value, config.diagnostico.y);
    config.dosis.y = asNumber(byId("#coordDoseY").value, config.dosis.y);
    config.firma.x = asNumber(byId("#coordSignatureX").value, config.firma.x);
    config.firma.y = asNumber(byId("#coordSignatureY").value, config.firma.y);
    return config;
  }

  function configFromControls() {
    const config = readCoordinatesIntoConfig();
    config.fondo_url = docs.letterheadUrl || config.fondo_url || "";
    return clone(config);
  }

  function clinicalText(patient) {
    const diagnosis = patient?.diagnostico || "Diagnóstico no registrado";
    const dose = [
      `Peso seco: ${patient?.peso_seco_kg ?? "—"} kg`,
      `Tiempo de diálisis: ${patient?.tiempo_dialisis_horas ?? 3.5} horas`,
      `Qb: ${patient?.qb_ml_min ?? "—"}`, `Qd: ${patient?.qd_ml_min ?? "—"}`,
      `Filtro: ${patient?.filtro || "—"}`, `Membrana: ${patient?.membrana || "—"}`,
      `Acceso vascular: ${patient?.acceso_vascular || "—"}`, `Heparina: ${patient?.heparina_iu ?? "—"}`,
    ].join("\n");
    return { diagnosis, dose };
  }

  function transformFor(block) {
    if (block.alineacion === "center") return "translateX(-50%)";
    if (block.alineacion === "right") return "translateX(-100%)";
    return "none";
  }

  function blockStyle(block, extra = "") {
    return `left:${pctX(block.x)};top:${pctY(block.y)};width:${pctX(block.ancho || 60)};text-align:${block.alineacion || "left"};transform:${transformFor(block)};${extra}`;
  }

  function gridSnapPosition(value, maximum) {
    const increment = asNumber(byId("#documentGridSnap")?.value, 1);
    const snapped = increment > 0 ? Math.round(value / increment) * increment : value;
    return clamp(Number(snapped.toFixed(1)), 0, maximum);
  }

  function horizontalAnchor(position, block) {
    if (position === "center") return A4_WIDTH / 2;
    if (position === "right") return A4_WIDTH - 12;
    return 12;
  }

  function previewFontSize(block, fallback = 10) {
    return `${Math.max(1.4, asNumber(block.tamano, fallback) / 4)}%`;
  }

  function textValues(patient, info, date, signature) {
    return {
      paciente: formatPatientName(patient),
      dni: patient?.dni || "—",
      edad: patient?.edad_anos ?? "—",
      fecha: date,
      diagnostico: info?.diagnosis || "Diagnóstico no registrado",
      dosis: info?.dose || "—",
      firmante: signature?.nombre_profesional || "Firma pendiente",
      cargo: signature?.cargo || "",
    };
  }

  function resolveBlockText(key, block, values) {
    const fallback = defaults[key]?.texto || "";
    return String(block.texto || fallback).replace(/\{\{(paciente|dni|edad|fecha|diagnostico|dosis|firmante|cargo)\}\}/g, (_, token) => String(values[token] ?? ""));
  }

  function blockHtml(key, className, block, content, options = {}) {
    if (block.oculto) return "";
    const selected = docs.activeBlock === key ? " is-selected" : "";
    const justified = block.justificado ? " is-justified" : "";
    return `<div class="doc-element ${className}${selected}${justified}" data-document-block="${key}" style="${blockStyle(block, options.extra || "")}">${content}</div>`;
  }

  function selectBlock(key, render = true) {
    if (!editableBlocks.includes(key)) return;
    docs.activeBlock = key;
    syncBlockInspector();
    if (render) renderPreview();
    else document.querySelectorAll("[data-document-block]").forEach(element => element.classList.toggle("is-selected", element.dataset.documentBlock === key));
  }

  function bindPreviewBlocks() {
    const container = byId("#documentPreview");
    container.querySelectorAll("[data-document-block]").forEach(element => {
      element.addEventListener("click", () => selectBlock(element.dataset.documentBlock, false));
      element.addEventListener("pointerdown", event => {
        event.preventDefault();
        const key = element.dataset.documentBlock;
        selectBlock(key, false);
        const config = workingConfig();
        const block = config[key];
        const rect = container.getBoundingClientRect();
        const move = pointer => {
          const x = ((pointer.clientX - rect.left) / rect.width) * A4_WIDTH;
          const y = ((pointer.clientY - rect.top) / rect.height) * A4_HEIGHT;
          block.x = gridSnapPosition(x, A4_WIDTH);
          block.y = gridSnapPosition(y, A4_HEIGHT);
          element.style.left = pctX(block.x);
          element.style.top = pctY(block.y);
        };
        const stop = () => {
          document.removeEventListener("pointermove", move);
          document.removeEventListener("pointerup", stop);
          syncBlockInspector();
          renderPreview();
        };
        document.addEventListener("pointermove", move);
        document.addEventListener("pointerup", stop, { once: true });
      });
    });
  }

  function renderPreview() {
    const container = byId("#documentPreview");
    const patient = docs.previewPatient;
    const config = configFromControls();
    const signature = currentSignature();
    if (!patient) {
      container.innerHTML = '<div class="doc-element doc-title" style="left:50%;top:8%;font-size:4%;width:70%;text-align:center;transform:translateX(-50%)">EPICRISIS</div><div class="doc-element doc-copy" style="left:13%;top:18%;width:72%">Selecciona un paciente para previsualizar y mover los bloques de la hoja A4.</div>';
      return;
    }
    const info = clinicalText(patient);
    const date = byId("#documentDate").value || limaDate();
    const background = config.fondo_url ? `<img class="letterhead" src="${escapeHtml(config.fondo_url)}" alt="Fondo membretado" />` : "";
    const values = textValues(patient, info, date, signature);
    const textBlock = (key, className, block) => blockHtml(key, className, block, escapeHtml(resolveBlockText(key, block, values)), { extra: `font-size:${previewFontSize(block)}` });
    const title = textBlock("titulo", "doc-title", config.titulo);
    const patientBlock = textBlock("paciente", "doc-copy", config.paciente);
    const dni = textBlock("dni", "doc-copy", config.dni);
    const edad = textBlock("edad", "doc-copy", config.edad);
    const fecha = textBlock("fecha", "doc-copy", config.fecha);
    const diagnostic = textBlock("diagnostico", "doc-copy", config.diagnostico);
    const dose = textBlock("dosis", "doc-copy", config.dosis);
    const signatureHtml = config.firma.oculto ? "" : signature?.archivo_url ? `<img class="doc-element doc-signature${docs.activeBlock === "firma" ? " is-selected" : ""}" data-document-block="firma" style="${blockStyle(config.firma, `height:${pctY(config.firma.alto)};object-fit:contain`)}" src="${escapeHtml(signature.archivo_url)}" alt="Firma de ${escapeHtml(signature.nombre_profesional)}" />` : textBlock("firma", "doc-copy", config.firma);
    const signer = textBlock("firmante", "doc-signatory", config.firmante);
    container.innerHTML = `${background}${title}${patientBlock}${dni}${edad}${fecha}${diagnostic}${dose}${signatureHtml}${signer}`;
    byId("#documentPreviewLabel").textContent = `${formatPatientName(patient)} · bloque activo: ${docs.activeBlock || "titulo"}`;
    bindPreviewBlocks();
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
      const config = configFromControls();
      const { data, error } = await sb.rpc("clinic_guardar_plantilla_documento", {
        p_codigo: template?.codigo || "epicrisis_estandar",
        p_nombre: template?.nombre || "Epicrisis A4 estándar",
        p_tipo_documento: byId("#documentType").value,
        p_configuracion: config,
      });
      if (error) return setMessage("#documentMessage", error.message, true);
      docs.workingConfig = config;
      setMessage("#documentMessage", `Plantilla ${data.nombre} guardada con las posiciones de los bloques.`);
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

  function pdfText(pdf, text, block, bold = false) {
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setFontSize(block.tamano || 10);
    const lines = pdf.splitTextToSize(text, block.ancho || 152);
    pdf.text(lines, block.x, block.y, { align: block.justificado ? "justify" : (block.alineacion || "left"), maxWidth: block.ancho || 152 });
  }

  function drawEpicrisis(pdf, patient, config, signature, backgroundData, signatureData) {
    const info = clinicalText(patient), date = byId("#documentDate").value || limaDate();
    const values = textValues(patient, info, date, signature);
    const text = key => resolveBlockText(key, config[key], values);
    if (backgroundData) pdf.addImage(backgroundData, imageFormat(backgroundData), 0, 0, A4_WIDTH, A4_HEIGHT);
    if (!config.titulo.oculto) pdfText(pdf, text("titulo"), config.titulo, true);
    if (!config.paciente.oculto) pdfText(pdf, text("paciente"), config.paciente);
    if (!config.dni.oculto) pdfText(pdf, text("dni"), config.dni);
    if (!config.edad.oculto) pdfText(pdf, text("edad"), config.edad);
    if (!config.fecha.oculto) pdfText(pdf, text("fecha"), config.fecha);
    if (!config.diagnostico.oculto) pdfText(pdf, text("diagnostico"), config.diagnostico);
    if (!config.dosis.oculto) pdfText(pdf, text("dosis"), config.dosis, true);
    if (!config.firma.oculto && signatureData) pdf.addImage(signatureData, imageFormat(signatureData), config.firma.x, config.firma.y, config.firma.ancho, config.firma.alto);
    else if (!config.firma.oculto) pdfText(pdf, text("firma"), config.firma);
    if (!config.firmante.oculto) pdfText(pdf, text("firmante"), config.firmante, true);
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
        p_pacientes_ids: ids, p_plantilla_id: Number(template.id), p_tipo_documento: byId("#documentType").value,
        p_firmante_nombre: signature?.nombre_profesional || null, p_firmante_cargo: signature?.cargo || null,
        p_metadata: { archivo_nombre: filename, generado_en_navegador: true, fondo_url: config.fondo_url || null, configuracion_a4: config },
      });
      if (error) return setMessage("#documentMessage", `El PDF se preparó, pero no se registró el historial: ${error.message}`, true);
      pdf.save(filename);
      setMessage("#documentMessage", `${patients.length} epicrisis generada(s). Revisa el PDF y la firma profesional antes de utilizarlo.`);
      if (docs.previewPatient) await loadPreviewPatient(docs.previewPatient.id);
    } catch (error) { setMessage("#documentMessage", error.message || "No se pudo generar el PDF.", true); }
  }

  function updateActiveBlockFormat() {
    const config = workingConfig();
    const block = config[docs.activeBlock];
    if (!block) return;
    block.alineacion = byId("#documentBlockAlign").value;
    block.justificado = byId("#documentBlockJustify").checked;
    renderPreview();
  }

  function alignActiveBlock(position) {
    const config = workingConfig();
    const block = config[docs.activeBlock];
    if (!block || !["left", "center", "right"].includes(position)) return;
    block.alineacion = position;
    block.x = gridSnapPosition(horizontalAnchor(position, block), A4_WIDTH);
    syncBlockInspector();
    renderPreview();
    const label = position === "left" ? "izquierda" : position === "center" ? "centro" : "derecha";
    setMessage("#documentMessage", `Bloque alineado a la ${label} de la hoja.`);
  }

  function applyActiveBlockText() {
    const config = workingConfig();
    const key = docs.activeBlock;
    const block = config[key];
    if (!block) return;
    if (key === "firma" && currentSignature()?.archivo_url) return setMessage("#documentMessage", "La imagen de firma cargada reemplaza el texto del bloque Firma.", true);
    const text = byId("#documentBlockText").value.trim();
    if (!text) return setMessage("#documentMessage", "El texto del bloque no puede quedar vacío.", true);
    block.texto = text;
    block.tamano = clamp(asNumber(byId("#documentBlockFontSize").value, block.tamano || 10), 6, 30);
    syncBlockInspector();
    renderPreview();
    setMessage("#documentMessage", `Texto y tamaño del bloque ${byId("#documentActiveBlock").selectedOptions[0].textContent.toLowerCase()} actualizados. Guarda la plantilla para reutilizarlos.`);
  }

  function toggleActiveBlockVisibility() {
    const config = workingConfig();
    const key = docs.activeBlock;
    const block = config[key];
    if (!block) return;
    block.oculto = !block.oculto;
    syncBlockInspector();
    renderPreview();
    const action = block.oculto ? "eliminado del documento" : "restaurado en el documento";
    setMessage("#documentMessage", `El bloque ${byId("#documentActiveBlock").selectedOptions[0].textContent.toLowerCase()} fue ${action}. Los datos del paciente no se eliminaron.`);
  }

  function bindEvents() {
    byId("#documentTemplate").addEventListener("change", () => { const template = activeTemplate(); if (template) setControlValues(template.configuracion); renderPreview(); });
    byId("#documentSignature").addEventListener("change", () => { syncBlockInspector(); renderPreview(); });
    byId("#documentDate").addEventListener("change", renderPreview);
    ["#coordTitleX", "#coordTitleY", "#coordPatientY", "#coordDniY", "#coordDiagnosticY", "#coordDoseY", "#coordSignatureX", "#coordSignatureY"].forEach(selector => byId(selector).addEventListener("input", () => { readCoordinatesIntoConfig(); renderPreview(); }));
    byId("#documentActiveBlock").addEventListener("change", event => selectBlock(event.target.value));
    byId("#documentBlockAlign").addEventListener("change", updateActiveBlockFormat);
    byId("#documentBlockJustify").addEventListener("change", updateActiveBlockFormat);
    byId("#applyDocumentBlockText").addEventListener("click", applyActiveBlockText);
    byId("#toggleDocumentBlockVisibility").addEventListener("click", toggleActiveBlockVisibility);
    document.querySelectorAll("[data-document-position]").forEach(button => button.addEventListener("click", () => alignActiveBlock(button.dataset.documentPosition)));
    byId("#saveDocumentTemplate").addEventListener("click", saveTemplate);
    byId("#signatureForm").addEventListener("submit", submitSignature);
    byId("#searchDocumentPatients").addEventListener("click", loadDocumentPatients);
    byId("#documentPatientSearch").addEventListener("keydown", event => { if (event.key === "Enter") { event.preventDefault(); loadDocumentPatients(); } });
    byId("#selectAllDocumentPatients").addEventListener("click", async () => { docs.patients.forEach(patient => docs.selectedIds.add(patient.id)); if (!docs.previewPatient && docs.patients[0]) await loadPreviewPatient(docs.patients[0].id); renderPatientSelector(); renderPreview(); });
    byId("#clearDocumentPatients").addEventListener("click", () => { docs.selectedIds.clear(); docs.previewPatient = null; renderPatientSelector(); renderPreview(); });
    byId("#generateEpicrisisPdf").addEventListener("click", generateEpicrisisPdf);
  }

  async function initDocuments() {
    docs.activeBlock = docs.activeBlock || "titulo";
    byId("#documentDate").value = limaDate();
    bindEvents();
    await Promise.all([loadTemplates(), loadSignatures(), loadDocumentPatients()]);
    renderPreview();
  }

  initDocuments();
})();
