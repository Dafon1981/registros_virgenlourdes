# Primer registro real

1. Abre la pestaña **Registro de pacientes**.
2. Pega una línea como `NOMBRE Y APELLIDOS 12345678 I`. Si el paciente ya fue programado para el mes, puedes omitir el `I` o `II`.
3. Presiona **Enter** o **Guardar asistencia**.
4. Comprueba el mensaje de confirmación: debe mostrar nombre, turno, secuencia y hora.
5. Revisa la lista de **turno I** o **turno II**. La fila debe mostrar la fecha actual implícita en la jornada, hora de registro, DNI, secuencia y estado `En sala`.

| Día en que se registra | Secuencia esperada |
|---|---|
| Lunes, miércoles o viernes | LMX |
| Martes, jueves o sábado | MJS |

Si el paciente no tiene turno mensual, selecciona el turno de respaldo antes de guardar. Ese turno quedará asociado al DNI para el mes actual.
