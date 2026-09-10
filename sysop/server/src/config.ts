import { defineInject, INJECT, Token, TOKEN } from "@napp/di";
import { NappError } from "@napp/error";
import { TKN_ENV } from "@bigmotors/core";

export interface ServerConfig {
  host: string;
  port: number;
}

export class ConfigSysop {
  static [TOKEN] = Token.create<ConfigSysop>("ConfigSysop");
  static [INJECT] = defineInject(
    ConfigSysop,
    [TKN_ENV] as const
  );

  readonly HOST: string;
  readonly PORT: number;
  constructor(env: NodeJS.ProcessEnv) {
    const host = (env.HOST ?? "127.0.0.1").trim();
    const portText = env.PORT ?? "4000";
    const port = Number(portText);

    if (!host) {
      throw new NappError("HOST must not be empty.", { code: "SYSOP_CONFIG_INVALID" });
    }

    if (!/^\d+$/.test(portText) || !Number.isInteger(port) || port < 1 || port > 65535) {
      throw new NappError("PORT must be an integer from 1 to 65535.", {
        code: "SYSOP_CONFIG_INVALID",
      });
    }
    this.HOST = host;
    this.PORT = port;
  }
}

// export function readServerConfig(env: NodeJS.ProcessEnv): ServerConfig {
//   const host = (env.HOST ?? "127.0.0.1").trim();
//   const portText = env.PORT ?? "4000";
//   const port = Number(portText);

//   if (!host) {
//     throw new NappError("HOST must not be empty.", { code: "CONFIG_INVALID" });
//   }

//   if (!/^\d+$/.test(portText) || !Number.isInteger(port) || port < 1 || port > 65535) {
//     throw new NappError("PORT must be an integer from 1 to 65535.", {
//       code: "CONFIG_INVALID",
//     });
//   }

//   return { host, port };
// }
