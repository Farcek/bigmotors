
import type { Container } from "@napp/di";
import { DTIError } from "@napp/dti-core";
import { NappError } from "@napp/error";
import { createDTIExpressRouter, type DTIExpressRouter } from "@napp/dti-server";


export type APIAuthdata = {
    userid: string;
    username: string;
    roles: string[];
    scopes: string[];
};

export interface APIMeta {
    readonly di: Container;
}
export type APIDti = DTIExpressRouter<APIAuthdata, APIMeta>;

export function buildDTI(di: Container) {
    //   const apiLog = resolveApiLog(di);
    const dti: APIDti = createDTIExpressRouter<APIAuthdata, APIMeta>({
        async auth({ }) {
            //   const requestDi = di.child("request-auth");
            //   const actor = await requestDi
            //     .resolve(TKN_USERLY_AUTH_SERVICE)
            //     .authenticate(req);

            //   await requestDi
            //     .resolve(TKN_USERLY_AUTHORIZATION_SERVICE)
            //     .authorize(action.name, actor);

            return {
                userid: "000",
                username: "admin",
                roles: [],
                scopes: []
            }

            // throw new DTIError("Admin API is not initialized.", {
            //     code: "AUTH_ACL_UNAVAILABLE", status: 503
            // });
        },
        meta() {
            return {
                di
            };
        },
        error: {
            parse: ({ error: rawError, action, req }) => {
                if (rawError instanceof DTIError) {
                    return rawError;
                }
                if (rawError instanceof NappError) {
                    const status = rawError.status !== undefined && Number.isInteger(rawError.status) ? rawError.status : 500;
                    return new DTIError(rawError.message, {
                        code: rawError.code,
                        status: status >= 400 && status < 500 ? status : 500
                    });
                }

                // const mapped = mapUnknownError(rawError);
                // const status = mapped.dti.status ?? 500;
                // const requestLog = apiLog.child(
                //     action.name,
                //     createRequestLogContext(req, {
                //         action: action.name,
                //         status
                //     })
                // );

                // requestLog[status >= 500 ? "error" : "warn"]("request_failed", {
                //     ...createErrorLogContext(rawError)
                // });

                return new DTIError("request error", { code: "UNKNOWN_ERROR", status: 500 });
            }
        }
    });



    return dti;
}
