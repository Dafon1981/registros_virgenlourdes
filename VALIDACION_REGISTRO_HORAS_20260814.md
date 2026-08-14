# Validación de registro y horarios — 14/08/2026

La pestaña de registro presenta ahora el ingreso por nombre o DNI, conserva visualmente los DNI con cero inicial y muestra la secuencia **LMV** para la fecha de viernes. Los accesos rápidos se muestran sobre la lista y la vista deja visible un solo turno, con botones para desplazarse entre Turno I y Turno II.

La calculadora de hora inicial se abrió dentro de la misma pestaña. Incluye la hora marcada por el médico cuando está disponible, separación de pacientes, incrementos editables por cada módulo y lista comparativa. La herramienta se probó sin procesar ni copiar datos clínicos reales.

Se procesó una lista en memoria para el Turno I: produjo quince horas diferenciadas y aplicó los incrementos configurados de 3, 2 y 1 minuto por módulos, con separación de dos minutos entre pacientes. La navegación a Turno II ocultó la lista de Turno I y mostró únicamente la tabla del turno seleccionado; no hubo cambios de datos durante esta comprobación.

La herramienta **Hora final médico** se verificó visualmente tras la actualización. Solicita una lista base de horas, permite definir separaciones independientes para Módulos 1, 2 y 3, admite una lista comparativa y presenta un único control para procesar y copiar la columna resultante.

La función de registro se corrigió para buscar tanto el texto original de nombres como la composición normalizada de apellido paterno, apellido materno y nombres. Una verificación de solo lectura encontró una única coincidencia para un perfil real que mantiene los apellidos en columnas separadas, sin crear ni modificar pacientes ni asistencias.

Una prueba transaccional con reversión completa llamó a la función de registro usando únicamente el nombre completo de ese perfil. La prueba verificó que se recuperó su DNI y que el resultado marcó al paciente como existente; cualquier asistencia y programación temporal se revirtió al finalizar la transacción.

La versión estática del 14/08/2026 mostró el Turno I en orden clínico, con las catorce asistencias disponibles en las posiciones 1–11 y 13–15 de la lista LMV. La navegación llevó al Turno II sin recargar la pantalla y mostró a Suasnabar Canchari Ruth Marisol en la posición vinculada a ese turno. El formulario ya ofrece los tres valores de turno y la herramienta de horas está disponible en la parte superior de la pestaña de registro.

La siguiente navegación mostró el **Turno III** con la etiqueta de horario según la lista clínica y un estado vacío explícito, porque aún no hubo asistencias registradas para ese turno. Los controles de anterior/siguiente permanecieron visibles y la lista no expuso datos de otro turno.

Para validar el libro de pacientes sin descargar información clínica, se sustituyó temporalmente en el navegador el escritor de XLSX por una captura en memoria. La pestaña de Reportes mostró el botón **Excel pacientes** y la captura quedó preparada para inspeccionar las filas generadas por el RPC ordenado.

La consulta funcional del 13/08/2026 confirmó la secuencia **MJS–Turno I** en el orden clínico 1 a 15 de la hoja que inicia con Polo González María Esther. En paralelo, el botón **Excel pacientes** se ejecutó con captura en memoria: el libro `asistencia-pacientes-2026-08-01-2026-08-31.xlsx` empezó con De la Cruz Serna Guillermina, Eufracio Candelario Macedonio, Martínez Recuay Luis Alberto, Flores Bautista Mercedes Enedina y Huanca Cama Verónica Nancy, en ese orden LMV–Turno I. No se guardó ningún archivo clínico local durante la prueba.

La prueba controlada del botón **Copiar horas de pacientes** sustituyó temporalmente el portapapeles por una captura en memoria y utilizó listas aisladas para los Turnos I, II y III. El resultado copiado fue, respectivamente, `05:31 / 05:32`, `06:31 / 06:32` y `07:31 / 07:32`, exactamente en el orden clínico de cada turno. La prueba restauró la lista y el portapapeles originales sin persistir ni descargar datos.

La consulta reproducible por fecha y turno confirmó las seis listas autorizadas: LMV–I inicia con De la Cruz Serna Guillermina, LMV–II con Walter Silva Vilmer, LMV–III con Condori Quispe Demetrio; MJS–I con Polo González María Esther, MJS–II con Atoccsa Raymundo Sayuri Lesly y MJS–III con Macavilca Zavaleta Yamil. Cada lista devolvió quince posiciones, del orden clínico 1 al 15, sin generar asistencias de prueba.

La lista de asistencia cargó registros reales y mostró LMV. El orden clínico del Turno I se guardó para los quince pacientes identificados de la lista proporcionada; las demás listas mensuales requieren que Manuel confirme o suministre su orden clínico antes de reemplazar sus órdenes de programación.
