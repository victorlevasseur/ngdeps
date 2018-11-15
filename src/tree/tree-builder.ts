import { NgdepsFile } from "../input/ngdeps-file";
import { NgdepsModule } from "../input/ngdeps-module";
import { BuildTree } from "./build-tree";
import { BuildNode } from "./build-node";
import { buildersList } from "../builder/builders-list";

export function buildTree(file: NgdepsFile, targetModuleName: string): BuildTree {
    const targetModule = file.modules.find((m) => m.name === targetModuleName);
    if (targetModule === undefined) {
        throw new Error(`Target module ${targetModuleName} unknown!`);
    }

    const checkResult = checkDeps(targetModule, [], file.modules);
    if (checkResult !== true) {
        if ((<any>checkResult).unknownModuleName) {
            throw Error(`Module ${(<any>checkResult).unknownModuleName} unknown!`);
        } else {
            throw Error(`Circular dependency:${(<any>checkResult).circularDependencies.reduce((str: string, m: string) => str + ' -> ' + m, '')} !`);
        }
    }

    const rootNode = generateBuildNodes(targetModule, targetModule, [], file.modules);

    return new BuildTree(rootNode.node, rootNode.discoveredNodes);
}

/**
 * Check a module's dependencies to look for unknown dependencies or circular dependency.
 * @param root the root module.
 * @param parents the parent module's name of the current module analysis.
 * @param modules all the available modules.
 * @returns true if ok, false otherwise.
 */
function checkDeps(
    root: NgdepsModule, 
    parents: string[], 
    modules: NgdepsModule[] ): 
    true | { unknownModuleName: string } | { circularDependencies: string[] } {
    const foundMyselfIndex = parents.findIndex((moduleName) => moduleName === root.name);
    if (foundMyselfIndex !== -1) {
        // Circular dependency found, return the circular dependency.
        return {  
            circularDependencies: [...parents.slice(foundMyselfIndex), root.name]
        };
    }
    for (const depName of root.dependencies) {
        // Check each dependency.
        const dep = modules.find((m) => m.name === depName);
        if (!dep) {
            return { unknownModuleName: depName };
        } else {
            const depCheck = checkDeps(dep, [...parents, root.name], modules);
            if (depCheck !== true) {
                return depCheck;
            }
        }
    }
    return true;
}

/**
 * Generate a hierarchy of build nodes.
 * Note: this function is not safe for unknown modules and circular dependencies. Be sure to call checkDeps before it.
 * @param module 
 * @param knownNodes the already built nodes.
 * @param modules all the available modules.
 * 
 * @see checkDeps
 */
function generateBuildNodes(
    module: NgdepsModule, 
    targetModule: NgdepsModule,
    knownNodes: BuildNode[], 
    modules: NgdepsModule[]): 
    { node: BuildNode, discoveredNodes: BuildNode[] } {

    let knownNodesUpdated: BuildNode[] = [...knownNodes];
    // For each dependency, lookup for the BuildNode if already existing in the known nodes list.
    // Otherwise, create it and add it and all its discovered nodes (from its sub-deps) to the known nodes.
    const moduleDeps = module.dependencies
        .map((dependencyName) => {
            // If found in the known deps, don't add it but reuse it.
            const dependencyAlreadyKnown = knownNodesUpdated.find((d) => d.moduleName === dependencyName);
            if (dependencyAlreadyKnown) {
                return dependencyAlreadyKnown;
            } else {
                const depNode = generateBuildNodes(<NgdepsModule>modules.find((m) => m.name === dependencyName), targetModule, knownNodesUpdated, modules);
                knownNodesUpdated = depNode.discoveredNodes;
                return depNode.node;
            }
        });

    // Generate the node.
    const generatedNode = new BuildNode(module.name, targetModule.name, new buildersList[module.builder](), moduleDeps)
    return {
        node: generatedNode,
        discoveredNodes: [...knownNodesUpdated, generatedNode]
    };
}