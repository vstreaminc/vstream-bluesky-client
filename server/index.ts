import "dotenv/config";
import { envToCfg, readEnv } from "./config";
import { Machine } from "./machine";

const machine = await Machine.create(envToCfg(readEnv()));

async function shutdown() {
  await machine.terminate();
}

process.once("SIGTERM", shutdown).once("SIGINT", shutdown);

await machine.start();
console.log(
  `Express server listening at http://localhost:${machine.ctx.cfg.service.port}`,
);
