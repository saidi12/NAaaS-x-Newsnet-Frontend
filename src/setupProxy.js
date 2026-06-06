const { createProxyMiddleware } = require('http-proxy-middleware');

/**
 * Dev-only API proxy.
 *
 * When the React dev server is hit directly (`npm start` on :3000 WITHOUT
 * nginx), browser calls to `/api/*` would otherwise hit the dev server, which
 * has no backend. This forwards them to the API gateway instead — mirroring
 * what nginx does in front of the app.
 *
 * When the app is served THROUGH nginx (local :80 or via ngrok), nginx matches
 * `/api/` first and proxies to the gateway, so requests never reach this proxy.
 * That makes the same frontend work in both modes with no code changes.
 *
 * Override the target with GATEWAY_URL if the gateway runs elsewhere.
 */
module.exports = function (app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: process.env.GATEWAY_URL || 'http://localhost:8000',
      changeOrigin: true,
    })
  );
};
