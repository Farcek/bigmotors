import { Container } from "@napp/di";
import { TKN_ENV } from "@bigmotors/core";
import { diDBCoreProviders, diDBServiceProviders } from "@bigmotors/db";
import { ConfigSysop } from "./config.js";
export interface CreateApiContainerOptions {
    env?: NodeJS.ProcessEnv;
}

export function createContainer(options: CreateApiContainerOptions = {}) {
    const container = new Container("root");
    container.asValue(TKN_ENV, options.env ?? process.env);
    container.asClass(ConfigSysop);
    container.registryModule(
        diDBCoreProviders(),
        diDBServiceProviders()
    );

    //   const config = options.config ?? readApiConfig(process.env);
    //   const container = new Container("root")
    //     .asValue(TKN_API_CONFIG, config)
    //     .asFactory(
    //       TKN_BRANCH_CRUD_SERVICE,
    //       (di) => createBranchService(di.resolve(TKN_API_CONFIG).DATABASE_URL),
    //       Lifetime.SINGLETON
    //     )
    //     .asFactory(
    //       TKN_CUSTOMER_CRUD_SERVICE,
    //       (di) => createCustomerService(di.resolve(TKN_API_CONFIG).DATABASE_URL),
    //       Lifetime.SINGLETON
    //     )
    //     .asFactory(
    //       TKN_EMPLOYEE_CRUD_SERVICE,
    //       (di) => createEmployeeService(di.resolve(TKN_API_CONFIG).DATABASE_URL),
    //       Lifetime.SINGLETON
    //     )
    //     .asFactory(
    //       TKN_USERLY_AUTH_SERVICE,
    //       (di) =>
    //         createUserlyAuthService({
    //           nodeEnv: di.resolve(TKN_API_CONFIG).NODE_ENV
    //         }),
    //       Lifetime.SCOPED
    //     )
    //     .asFactory(
    //       TKN_USERLY_AUTHORIZATION_SERVICE,
    //       () => createUserlyAuthorizationService(),
    //       Lifetime.SCOPED
    //     );

    //   if (options.logContext !== undefined) {
    //     container.asValue(LogContext, options.logContext);
    //   }

    //   if (options.logger !== undefined) {
    //     container.asValue(TKN_API_LOGGER, options.logger);
    //   }

    return container;
}
