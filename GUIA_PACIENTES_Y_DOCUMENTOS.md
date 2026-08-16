# Guía operativa: pacientes y documentos

## Pacientes

La pestaña **Pacientes** presenta el padrón clínico disponible con búsqueda por apellidos, nombres o DNI. Al seleccionar una fila se abre el perfil del paciente, donde se pueden actualizar datos de contacto, dirección, edad, peso seco, diagnóstico, parámetros de diálisis, estado vital y sede o lugar de atención.

Cuando se crea una sede nueva, primero debe guardarse el perfil para asignarla al paciente. El botón **Avisar cambio de sede** abre WhatsApp con un borrador revisable; no envía ningún mensaje de forma automática.

## Formato operativo de asistencia

En **Reportes**, el bloque **Asistencia para copiar al Excel** reproduce el orden solicitado: apellidos y nombres, cargo o especialidad, ingreso, salida y observación. Cada botón de columna copia los valores verticalmente; **Copiar toda la tabla** genera filas separadas por tabulaciones para pegarlas en las cinco columnas del formato institucional.

## Epicrisis

En **Documentos**, se selecciona uno o varios pacientes, la plantilla A4 y, si corresponde, una firma previamente cargada. Las coordenadas se miden en milímetros dentro de una hoja A4 de 210 × 297 mm. El fondo membretado y las firmas aceptan exclusivamente archivos PNG o JPG de hasta 5 MB.

La previsualización es un **borrador administrativo**. Antes de generar o utilizar la epicrisis, el profesional responsable debe comprobar los datos clínicos, el texto y la firma. El PDF se compone localmente en el navegador y se descarga como un solo archivo multipágina. La aplicación registra en el historial del paciente que se generó el documento, pero no almacena el PDF clínico dentro de la base de datos.

## Acceso temporal abierto

Por indicación de Manuel, las pestañas de Pacientes y Documentos funcionan temporalmente sin inicio de sesión. Esto permite consultar y editar datos clínicos, cargar firmas y generar documentos desde cualquiera que tenga el enlace y la clave pública de la aplicación.

> Esta modalidad es transitoria y no es apropiada para un enlace público de uso general. Antes de distribuir el enlace fuera del equipo autorizado, se debe activar acceso por categorías y revocar los permisos anónimos de edición y de generación documental.

La estructura actual separa las funciones clínicas y las tablas documentales, por lo que el siguiente paso será aplicar autenticación y permisos diferenciados de lectura, edición, firma y generación de documentos.
