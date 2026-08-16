# Reglas del formato de horario clínico

## Orden y faltas

La tabla conserva siempre el **orden clínico configurado**, no el orden de llegada. Cada fila se presenta con módulo, asistencia y horarios. Si una persona no registra asistencia, se muestra **FALTO** y se dejan vacíos los horarios clínicos de esa fila.

La falta se puede marcar o revertir de forma manual. La revisión automática propone falta cuando, a partir del inicio del turno, han pasado 90 minutos para el Turno I y 120 minutos para los siguientes turnos. La propuesta no bloquea una asistencia posterior ni impide que se revierta la falta.

## Hora de inicio médico

1. Se ordenan las asistencias reales por hora de llegada para determinar la secuencia temporal, sin reordenar la lista clínica mostrada.
2. Se parte de la hora de asistencia del médico de turno. El primer paciente presente se propone tres minutos después.
3. Los siguientes pacientes presentes se proponen con dos minutos de diferencia. Si una llegada tardía obliga a una hora mayor, se respeta esa llegada más un minuto.
4. La hora inicio médico no puede coincidir con la hora inicial de máquina o licenciado, ni puede ser igual a la hora de llegada del paciente.
5. Dentro de cada módulo no se repiten horas; entre módulos pueden coincidir.

## Hora fin médico

1. Se toma la última columna de hora fin de licenciado o máquina como referencia.
2. Se agregan minutos configurables por módulo: por defecto 1 para Módulo 1, 2 para Módulo 2 y 3 para Módulo 3.
3. La hora fin médico debe ser distinta de la hora fin de licenciado y distinta dentro del mismo módulo.
4. Cuando haya coincidencia, se agregan minutos adicionales hasta obtener un valor válido, sin alterar la hora de llegada ni la fila clínica.

Las tres columnas de licenciados permanecen editables por el personal autorizado; el formato médico las usa como límite y referencia, pero no las sobrescribe.
