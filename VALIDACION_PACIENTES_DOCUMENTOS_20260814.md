# Validación de pacientes y documentos — 14/08/2026

La versión local de la aplicación estática cargó correctamente desde `index.html` con conexión al proyecto Supabase configurado. La pestaña **Pacientes** mostró 52 perfiles, con DNI, edad, peso seco, estado vital y la sede predeterminada. Los datos de epicrisis cargados se presentaron en el listado y el formulario detallado expuso los campos de contacto, atención y parámetros de diálisis.

La interfaz de pacientes mantuvo la advertencia de acceso temporal sin inicio de sesión. El siguiente paso de validación es revisar el módulo de documentos, la selección de pacientes, las coordenadas A4 y la previsualización antes de generar cualquier PDF con datos reales.

La pestaña **Documentos** cargó la plantilla `Epicrisis A4 estándar`, sus coordenadas configurables y los 52 pacientes disponibles. Al seleccionar un perfil con datos cargados, la previsualización mostró nombre, DNI, edad, diagnóstico y los parámetros de diálisis extraídos. La generación del archivo PDF no se ejecutó durante la prueba visual para no descargar ni registrar un documento clínico de prueba.

La pestaña **Turnos y asistencia** mostró los profesionales en el formato `APELLIDOS NOMBRES`, por ejemplo `SOLANO CHACON MOISES ARTURO`. El reporte operativo cargó 15 filas para el 13/08/2026 en el mismo orden de columnas del Excel de referencia: apellidos y nombres, cargo, ingreso, salida y observación; cada columna tiene su control de copiado y también existe un copiado tabulado de toda la tabla.

Las validaciones de sintaxis de `app.js` y `documents.js` finalizaron correctamente. El conjunto Vitest finalizó con 12 pruebas correctas en 7 archivos. La consulta del horario mensual también confirmó nombres en el formato de apellidos y nombres. La revisión de seguridad detectó funciones abiertas al rol anónimo y tablas con RLS sin políticas directas; esas advertencias son coherentes con la modalidad abierta temporal solicitada, y deben resolverse al activar el acceso por categorías.
