# Registro de asistencia por turno y secuencia

## Formato de ingreso rápido

En la primera pestaña se pega una sola línea con el nombre completo y el DNI. El sistema acepta también el turno al final de la línea.

| Entrada pegada | Resultado |
|---|---|
| `DE LA CRUZ SERNA GUILLERMINA 10174612` | Busca el turno mensual ya programado para ese DNI. |
| `DE LA CRUZ SERNA GUILLERMINA 10174612 I` | Registra o actualiza la programación mensual en **turno I**. |
| `DE LA CRUZ SERNA GUILLERMINA 10174612 II` | Registra o actualiza la programación mensual en **turno II**. |

Si se pega solo nombre y DNI y el paciente aún no tiene programación mensual, el operador puede seleccionar **Turno I** o **Turno II** en el selector de respaldo. La siguiente vez bastará pegar nombre y DNI, porque el turno queda guardado para el mes.

## Secuencia diaria

La aplicación utiliza la fecha de Lima al guardar la asistencia. No se selecciona manualmente.

| Día | Secuencia guardada |
|---|---|
| Lunes, miércoles o viernes | `LMX` |
| Martes, jueves o sábado | `MJS` |
| Domingo | No permite registrar asistencia de pacientes. |

Cada registro guarda en Supabase el DNI, nombre, fecha operativa, hora, turno, secuencia y estado. Las listas de **turno I** y **turno II** se muestran separadas. Un doble clic marca el retiro, dejando la fila tachada.

## Compartir listas

El botón **Compartir lista** abre el menú de compartir del teléfono cuando el navegador lo permite; en computadora copia el texto al portapapeles. Como la lista incluye nombres y DNI, la aplicación pide confirmación antes de compartirla. El operador debe usar esta opción únicamente en canales autorizados por la clínica.

## Programación completa de pacientes

La base ya admite una programación mensual por DNI y turno. Para que el turno se resuelva automáticamente desde el primer pegado para todos los pacientes, se necesita un archivo completo con las columnas **nombre**, **DNI** y **turno I/II**. La captura compartida muestra el formato requerido, pero no contiene la lista completa en un archivo estructurado.
