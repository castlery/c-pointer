import { ProxyAgent, setGlobalDispatcher } from "undici";
import { config } from "./config.js";

const proxyUrl = config.httpsProxy || config.httpProxy;

export const proxyDispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;

if (proxyDispatcher) {
  setGlobalDispatcher(proxyDispatcher);
}
