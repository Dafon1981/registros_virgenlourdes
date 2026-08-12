# Validación funcional inicial

La pestaña **Registro de pacientes** se abrió correctamente y mostró una lista vacía de la fecha operativa sin datos simulados.

La pestaña **Turnos y asistencia** se conectó correctamente a Supabase y mostró los turnos reales importados para el **12 de agosto de 2026**. La vista recuperó los profesionales, cargos, documentos, horarios y módulos del reporte de agosto; las asistencias permanecen en estado pendiente hasta que el operador marque una casilla.

No se realizó una marcación de asistencia durante la validación para no alterar la asistencia real de ningún profesional.

La pestaña **Reportes** se ejecutó contra Supabase para el período mensual de agosto de 2026. El resultado mostró **343 turnos programados**, sin asistencias aún marcadas, y desglosó los totales por profesional y cargo. La generación del reporte es de solo lectura.

La vista de **Turnos y asistencia** mostró correctamente el listado real del 12 de agosto, incluyendo profesionales, cargos, horarios y módulos. Las casillas quedaron sin marcar para no registrar asistencias reales durante la validación.

Se cargó el PDF adjunto de turnos y la aplicación renderizó una vista previa real de la primera página con PDF.js, además de presentar el texto extraído y la advertencia de que no se importaron datos desde ese PDF. La importación estructurada permanece reservada a Excel, XLSX o CSV.

La actualización de turno y secuencia se verificó técnicamente: las funciones `clinic_programar_paciente_turno`, `clinic_registrar_asistencia_paciente` y `clinic_lista_turno_hoy` están disponibles en Supabase. No se creó un registro de paciente de prueba, por indicación de Manuel. El procedimiento para comprobar el primer registro real quedó en `PRIMER_REGISTRO.md`.
