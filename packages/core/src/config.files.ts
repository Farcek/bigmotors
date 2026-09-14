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
    readonly FILES_CACHE: string;
    readonly FILE_UPLOAD_MAX_BYTES: number;
    constructor(env: NodeJS.ProcessEnv) {
        this.FILES_ROOT = env.FILES_ROOT ?? "/files";
        this.FILES_UPLOADS = env.FILES_UPLOADS ?? "/files/uploads";
        this.FILES_CACHE = env.FILES_CACHE ?? `${this.FILES_ROOT.replace(/[\\/]+$/, "")}/cache`;
        const maxBytes = env.FILE_UPLOAD_MAX_BYTES?.trim() ?? String(20 * 1024 * 1024);
        const parsedMaxBytes = Number(maxBytes);
        if (!/^\d+$/.test(maxBytes) || !Number.isSafeInteger(parsedMaxBytes) || parsedMaxBytes <= 0) {
            throw new TypeError("FILE_UPLOAD_MAX_BYTES must be a positive safe integer.");
        }
        this.FILE_UPLOAD_MAX_BYTES = parsedMaxBytes;
    }
}
