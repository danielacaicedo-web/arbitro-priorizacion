const test = require("node:test");
const assert = require("node:assert/strict");
const { cargarLogica } = require("./cargar-logica");

const L = cargarLogica();

function criterio(id, estado) {
  return { id, estado };
}

test("puntajeDe: los 4 criterios sustentados dan 100", () => {
  const criterios = ["c1", "c2", "c3", "c4"].map(id => criterio(id, "sustentado"));
  assert.equal(L.puntajeDe(criterios, []), 100);
});

test("puntajeDe: todo ausente da 0", () => {
  const criterios = ["c1", "c2", "c3", "c4"].map(id => criterio(id, "ausente"));
  assert.equal(L.puntajeDe(criterios, []), 0);
});

test("puntajeDe: pondera cada criterio según su peso (PESOS)", () => {
  // Solo "Claridad de la propuesta" (c1, peso 35) sustentado, el resto ausente.
  const criterios = ["c1", "c2", "c3", "c4"].map(id => criterio(id, id === "c1" ? "sustentado" : "ausente"));
  assert.equal(L.puntajeDe(criterios, []), 35);
});

test("puntajeDe: 'mejora' presente suma hasta 8 puntos extra, sin pasar de 100", () => {
  const criterios = ["c1", "c2", "c3", "c4"].map(id => criterio(id, "sustentado"));
  const admisibilidad = [
    { nivel: "mejora", estado: "declarado" },
    { nivel: "mejora", estado: "declarado" },
  ];
  assert.equal(L.puntajeDe(criterios, admisibilidad), 100); // ya estaba en 100, no se pasa
});

test("nivelDe: bandas de calidad según el umbral documentado", () => {
  assert.equal(L.nivelDe(85).clave, "listo");
  assert.equal(L.nivelDe(60).clave, "casi");
  assert.equal(L.nivelDe(40).clave, "construccion");
  assert.equal(L.nivelDe(10).clave, "cruda");
});

test("semaforoDe: no evaluable siempre es rojo", () => {
  assert.equal(L.semaforoDe([], true), "rojo");
});

test("semaforoDe: 2+ criterios ausentes es rojo", () => {
  const cr = [criterio("c1", "ausente"), criterio("c2", "ausente"), criterio("c3", "sustentado")];
  assert.equal(L.semaforoDe(cr, false), "rojo");
});

test("semaforoDe: sin ausentes ni débiles es verde", () => {
  const cr = ["c1", "c2", "c3"].map(id => criterio(id, "sustentado"));
  assert.equal(L.semaforoDe(cr, false), "verde");
});

test("riceDe: calcula (alcance × impacto × confianza) ÷ esfuerzo", () => {
  const pr = { alcance: 50, impacto: 2, confianza: { valor: 80 }, esfuerzo: 4 };
  // (50 * 2 * 0.8) / 4 = 20
  const r = L.riceDe(pr);
  assert.equal(r.bruto, 20);
  assert.equal(r.indice, 20);
});

test("riceDe: sin alcance o impacto declarado, no se puede calcular", () => {
  assert.equal(L.riceDe({ alcance: null, impacto: 2, confianza: { valor: 80 }, esfuerzo: 4 }), null);
  assert.equal(L.riceDe(null), null);
});

test("bandaPrioridad: umbrales alta/media/baja", () => {
  assert.equal(L.bandaPrioridad({ indice: 50 }).t, "Alta");
  assert.equal(L.bandaPrioridad({ indice: 20 }).t, "Media");
  assert.equal(L.bandaPrioridad({ indice: 5 }).t, "Baja");
  assert.equal(L.bandaPrioridad(null).t, "Falta información");
});

test("cuadranteDe: sustentada + prioridad alta => lista para priorizar", () => {
  const c = L.cuadranteDe(80, { indice: 40 });
  assert.equal(c.t, "Lista para priorizar");
});

test("cuadranteDe: promete mucho pero sin sustento => la más peligrosa", () => {
  const c = L.cuadranteDe(30, { indice: 40 });
  assert.equal(c.t, "Sustentar antes");
});

test("evaluarLocal: texto vacío/genérico queda no_evaluable", () => {
  const r = L.evaluarLocal("muy corto", []);
  assert.equal(r.noEvaluable, true);
});

test("evaluarLocal: siempre devuelve los 4 criterios", () => {
  const texto = `Alertas de consumo en tiempo real
Squad: Card Experience - Payments

1. Contexto
Muchos usuarios de Spin by OXXO usan su tarjeta y no saben cuánto llevan gastado en el mes.

2. Problema
Los usuarios se enteran de sus consumos hasta el corte. Eso genera frustración y sensación de poco control sobre su dinero.

3. Solución
Mandar una notificación push con el monto y el comercio apenas se registra el movimiento.`;
  const r = L.evaluarLocal(texto, []);
  assert.equal(r.criterios.length, 4);
  assert.ok(r.criterios.every(c => ["sustentado", "débil", "ausente"].includes(c.estado)));
});

test("evaluarLocal: una iniciativa real de nivel Excel (sin PRD) no queda toda en 'ausente'", () => {
  // Ejemplo real de Money Movements, tal como vive antes de tener PRD.
  const texto = `Sugerencia por geolocalización
Si el usuario esta en una tienda que en esa geolocalización recibe muchos SPEI IN o P2P IN y abre su app le recomendamos directamente la transferencia a esa cuenta.
Tani va a la tienda de Mari, abre SbO, la app por atrás detecta que en esa geolocalización la cuenta X de Maria tiene muchos SPEI IN y P2P IN. Entonces le sugiere a Tani un modal en el home para transferirle a Maria.
Población SbO que hoy exhibe este patrón: 55,616. Tasa de trx no generadas: 10.11%. Estimado trx: 5,623.`;
  const r = L.evaluarLocal(texto, []);
  assert.equal(r.noEvaluable, false);
  const noAusentes = r.criterios.filter(c => c.estado !== "ausente").length;
  assert.ok(noAusentes >= 2, "esperaba al menos 2 de 4 criterios no-ausentes, dado que sí trae mecanismo e impacto");
});

test("listaDesdeFilas: reconoce encabezados reales de Spin (Equipo/Proyecto), saltando leyendas", () => {
  const filas = [
    ["N/A = Despriorizado o pausado", "", ""],
    ["PRD + Definition + Research + Discovery", "", ""],
    ["Development", "", ""],
    ["🚀", "Launch", ""],
    [], // fila vacía, como separador
    ["Equipo", "Épica", "Proyecto", "PRD", "Sizing", "Owner"],
    ["Money movements", "Digital", "Link de pago", "PRD", "M", "Andrea Chacón"],
    ["Money movements", "Físico", "Hub de comisiones", "PRD", "L", "Victor Suazo"],
    ["Segment-led solutions", "Savings", "Apartados Individual", "PRD", "L", "Mars/Jaf"],
    ["", "", "", "", "", ""], // fila vacía en medio de los datos
  ];
  const lista = L.listaDesdeFilas(filas);
  assert.equal(lista.length, 3);
  assert.equal(lista[0].squad, "Money movements");
  assert.equal(lista[0].nombre, "Link de pago");
  assert.equal(lista[2].squad, "Segment-led solutions");
  assert.equal(lista[2].nombre, "Apartados Individual");
});

test("listaDesdeFilas: sin encabezado reconocible, cae a columnas por posición (comportamiento anterior)", () => {
  const filas = [
    ["Card Experience", "Alertas de consumo", "Reducir tickets", "Priorizada"],
  ];
  const lista = L.listaDesdeFilas(filas);
  assert.equal(lista.length, 1);
  assert.equal(lista[0].squad, "Card Experience");
  assert.equal(lista[0].nombre, "Alertas de consumo");
});

test("listaDesdeFilas: formato simple (squad/iniciativa/objetivo/estado) sigue funcionando", () => {
  const filas = [
    ["squad", "iniciativa", "objetivo", "estado"],
    ["Money Movement", "Límites dinámicos", "Reducir fraude", "En definición"],
  ];
  const lista = L.listaDesdeFilas(filas);
  assert.equal(lista.length, 1);
  assert.equal(lista[0].nombre, "Límites dinámicos");
  assert.equal(lista[0].estado, "En definición");
});
