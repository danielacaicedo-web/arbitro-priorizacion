// Smoke test end-to-end: evalúa una iniciativa de ejemplo y confirma que el flujo
// completo (Lectura → Preguntas → Informe → Tablero) llega sin errores.
//
// Corre contra Firestore REAL (arbitro-priorizacion-eac1a) — no hay ambiente de
// pruebas separado. Por eso el nombre del responsable queda marcado como
// "ZZ_TEST_AUTOMATIZADO" para distinguirlo a simple vista en el tablero compartido.
// Como el borrado de expedientes está deshabilitado a propósito (Epic 5), estos
// registros de prueba se van acumulando — de vez en cuando conviene limpiarlos
// a mano desde la consola de Firebase (ahí sí se puede borrar, sin pasar por las
// reglas del cliente).
const { test, expect } = require("@playwright/test");

const RESPONSABLE = "ZZ_TEST_AUTOMATIZADO";

test("flujo completo: evaluar, responder, ver informe y guardar en el tablero", async ({ page }) => {
  const erroresPagina = [];
  page.on("pageerror", err => erroresPagina.push(err));

  await page.goto("/");

  // "Usar una iniciativa de ejemplo" limpia el campo Responsable a propósito
  // (el nombre se pide de nuevo en cada evaluación) — por eso se llena después.
  await page.getByRole("button", { name: "Usar una iniciativa de ejemplo" }).click();
  await page.getByLabel("Responsable").fill(RESPONSABLE);
  await page.getByRole("button", { name: "Evaluar iniciativa" }).click();

  // Paso 1 · Lectura: aparece el veredicto (una de las 4 bandas de calidad).
  await expect(
    page.getByText(/Todavía es una idea|En construcción|Casi lista|Lista para la mesa/).first()
  ).toBeVisible({ timeout: 15000 });

  // Paso 2 · Preguntas: responde todas, avanzando con "Siguiente".
  await page.getByText(/Responder las \d+ preguntas/).click();
  for (;;) {
    await page.getByPlaceholder(/Tu respuesta|Quedó registrado/).fill("Respuesta de prueba automatizada, con suficiente detalle.");
    const siguiente = page.getByRole("button", { name: "Siguiente" });
    if (await siguiente.isVisible()) {
      await siguiente.click();
    } else {
      break;
    }
  }
  await page.getByRole("button", { name: "Entregar para calificar" }).click();

  // Paso 3 · Informe.
  await expect(page.getByRole("heading", { name: "Informe de evaluación" })).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: "Guardar en el tablero" }).click();

  // Vuelve al tablero: confirma que se guardó (el nombre del responsable no se
  // muestra ahí, solo en "Iniciativas por squad", así que se valida en esa pantalla).
  await expect(page.getByRole("heading", { name: "Tablero de priorización" })).toBeVisible();
  await page.getByRole("button", { name: "Iniciativas por squad" }).click();
  await expect(page.getByText(RESPONSABLE).first()).toBeVisible({ timeout: 10000 });

  expect(erroresPagina, `Errores de JS no capturados: ${erroresPagina.map(e => e.message).join(" | ")}`).toEqual([]);
});
