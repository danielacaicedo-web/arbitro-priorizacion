// Config de Playwright para el smoke test end-to-end.
// Corre contra un servidor estático local (no Vercel), así que /api/evaluar
// no existe y la app cae sola al evaluador local — igual que probamos a mano,
// sin costo ni dependencia de la API de OpenRouter, y de forma repetible.
module.exports = {
  testDir: "./test",
  testMatch: /.*\.spec\.js/,
  timeout: 30000,
  webServer: {
    command: "python3 -m http.server 8787",
    url: "http://localhost:8787",
    reuseExistingServer: true,
  },
  use: {
    baseURL: "http://localhost:8787",
  },
};
