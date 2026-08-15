(() => {
  const api = window.TurnosApp;
  if (!api?.sb || !document.querySelector("#personnelDocumentBody")) return;

  const { sb, $, escapeHtml, setMessage, limaDate } = api;
  const state = { rows: [], profiles: new Map() };
  const fullName = row => [row.apellido_paterno, row.apellido_materno, row.nombres].filter(Boolean).join(" ") || row.nombre_completo || "Sin nombre";
  const periodDate = value => value ? `${value}-01` : `${limaDate().slice(0, 7)}-01`;
  const selectedPeriod = () => periodDate($("#personnelDocumentPeriod").value);
  const formatTime = value => value ? new Intl.DateTimeFormat("es-PE", { hour: "2-digit", minute: "2-digit", timeZone: "America/Lima" }).format(new Date(value)) : "—";
  const personById = id => state.rows.find(item => Number(item.personal_id) === Number(id)) || state.profiles.get(Number(id));

  function renderRows() {
    const body = $("#personnelDocumentBody");
    $("#personnelDocumentCount").textContent = `${state.rows.length} integrante${state.rows.length === 1 ? "" : "s"} para el control diario`;
    body.innerHTML = state.rows.length ? state.rows.map(row => {
      const signed = row.estado_documento === "firmado";
      const attendance = row.presente ? `<span class="contract-presence present">Presente · ${formatTime(row.hora_asistencia)}</span>` : `<span class="contract-presence">Sin asistencia registrada</span>`;
      return `<tr data-personnel-row="${row.personal_id}"><td><input class="contract-check" type="checkbox" data-contract-person="${row.personal_id}" ${signed ? "checked" : ""} aria-label="Marcar contrato firmado de ${escapeHtml(fullName(row))}" /></td><td><strong>${escapeHtml(fullName(row))}</strong>${row.es_fijo ? '<br><span class="muted">Equipo fijo L–S</span>' : ""}</td><td>${escapeHtml(row.rol || "Personal")}</td><td>${attendance}</td><td><span class="contract-status ${signed ? "firmado" : ""}">${signed ? "Firmado" : "Pendiente"}</span></td><td>${signed ? formatTime(row.firmado_en) : "—"}</td></tr>`;
    }).join("") : '<tr><td colspan="6" class="empty">No hay personal programado ni fijo para esta fecha.</td></tr>';

    document.querySelectorAll("[data-contract-person]").forEach(input => input.addEventListener("change", async () => {
      const personalId = Number(input.dataset.contractPerson);
      const firmado = input.checked;
      const previousRows = state.rows.map(row => ({ ...row }));
      const firmadoEn = firmado ? new Date().toISOString() : null;
      state.rows = state.rows.map(row => Number(row.personal_id) === personalId ? {
        ...row,
        estado_documento: firmado ? "firmado" : "pendiente",
        firmado_en: firmadoEn,
      } : row);
      renderRows();
      setMessage("#personnelDocumentMessage", firmado ? "Guardando firma y hora de marcación…" : "Actualizando estado del contrato…");
      const { data, error } = await sb.rpc("clinic_actualizar_documento_personal", {
        p_personal_id: personalId,
        p_tipo_documento: $("#personnelDocumentType").value,
        p_periodo: selectedPeriod(),
        p_firmado: firmado,
        p_fecha_referencia: $("#personnelDocumentDate").value,
        p_observacion: null,
      });
      if (error) {
        state.rows = previousRows;
        renderRows();
        return setMessage("#personnelDocumentMessage", error.message, true);
      }
      const horaFirma = data?.firmado_en ? formatTime(data.firmado_en) : "";
      setMessage("#personnelDocumentMessage", firmado ? `Firma registrada${horaFirma ? ` a las ${horaFirma}` : ""}.` : "Contrato marcado nuevamente como pendiente.");
      await loadDailyDocuments();
    }));
    document.querySelectorAll("[data-personnel-row]").forEach(row => row.addEventListener("click", event => {
      if (event.target.matches("input")) return;
      loadProfile(Number(row.dataset.personnelRow));
    }));
  }

  async function loadDailyDocuments() {
    const date = $("#personnelDocumentDate").value;
    if (!date) return setMessage("#personnelDocumentMessage", "Selecciona la fecha de jornada.", true);
    const { data, error } = await sb.rpc("clinic_listar_documentos_personal_dia", {
      p_fecha: date,
      p_periodo: selectedPeriod(),
      p_tipo_documento: $("#personnelDocumentType").value,
    });
    if (error) return setMessage("#personnelDocumentMessage", error.message, true);
    state.rows = data || [];
    state.rows.forEach(row => state.profiles.set(Number(row.personal_id), row));
    renderRows();
    setMessage("#personnelDocumentMessage", `${state.rows.filter(row => row.estado_documento !== "firmado").length} contrato(s) pendiente(s) para el periodo seleccionado.`);
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
      p_datos: {
        apellido_paterno: $("#personnelApellidoPaterno").value,
        apellido_materno: $("#personnelApellidoMaterno").value,
        nombres: $("#personnelNombres").value,
        numero_documento: $("#personnelDocumento").value,
        telefono: $("#personnelTelefono").value,
        direccion: $("#personnelDireccion").value,
        es_fijo_lunes_sabado: $("#personnelFijo").checked,
        horario_fijo: $("#personnelHorarioFijo").value,
        perfil_administrativo: { cargo: $("#personnelCargo").value.trim() || null },
      },
    });
    if (error) return setMessage("#personnelProfileMessage", error.message, true);
    setMessage("#personnelProfileMessage", "Perfil de personal actualizado.");
    await loadDailyDocuments();
    await loadProfile(id);
  }

  function init() {
    $("#personnelDocumentDate").value = limaDate();
    $("#personnelDocumentPeriod").value = limaDate().slice(0, 7);
    $("#loadPersonnelDocuments").addEventListener("click", loadDailyDocuments);
    $("#personnelDocumentDate").addEventListener("change", loadDailyDocuments);
    $("#personnelDocumentPeriod").addEventListener("change", loadDailyDocuments);
    $("#personnelDocumentType").addEventListener("change", loadDailyDocuments);
    $("#personnelProfileForm").addEventListener("submit", saveProfile);
    loadDailyDocuments();
  }
  init();
})();
