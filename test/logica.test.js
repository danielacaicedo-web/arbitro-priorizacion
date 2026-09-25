const test = require("node:test");
const assert = require("node:assert/strict");
const { cargarLogica } = require("./cargar-logica");

const L = cargarLogica();

function criterio(id, estado) {
  return { id, estado };
}

test("puntajeDe: los 6 criterios sustentados dan 100", () => {
  const criterios = ["c1", "c2", "c3", "c4", "c5", "c6"].map(id => criterio(id, "sustentado"));
  assert.equal(L.puntajeDe(criterios, []), 100);
});

test("puntajeDe: todo ausente da 0", () => {
  const criterios = ["c1", "c2", "c3", "c4", "c5", "c6"].map(id => criterio(id, "ausente"));
  assert.equal(L.puntajeDe(criterios, []), 0);
});

test("puntajeDe: pondera cada criterio según su peso (PESOS)", () => {
  // Solo "Impacto medible" (c3, peso 25) sustentado, el resto ausente.
  const criterios = ["c1", "c2", "c3", "c4", "c5", "c6"].map(id => criterio(id, id === "c3" ? "sustentado" : "ausente"));
  assert.equal(L.puntajeDe(criterios, []), 25);
});

test("puntajeDe: 'mejora' presente suma hasta 8 puntos extra, sin pasar de 100", () => {
  const criterios = ["c1", "c2", "c3", "c4", "c5", "c6"].map(id => criterio(id, "sustentado"));
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

test("evaluarLocal: siempre devuelve los 6 criterios + usabilidad", () => {
  const texto = `Alertas de consumo en tiempo real
Squad: Card Experience - Payments

1. Contexto
Muchos usuarios de Spin by OXXO usan su tarjeta y no saben cuánto llevan gastado en el mes.

2. Problema
Los usuarios se enteran de sus consumos hasta el corte. Eso genera frustración y sensación de poco control sobre su dinero.

3. Solución
Mandar una notificación push con el monto y el comercio apenas se registra el movimiento.`;
  const r = L.evaluarLocal(texto, []);
  assert.equal(r.criterios.length, 6);
  assert.ok(r.criterios.every(c => ["sustentado", "débil", "ausente"].includes(c.estado)));
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
