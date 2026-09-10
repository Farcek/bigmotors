import NappError from "@napp/error";
import { INJECT, TOKEN, Token, defineInject } from "@napp/di";
import { TKN_ENV } from "@bigmotors/core";


export class DBConfig {
    static [TOKEN] = Token.create<DBConfig>("DBConfig");
    static [INJECT] = defineInject(
        DBConfig,
        [TKN_ENV] as const
    );

    readonly DATABASE_URL: string;
    readonly DATABASE_POOL_MIN: number;
    readonly DATABASE_POOL_MAX: number;

    constructor(env: NodeJS.ProcessEnv) {

        this.DATABASE_URL = env.DATABASE_URL?.trim() ?? "";
        if (!this.DATABASE_URL) {
            throw new NappError("DATABASE_URL is not defined in the environment", {
                code: "DATABASE_URL_NOT_DEFINED"
            });
        }
        this.DATABASE_POOL_MIN = Number(env.DATABASE_POOL_MIN ?? 0);
        this.DATABASE_POOL_MAX = Number(env.DATABASE_POOL_MAX ?? 10);
        if (env.DATABASE_POOL_MIN?.trim() === "" || !Number.isSafeInteger(this.DATABASE_POOL_MIN) || this.DATABASE_POOL_MIN < 0) {
            throw new NappError("DATABASE_POOL_MIN must be a non-negative safe integer", {
                code: "DATABASE_POOL_MIN_INVALID"
            });
        }
        if (env.DATABASE_POOL_MAX?.trim() === "" || !Number.isSafeInteger(this.DATABASE_POOL_MAX) || this.DATABASE_POOL_MAX <= 0) {
            throw new NappError("DATABASE_POOL_MAX must be a positive safe integer", {
                code: "DATABASE_POOL_MAX_INVALID"
            });
        }
        if (this.DATABASE_POOL_MIN > this.DATABASE_POOL_MAX) {
            throw new NappError("DATABASE_POOL_MIN cannot be greater than DATABASE_POOL_MAX", {
                code: "DATABASE_POOL_MIN_EXCEEDS_MAX"
            });
        }
    }
}
