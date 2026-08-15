# Validación de pacientes y documentos — 14/08/2026

La versión local de la aplicación estática cargó correctamente desde `index.html` con conexión al proyecto Supabase configurado. La pestaña **Pacientes** mostró 52 perfiles, con DNI, edad, peso seco, estado vital y la sede predeterminada. Los datos de epicrisis cargados se presentaron en el listado y el formulario detallado expuso los campos de contacto, atención y parámetros de diálisis.

La interfaz de pacientes mantuvo la advertencia de acceso temporal sin inicio de sesión. El siguiente paso de validación es revisar el módulo de documentos, la selección de pacientes, las coordenadas A4 y la previsualización antes de generar cualquier PDF con datos reales.

La pestaña **Documentos** cargó la plantilla `Epicrisis A4 estándar`, sus coordenadas configurables y los 52 pacientes disponibles. Al seleccionar un perfil con datos cargados, la previsualización mostró nombre, DNI, edad, diagnóstico y los parámetros de diálisis extraídos. La generación del archivo PDF no se ejecutó durante la prueba visual para no descargar ni registrar un documento clínico de prueba.

La pestaña **Turnos y asistencia** mostró los profesionales en el formato `APELLIDOS NOMBRES`, por ejemplo `SOLANO CHACON MOISES ARTURO`. El reporte operativo cargó 15 filas para el 13/08/2026 en el mismo orden de columnas del Excel de referencia: apellidos y nombres, cargo, ingreso, salida y observación; cada columna tiene su control de copiado y también existe un copiado tabulado de toda la tabla.

Las validaciones de sintaxis de `app.js` y `documents.js` finalizaron correctamente. El conjunto Vitest finalizó con 12 pruebas correctas en 7 archivos. La consulta del horario mensual también confirmó nombres en el formato de apellidos y nombres. La revisión de seguridad detectó funciones abiertas al rol anónimo y tablas con RLS sin políticas directas; esas advertencias son coherentes con la modalidad abierta temporal solicitada, y deben resolverse al activar el acceso por categorías.

La pestaña **Documentos** también cargó el control de contratos para el 14/08/2026. Se verificaron tres integrantes fijos de lunes a sábado: Maricielo y Manuel, con cargo Administración, y Cristhian, con cargo Recepción. Los tres se presentaron como contratos pendientes y sin asistencia inventada. El panel de perfil expone apellido paterno, apellido materno, nombres, documento, contacto, dirección, cargo y horario fijo.

Después de vincular los profesionales importados de la programación mensual, la aplicación local se recargó correctamente y quedó lista para consultar de nuevo el control diario de contratos con el personal programado integrado.

La consulta actualizada del 14/08/2026 mostró **15 integrantes** en el control diario: el personal programado por horario mensual, con cargo y hora de asistencia cuando estaba presente, además de Maricielo, Manuel y Cristhian como equipo fijo. Los contratos se conservaron pendientes hasta que se marque una firma real.

La portada renovada de Documentación mostró accesos directos a pacientes, contratos y firmas. Al abrir **Contratos de personal**, la sub-vista presentó retorno inmediato, filtros de fecha y mes, la tabla de firmas y el panel de perfiles, sin requerir recorrer el contenido documental de pacientes.

El selector de tema cambió correctamente la aplicación a modo oscuro de alto contraste y actualizó su etiqueta a `Modo claro`. La pestaña Horario mensual quedó reducida a la elección de mes, calendario interactivo y lista del día seleccionado; ya no presenta el reporte mensual ni el buscador en pantalla.

Después de recargar la aplicación, Documentación mostró cuatro accesos independientes: pacientes, contratos, perfiles y firmas. El botón **Perfiles de personal** apareció junto a las demás opciones y conserva el retorno a la portada documental.
