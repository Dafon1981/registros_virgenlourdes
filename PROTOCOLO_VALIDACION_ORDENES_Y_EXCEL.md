# Protocolo de validación con asistencias reales

## Alcance

Este protocolo se aplica cuando exista al menos una asistencia genuina en cada uno de los seis grupos: **LMV–I**, **LMV–II**, **LMV–III**, **MJS–I**, **MJS–II**, y **MJS–III**. No se deben crear registros de pacientes, horas ni firmas para ejecutar esta validación.

| Grupo | Fecha de referencia | Consulta de orden | Criterio de éxito |
|---|---|---|---|
| LMV–I, II y III | Un lunes, miércoles o viernes con asistencia real | `clinic_reporte_asistencia_pacientes_ordenado` | La columna `orden_clinico` aumenta conforme a la plantilla LMV. |
| MJS–I, II y III | Un martes, jueves o sábado con asistencia real | `clinic_reporte_asistencia_pacientes_ordenado` | La columna `orden_clinico` aumenta conforme a la plantilla MJS. |

## Verificación del orden

1. Abra **Reportes** y seleccione la fecha con asistencias reales.
2. Genere el reporte de pacientes y confirme que la secuencia, el turno y el número clínico coinciden con la hoja autorizada.
3. Ejecute el RPC `clinic_reporte_asistencia_pacientes_ordenado` para la misma fecha. Cada fila debe informar `secuencia`, `turno` y `orden_clinico`.
4. Compare el primer y el último paciente presente con la plantilla que corresponde al día. La hora de llegada no debe alterar la posición clínica.

## Validación de Excel y copiado

1. En **Registro de pacientes**, elija el turno con asistencias reales y presione **Copiar horas de pacientes**.
2. Pegue temporalmente el contenido en una hoja de revisión no institucional. Deben aparecer las horas siguiendo la posición clínica, no el orden de marcación.
3. En **Reportes**, use **Excel pacientes** para la misma fecha. Revise que las filas mantengan la secuencia, el turno y el orden clínico consultado en el RPC.
4. Para Turnos II y III, confirme además que el primer y último registro copiado coinciden con el primer y último paciente presente de la lista autorizada.

> El resultado es válido solo si se documentan la fecha, el turno, la cantidad de presentes y una captura del reporte o de la hoja de revisión. No deben incorporarse datos de prueba a la base clínica.
