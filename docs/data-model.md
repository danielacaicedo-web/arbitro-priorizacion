# Modelo de datos — Firestore

Espacio único compartido (todo Spin), sin autenticación de usuario.

## `expedientes/{id}`

Una iniciativa evaluada, con su historial y estado de priorización.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | string | Igual al id del documento (`"x"+Date.now()`) |
| `nombre` | string | Etiqueta legible: `squad · iniciativa · fecha · versión` |
| `iniciativa` | string | Nombre de la iniciativa |
| `squad` | string | Squad dueño |
| `autor` | string | Nombre completo capturado al evaluar (obligatorio, no es un usuario autenticado) |
| `version` | number | Se incrementa si se vuelve a evaluar la misma iniciativa |
| `fecha` | string | Fecha en formato `YYYY-MM-DD` |
| `prd` | string | Contenido leído (pegado o extraído de .docx/.pdf) — el nombre del campo es histórico, guarda el texto de la iniciativa |
| `criterios` | array<object> | `{id, nombre, estado: sustentado|débil|ausente, cita, nota}` por cada uno de los 6 criterios |
| `admisibilidad` | array<object> | Prácticas que suman puntos extra (`nivel:"mejora"`), ver Epic 2.z |
| `preguntas` | array<object> | Preguntas generadas para completar lo débil/ausente, con su respuesta si ya se contestó |
| `puntaje` | number | 0–100, ponderado por `PESOS` + bono de `admisibilidad` |
| `ciclo` | string | `Borrador` \| `En la mesa` \| `Priorizada` \| `Descartada` |
| `prioridad` | object | Insumos de RICE: `{alcance, impacto, confianza, esfuerzo}` |

El nivel de calidad ("Lista para la mesa", etc.) no se guarda — se deriva del `puntaje` en el momento de mostrarlo (`nivelDe()`), igual que antes.

**Permisos:** cualquiera puede leer, crear y editar. El borrado está deshabilitado a nivel de reglas — en la UI el botón "Borrar el tablero" solo simula la acción (`alert` de "deshabilitado para esta prueba"), no hace ninguna escritura real.

**Archivos subidos (.docx/.pdf):** se procesan en el navegador con mammoth.js/pdf.js y solo se guarda el **texto extraído** en `prd`. El archivo original no se sube a Firebase Storage en el MVP.

## `meta/corpus`

Un solo documento con el listado manual de iniciativas de otros squads (lo que antes era "el registro que cargas a mano"). Campo `items`: array de `{id, squad, nombre, objetivo, estado, kw}`.

## `meta/podio`

Un solo documento con el orden manual del podio de priorización. Campo `orden`: array de ids de `expedientes`, en el orden que arrastró la mesa.

## `eventos/{id}`

Registro de uso, para medir adopción — se crea uno por cada acción clave. Solo creación, nunca se edita ni se borra desde el cliente.

| Campo | Tipo | Notas |
|---|---|---|
| `nombre` | string | Nombre completo capturado en esa sesión |
| `accion` | string | `evaluar` \| `reevaluar` \| `guardar_informe` \| `priorizar` |
| `expedienteId` | string \| null | Referencia al expediente relacionado |
| `timestamp` | timestamp | Server timestamp |
