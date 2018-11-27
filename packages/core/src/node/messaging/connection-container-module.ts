/********************************************************************************
 * Copyright (C) 2018 TypeFox and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

// tslint:disable:no-any

import { interfaces, ContainerModule } from 'inversify';
import { JsonRpcProxyFactory, ConnectionHandler, JsonRpcConnectionHandler, JsonRpcProxy } from '../../common';

export type BindFrontendService = <T extends object>(path: string, serviceIdentifier: interfaces.ServiceIdentifier<T>) => interfaces.BindingWhenOnSyntax<T>;
export type BindBackendService = <T extends object, C extends object = object>(
    path: string, serviceIdentifier: interfaces.ServiceIdentifier<T>, onActivation?: (service: T, proxy: JsonRpcProxy<C>) => T
) => void;
export type ConnectionContainerModuleCallBack = (registry: {
    bind: interfaces.Bind
    unbind: interfaces.Unbind
    isBound: interfaces.IsBound
    rebind: interfaces.Rebind
    bindFrontendService: BindFrontendService
    bindBackendService: BindBackendService
}) => void;

export const ConnectionContainerModule: symbol & { create(callback: ConnectionContainerModuleCallBack): ContainerModule } = Object.assign(Symbol('ConnectionContainerModule'), {
    create(callback: ConnectionContainerModuleCallBack): ContainerModule {
        return new ContainerModule((bind, unbind, isBound, rebind) => {
            const bindFrontendService: BindFrontendService = (path, serviceIdentifier) => {
                const serviceFactory = new JsonRpcProxyFactory();
                const service = serviceFactory.createProxy();
                bind<ConnectionHandler>(ConnectionHandler).toConstantValue({
                    path,
                    onConnection: connection => serviceFactory.listen(connection)
                });
                return bind(serviceIdentifier).toConstantValue(service);
            };
            const bindBackendService: BindBackendService = (path, serviceIdentifier, onActivation) => {
                bind(ConnectionHandler).toDynamicValue(context =>
                    new JsonRpcConnectionHandler<any>(path, proxy => {
                        const service = context.container.get(serviceIdentifier);
                        return onActivation ? onActivation(service, proxy) : service;
                    })
                ).inSingletonScope();
            };
            callback({ bind, unbind, isBound, rebind, bindFrontendService, bindBackendService });
        });
    }
});
