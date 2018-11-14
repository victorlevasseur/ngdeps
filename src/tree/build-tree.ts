import { BuildNode } from "./build-node";

export class BuildTree {
    constructor(public readonly target: BuildNode, public readonly leafs: BuildNode[], public readonly nodes: BuildNode[]) {}
}