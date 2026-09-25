// Carga las funciones puras de index.html (cálculo de puntaje, RICE, semáforo, evaluador
// local, etc.) en un sandbox de Node, SIN tocar el navegador ni Firebase.
//
// index.html es una sola página sin build step: todo vive en un <script> inline global.
// En vez de duplicar esa lógica en un archivo aparte (dos fuentes de verdad que se pueden
// desincronizar), este helper extrae ese mismo <script> del archivo real y lo evalúa en un
// contexto aislado, cortando las últimas líneas (que arrancan el render y las suscripciones
// a Firestore — necesitan DOM/red, no aplican a un test de lógica pura).
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function cargarLogica() {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

  // El segundo <script> (sin atributo src) es la app; el primero es el setup de Firebase.
  const bloques = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  const app = bloques[1];
  if (!app) throw new Error("No encontré el <script> principal en index.html");

  const marcador = "render();\nFire.escucharExpedientes";
  const i = app.indexOf(marcador);
  if (i === -1) throw new Error("No encontré el arranque (render()/Fire.escuchar...) para cortarlo — revisa si index.html cambió de forma.");
  const codigo = app.slice(0, i);

  const sandbox = {
    console,
    // Algunas funciones definen `$=s=>document.querySelector(s)` pero no lo invocan al cargar;
    // basta con que `document` exista para que la definición no truene.
    document: { querySelector() { return null; }, querySelectorAll() { return []; } },
  };
  vm.createContext(sandbox);
  vm.runInContext(codigo, sandbox, { filename: "index.html (script principal)" });
  return sandbox;
}

module.exports = { cargarLogica };
