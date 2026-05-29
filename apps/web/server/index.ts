import { apply, serve } from "@photonjs/srvx";
import { getMiddlewares } from "vike-photon/universal-middlewares";
import { apiProxyMiddleware } from "./api-proxy.js";

function startServer() {
  const app = apply([apiProxyMiddleware(), ...getMiddlewares({ compress: false })]);
  return serve(app);
}

export default startServer();
