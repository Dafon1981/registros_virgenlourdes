# Lectura asistida de historias clínicas en PDF

La opción **Agregar paciente → Leer PDF y proponer datos** extrae texto desde el PDF en el navegador y propone nombre, DNI, edad, peso seco, diagnóstico, acceso vascular y duración de diálisis cuando esos rótulos están presentes. El personal debe revisar y corregir todos los campos antes de guardar.

La clave de IA se conserva exclusivamente en el servidor para una siguiente fase de extracción estructurada. No se expone en `config.js`, en el navegador ni en GitHub Pages.

> La lectura de un PDF no reemplaza la revisión clínica ni constituye un diagnóstico.
