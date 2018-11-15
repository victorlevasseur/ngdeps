import { BuildTree } from "../tree/build-tree";
import { BuildNode } from "../tree/build-node";

export interface BuildQueue {
    targetModuleName: string;
    pendingNodes: BuildNode[];
    lockedNodes: BuildNode[];
}