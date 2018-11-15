import { BuildTree } from "../tree/build-tree";

export interface Scheduler {
    schedule(buildTree: BuildTree): Promise<boolean>;
}