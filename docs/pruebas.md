# Cómo verificar que todo sigue funcionando

Cada vez que se hace un cambio grande, corre esto desde la carpeta del proyecto:

```bash
npm test
```

Revisa en segundos el cálculo (puntaje, prioridad RICE, semáforo, evaluador local). Si algo
sale en rojo, ese cambio rompió una regla de negocio — antes de subirlo hay que arreglarlo.

Para una prueba más completa (simula a alguien usando la app de principio a fin: evaluar una
iniciativa, responder las preguntas, ver el informe y guardarlo en el tablero):

```bash
npm run test:e2e
```

Esta tarda un poco más (abre un navegador de verdad) y **sí escribe en el Firestore real**
— por eso el nombre del responsable queda marcado como `ZZ_TEST_AUTOMATIZADO`, para
distinguirlo a simple vista en el tablero compartido. Como el borrado está deshabilitado
a propósito (así lo decidimos), esos registros de prueba se van acumulando; de vez en cuando
se pueden limpiar a mano desde la consola de Firebase (Firestore Database → buscar
`ZZ_TEST_AUTOMATIZADO` → borrar esos documentos — desde ahí sí se puede, es distinto a la app).

## Qué NO cubren estas pruebas

- No prueban `/api/evaluar` con la IA real (OpenRouter) — corren contra un servidor local
  donde esa función no existe, así que usan el evaluador básico a propósito, sin costo.
- No cubren el detalle visual (colores, espaciados) ni el celular — son pruebas de que la
  lógica y el flujo funcionan, no de que se vea bien.
