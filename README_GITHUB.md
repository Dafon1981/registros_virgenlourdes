# Registro y turnos — GitHub Pages

Esta carpeta es una aplicación HTML independiente y no requiere instalar software. Contiene tres pestañas: **Registro de pacientes**, **Turnos y asistencia** y **Reportes**.

## Publicación

1. Crea un repositorio nuevo en GitHub.
2. Sube el contenido de esta carpeta a la raíz del repositorio.
3. En GitHub, abre **Settings → Pages**, selecciona la rama principal y la carpeta raíz, y guarda.
4. Abre el enlace que GitHub Pages muestra. El navegador móvil o de computadora será suficiente.

La página utiliza la clave `anon` pública de Supabase. No contiene ni necesita la clave `service_role`. Los registros se almacenan mediante funciones controladas de la base de datos.

## Uso diario

| Pestaña | Flujo |
|---|---|
| Registro de pacientes | Escribe nombre, apellidos y DNI; presiona Enter. El paciente aparece abajo con fecha y hora. Haz doble clic en la fila y confirma para marcar su retiro. |
| Turnos y asistencia | Elige la fecha. Se muestran los profesionales importados desde el horario y una casilla para registrar presencia. |
| Reportes | Elige día, semana o mes y genera el resumen por profesional. El botón CSV descarga el resultado. |

## Renovación mensual de horarios

El importador reconoce los encabezados **Especialidad**, **Nro**, **Profesional** y los días 1–31 de un Excel, XLSX o CSV como el archivo de agosto proporcionado. Selecciona el mes y carga el archivo. Los turnos se guardan en Supabase, no solamente en el navegador.

Los PDF se admiten como referencia y vista previa, pero las tablas de un PDF pueden perder su estructura. Para una importación confiable usa el Excel o CSV exportado desde el mismo sistema de turnos.

Consulta `REGISTRO_PACIENTES_TURNOS.md` para el nuevo formato de pegado, los turnos I/II, las secuencias LMX/MJS y el uso seguro de las listas compartibles.
