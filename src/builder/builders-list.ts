import { Builder } from './builder';
import { NoopBuilder } from "./impl/noop-builder";
import { NgLibBuilder } from './impl/ng-lib-builder';

export const buildersList: { [name: string]: { new(): Builder } } = {
    noop: NoopBuilder,
    ngLib: NgLibBuilder
}