import { Builder } from './builder';
import { NoopBuilder } from "./impl/noop-builder";

export const buildersList: { [name: string]: { new(): Builder } } = {
    noop: NoopBuilder
}