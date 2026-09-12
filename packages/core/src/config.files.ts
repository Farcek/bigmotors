import { defineInject, INJECT, TOKEN, Token } from "@napp/di";
import { TKN_ENV } from "./tkn.js";

export class ConfigFiles {
    static [TOKEN] = Token.create<ConfigFiles>("ConfigFiles");
    static [INJECT] = defineInject(
        ConfigFiles,
        [TKN_ENV] as const
    );
    readonly FILES_ROOT:string;
    readonly FILES_UPLOADS:string;
    constructor(env: NodeJS.ProcessEnv) {
        this.FILES_ROOT = env.FILES_ROOT ?? "/files";
        this.FILES_UPLOADS = env.FILES_UPLOADS ?? "/files/uploads";
    }
}