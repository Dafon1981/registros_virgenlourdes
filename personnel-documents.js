(() => {
  const api = window.TurnosApp;
  if (!api?.sb || !document.querySelector("#personnelDocumentBody")) return;

  const { sb, $, escapeHtml, setMessage, limaDate } = api;
  const state = { rows: [], profiles: new Map(), periods: [], selectedPeriods: new Set() };
  const fullName = row => [row.apellido_paterno, row.apellido_materno, row.nombres].filter(Boolean).join(" ") || row.nombre_completo || "Sin nombre";
  const monthValue = value => /^\d{4}-\d{2}$/.test(String(value || "")) ? value : limaDate().slice(0, 7);
  const periodDate = value => `${monthValue(value)}-01`;
  const selectedPeriods = () => state.periods.filter(value => state.selectedPeriods.has(value));
  const selectedPeriod = () => periodDate(selectedPeriods()[0] || monthValue($("#personnelDocumentPeriod").value));
  const formatTime = value => value ? new Intl.DateTimeFormat("es-PE", { hour: "2-digit", minute: "2-digit", timeZone: "America/Lima" }).format(new Date(value)) : "—";
  const formatPeriod = value => new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${monthValue(value)}-01T12:00:00Z`)).replace(/^./, letter => letter.toUpperCase());
  const personById = id => state.rows.find(item => Number(item.personal_id) === Number(id)) || state.profiles.get(Number(id));

  function renderPeriodSelector() {
    const container = $("#personnelDocumentPeriods");
    container.innerHTML = state.periods.length ? state.periods.map(period => `<div class="personnel-period-chip"><label><input type="checkbox" data-personnel-period="${period}" ${state.selectedPeriods.has(period) ? "checked" : ""} /><span>${escapeHtml(formatPeriod(period))}</span></label><button class="personnel-period-remove" data-remove-personnel-period="${period}" type="button" aria-label="Quitar ${escapeHtml(formatPeriod(period))}">×</button></div>`).join("") : '<span class="muted">Aún no hay meses seleccionados.</span>';
    document.querySelectorAll("[data-personnel-period]").forEach(input => input.addEventListener("change", async () => {
      const period = input.dataset.personnelPeriod;
      if (input.checked) state.selectedPeriods.add(period);
      else if (selectedPeriods().length > 1) state.selectedPeriods.delete(period);
      else { input.checked = true; return setMessage("#personnelDocumentMessage", "Mantén al menos un mes seleccionado o quítalo con el botón ×.", true); }
      renderPeriodSelector();
      await loadDailyDocuments();
    }));
    document.querySelectorAll("[data-remove-personnel-period]").forEach(button => button.addEventListener("click", async () => {
      const period = button.dataset.removePersonnelPeriod;
      state.periods = state.periods.filter(item => item !== period);
      state.selectedPeriods.delete(period);
      renderPeriodSelector();
      if (!selectedPeriods().length) {
        state.rows = [];
        renderRows();
        return setMessage("#personnelDocumentMessage", "Añade al menos un mes para cargar los contratos.", true);
      }
      await loadDailyDocuments();
    }));
  }

  function addPeriod() {
    const period = monthValue($("#personnelDocumentPeriod").value);
    if (!state.periods.includes(period)) state.periods.push(period);
    state.periods.sort();
    state.selectedPeriods.add(period);
    renderPeriodSelector();
    loadDailyDocuments();
  }

  function renderRows() {
    const body = $("#personnelDocumentBody");
    const monthTotal = selectedPeriods().length;
    $("#personnelDocumentCount").textContent = `${state.rows.length} integrante${state.rows.length === 1 ? "" : "s"} · ${monthTotal} mes${monthTotal === 1 ? "" : "es"} seleccionado${monthTotal === 1 ? "" : "s"}`;
    body.innerHTML = state.rows.length ? state.rows.map(row => {
      const signed = row.estado_documento === "firmado";
      const attendance = row.presente ? `<span class="contract-presence present">Presente · ${formatTime(row.hora_asistencia)}</span>` : `<span class="contract-presence">Sin asistencia registrada</span>`;
      return `<tr data-personnel-row="${row.personal_id}"><td><input class="contract-check" type="checkbox" data-contract-person="${row.personal_id}" ${signed ? "checked" : ""} aria-label="Marcar contrato firmado de ${escapeHtml(fullName(row))}" /></td><td><strong>${escapeHtml(fullName(row))}</strong>${row.es_fijo ? '<br><span class="muted">Equipo fijo L–S</span>' : ""}</td><td>${escapeHtml(row.rol || "Personal")}</td><td>${attendance}</td><td><span class="contract-status ${signed ? "firmado" : ""}">${signed ? "Firmado" : "Pendiente"}</span></td><td>${signed ? formatTime(row.firmado_en) : "—"}</td></tr>`;
    }).join("") : '<tr><td colspan="6" class="empty">No hay personal programado ni fijo para esta fecha.</td></tr>';

    document.querySelectorAll("[data-contract-person]").forEach(input => input.addEventListener("click", event => {
      event.preventDefault();
      updateContractPeriods(input, !input.checked);
    }));
    document.querySelectorAll("[data-personnel-row]").forEach(row => row.addEventListener("click", event => {
      if (event.target.matches("input")) return;
      loadProfile(Number(row.dataset.personnelRow));
    }));
  }

  async function updateContractPeriods(input, nextFirmado) {
    const personalId = Number(input.dataset.contractPerson);
    const firmado = Boolean(nextFirmado);
    const periods = selectedPeriods();
    if (!periods.length) { input.checked = !firmado; return setMessage("#personnelDocumentMessage", "Selecciona al menos un mes de contrato.", true); }
    const previousRows = state.rows.map(row => ({ ...row }));
    const firmadoEn = firmado ? new Date().toISOString() : null;
    state.rows = state.rows.map(row => Number(row.personal_id) === personalId ? { ...row, estado_documento: firmado ? "firmado" : "pendiente", firmado_en: firmadoEn } : row);
    renderRows();
    setMessage("#personnelDocumentMessage", firmado ? `Guardando firma y hora de marcación en ${periods.length} mes(es)…` : `Actualizando ${periods.length} contrato(s)…`);
    const { data, error } = await sb.rpc("clinic_actualizar_documentos_personal_multiperiodo", {
      p_personal_id: personalId,
      p_tipo_documento: $("#personnelDocumentType").value,
      p_periodos: periods.map(periodDate),
      p_firmado: firmado,
      p_fecha_referencia: $("#personnelDocumentDate").value,
      p_observacion: null,
    });
    if (error) {
      state.rows = previousRows;
      renderRows();
      return setMessage("#personnelDocumentMessage", `No se guardó la firma: ${error.message}`, true);
    }
    if (!Array.isArray(data) || data.length !== periods.length) {
      state.rows = previousRows;
      renderRows();
      return setMessage("#personnelDocumentMessage", "No se confirmó la firma en todos los meses seleccionados. No se mantuvo el check.", true);
    }
    const horaFirma = firmado && data?.[0]?.firmado_en ? formatTime(data[0].firmado_en) : "";
    setMessage("#personnelDocumentMessage", firmado ? `Firma registrada y mantenida en ${periods.length} mes(es)${horaFirma ? ` a las ${horaFirma}` : ""}.` : `${periods.length} contrato(s) marcados nuevamente como pendientes.`);
  }

  async function loadDailyDocuments() {
    const date = $("#personnelDocumentDate").value;
    if (!date) return setMessage("#personnelDocumentMessage", "Selecciona la fecha de jornada.", true);
    if (!selectedPeriods().length) return setMessage("#personnelDocumentMessage", "Añade y selecciona al menos un mes de contrato.", true);
    const { data, error } = await sb.rpc("clinic_listar_documentos_personal_dia", {
      p_fecha: date,
      p_periodo: selectedPeriod(),
      p_tipo_documento: $("#personnelDocumentType").value,
    });
    if (error) return setMessage("#personnelDocumentMessage", error.message, true);
    state.rows = data || [];
    state.rows.forEach(row => state.profiles.set(Number(row.personal_id), row));
    renderRows();
    setMessage("#personnelDocumentMessage", `${state.rows.filter(row => row.estado_documento !== "firmado").length} contrato(s) pendiente(s) en ${formatPeriod(selectedPeriods()[0])}.`);
  }

  async function loadProfile(id) {
    api.openDocumentSubview?.("perfiles");
    let profile = personById(id);
    if (!profile || !Object.prototype.hasOwnProperty.call(profile, "perfil_administrativo")) {
      const { data, error } = await sb.rpc("clinic_listar_perfiles_personal", { p_busqueda: "" });
      if (error) return setMessage("#personnelProfileMessage", error.message, true);
      (data || []).forEach(item => state.profiles.set(Number(item.id), item));
      profile = personById(id);
    }
    if (!profile) return;
    const extra = profile.perfil_administrativo || {};
    $("#personnelProfileForm").hidden = false;
    $("#personnelProfileEmpty").hidden = true;
    $("#personnelProfileId").value = profile.personal_id || profile.id;
    $("#personnelApellidoPaterno").value = profile.apellido_paterno || "";
    $("#personnelApellidoMaterno").value = profile.apellido_materno || "";
    $("#personnelNombres").value = profile.nombres || profile.nombre_completo || "";
    $("#personnelDocumento").value = profile.numero_documento || "";
    $("#personnelTelefono").value = profile.telefono || "";
    $("#personnelDireccion").value = profile.direccion || "";
    $("#personnelCargo").value = extra.cargo || profile.rol || "";
    $("#personnelHorarioFijo").value = profile.horario_fijo || "";
    $("#personnelFijo").checked = Boolean(profile.es_fijo_lunes_sabado || profile.es_fijo);
    setMessage("#personnelProfileMessage", `Perfil de ${fullName(profile)} listo para completar.`);
  }

  async function saveProfile(event) {
    event.preventDefault();
    const id = Number($("#personnelProfileId").value);
    const { error } = await sb.rpc("clinic_guardar_perfil_personal", {
      p_personal_id: id,
      p_datos: { apellido_paterno: $("#personnelApellidoPaterno").value, apellido_materno: $("#personnelApellidoMaterno").value, nombres: $("#personnelNombres").value, numero_documento: $("#personnelDocumento").value, telefono: $("#personnelTelefono").value, direccion: $("#personnelDireccion").value, es_fijo_lunes_sabado: $("#personnelFijo").checked, horario_fijo: $("#personnelHorarioFijo").value, perfil_administrativo: { cargo: $("#personnelCargo").value.trim() || null } },
    });
    if (error) return setMessage("#personnelProfileMessage", error.message, true);
    setMessage("#personnelProfileMessage", "Perfil de personal actualizado.");
    await loadDailyDocuments();
    await loadProfile(id);
  }

  function init() {
    const currentPeriod = limaDate().slice(0, 7);
    $("#personnelDocumentDate").value = limaDate();
    $("#personnelDocumentPeriod").value = currentPeriod;
    state.periods = [currentPeriod];
    state.selectedPeriods.add(currentPeriod);
    renderPeriodSelector();
    $("#addPersonnelDocumentPeriod").addEventListener("click", addPeriod);
    $("#loadPersonnelDocuments").addEventListener("click", loadDailyDocuments);
    $("#personnelDocumentDate").addEventListener("change", loadDailyDocuments);
    $("#personnelDocumentType").addEventListener("change", loadDailyDocuments);
    $("#personnelProfileForm").addEventListener("submit", saveProfile);
    loadDailyDocuments();
  }
  init();
})();
