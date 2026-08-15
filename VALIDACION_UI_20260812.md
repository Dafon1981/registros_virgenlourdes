# Validación de interfaz — 2026-08-12

La aplicación se abrió localmente como archivo estático, confirmando que no requiere un servidor de aplicación para cargar sus recursos y consultar Supabase mediante la clave pública configurada. La pestaña de registro mostró las listas separadas por turno, la columna de control para ajustar hora y los botones de compartición.

La pestaña de turnos mostró la programación real de la fecha seleccionada, las casillas de asistencia, la acción **Ajustar hora**, el selector de profesionales para recordatorios y el estado vacío cuando no existen recordatorios pendientes. No se realizaron cambios de asistencia ni se creó información de prueba durante esta validación.

La pestaña **Horario mensual** mostró 343 turnos de 34 profesionales, un calendario de agosto con contadores por día y un panel de detalle. Al seleccionar el 12 de agosto, el panel actualizó el listado a los 12 profesionales programados para esa fecha. El calendario se alimenta de la programación real; no se añadieron turnos de prueba.

La búsqueda por el texto `Tacuchi` devolvió las fechas y el horario programado del profesional correspondiente dentro de agosto. La consulta se resolvió desde la función de programación y no generó ni modificó registros operativos.

Para validar la exportación Excel sin generar archivos clínicos locales, se configuró una comprobación en memoria que intercepta la escritura de los libros antes de disparar los botones de exportación. La prueba conserva el comportamiento del libro y solo registra nombre de archivo, hoja y cantidad de filas.

El botón **Excel personal** generó en memoria un libro denominado `asistencia-personal-2026-08-01-2026-08-31.xlsx`, con la hoja `Personal` y 343 filas, correspondientes a la programación del período mensual seleccionado.

El botón **Excel pacientes** generó en memoria un libro denominado `asistencia-pacientes-2026-08-01-2026-08-31.xlsx`, con la hoja `Pacientes` y 7 filas de asistencia del período. Ambas pruebas se realizaron sin descargar ni compartir archivos.
