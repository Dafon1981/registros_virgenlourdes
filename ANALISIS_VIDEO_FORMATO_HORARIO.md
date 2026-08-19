# Reglas confirmadas del formato de horario

El video operativo confirma que la planilla debe mantener el orden clínico de la lista, el módulo y los campos de horario diferenciados para licenciados y médico.

| Regla | Aplicación en la sub-vista Formato de horario |
|---|---|
| Paciente faltante | Se muestra **FALTO** y sus horas permanecen vacías. |
| Hora inicio médico | Debe ser anterior a la hora fin médico. |
| Hora fin médico y licenciado | La hora fin médico nunca puede ser posterior a la hora fin del licenciado. |
| Repeticiones en un módulo | No se permiten horas fin médico repetidas dentro del mismo módulo. |
| Repeticiones entre módulos | Se permiten si pertenecen a módulos distintos. |
| Ajuste de tiempo | Cuando haya conflicto, se ajusta en incrementos de 1 a 3 minutos, preservando la coherencia con la hora de llegada y el módulo. |

La hoja incorporará los datos que correspondan al registro operativo: pacientes, módulo, asistencia, horas de licenciados y horas médicas. Las columnas introducidas por personal licenciado seguirán siendo editables; el cálculo de la hora médica las usará como límite de seguridad.

## Regla adicional de hora fin médico

La variación de la hora fin médico se configura **por módulo**. Por ejemplo, Módulo 1 puede usar un minuto, Módulo 2 dos minutos y Módulo 3 tres minutos; el responsable puede cambiar esta distribución. La condición que no cambia es que dentro del mismo módulo ninguna hora fin médico puede repetirse. Cuando el cálculo origine una coincidencia, el sistema ajustará el valor con uno o más minutos según la configuración del módulo.

## Regla adicional de hora inicio médico

La hora inicial del médico no puede coincidir con la hora inicial de máquina o del licenciado. Si el cálculo produce la misma hora, se ajustará la hora inicial del médico conservando que sea posterior a la hora de llegada del paciente y anterior a su hora fin médico.

## Relación entre hora fin de máquina y hora fin médico

La hora fin médico se toma desde la última columna de hora fin de máquina o licenciado. Se agrega la diferencia configurada del módulo —por defecto, un minuto para Módulo 1, dos para Módulo 2 y tres para Módulo 3—. Por ello, la hora fin médico nunca debe ser igual a la hora fin de máquina. Si se repite dentro de un módulo, se agregan minutos adicionales hasta obtener un valor distinto.

La duración de diálisis es un dato clínico preprogramado de 3 o 3,5 horas. El formato de horario la conserva como referencia para las columnas del personal licenciado, aunque no se mostrará en la sub-vista simplificada solicitada para el llenado diario.

## Excepciones y responsabilidades confirmadas

La diferencia usual entre horarios es de dos minutos. Cuando un paciente llega tarde, puede existir una separación de un minuto o una hora equivalente si la llegada lo exige; aun así, dentro de un mismo módulo no se repiten valores. La columna de hora de máquina no se modifica desde esta aplicación. Si existe una inconsistencia en una columna de licenciado, debe revisarse al profesional asignado a ese módulo y turno antes de modificar esa hora.
