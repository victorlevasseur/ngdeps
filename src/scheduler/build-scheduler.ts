import { Scheduler } from "./scheduler";
import { BuildTree } from "../tree/build-tree";
import { Executor } from "../executor/executor";
import { BuildNode } from "../tree/build-node";

export class BuildScheduler implements Scheduler {

    private static AWARENESS_INTERVAL = 500;

    private executors: Executor[];

    private awarenessIntervalId?: NodeJS.Timeout;

    constructor(private executorsCount: number) {
        this.executors = Array.from(new Array(executorsCount), (_, k) => new Executor(k));
    }

    schedule(buildTree: BuildTree): Promise<boolean> {
        return this.stopAllExecutors()
            .then(() => {
                // Start all the executors.
                this.executors.forEach((e) => e.start(buildTree));
            })
            .then(() => {
                return new Promise<boolean>((resolve, reject) => {
                    this.awarenessIntervalId = setInterval(() => {
                        const workResult = this.doWork(buildTree);

                        if (workResult !== undefined) {
                            this.stop();
                            resolve(workResult);
                        }
                    }, BuildScheduler.AWARENESS_INTERVAL);
                });
            })
            .then((success) => {
                return this.stopAllExecutors().then(() => success);
            });
    }

    private doWork(buildTree: BuildTree): boolean|undefined {
        this.updateNodeStatus(buildTree.target, []);
        if (buildTree.target.isDone()) {
            // If error, display error.
            return buildTree.target.isDoneWithSuccess();
        }

        return undefined;
    }

    private stop(): void {
        if (this.awarenessIntervalId) {
            clearInterval(this.awarenessIntervalId);
        }
    }

    private stopAllExecutors(): Promise<void> {
        return Promise.all(this.executors.map((e) => e.isRunning() ? e.stop() : Promise.resolve())).then(() => {});
    }

    private findErrors(buildTree: BuildTree): string|undefined {
        const erroredNode = buildTree.nodes.find((n) => n.isDoneWithAbort() || n.isDoneWithError());
        if (erroredNode) {
            return erroredNode.detail
        } else {
            return undefined;
        }
    }

    /**
     * Updates the build node status and return its new status and the other nodes the status was updated on.
     * @param buildNode 
     * @param alreadyUpdatedNodes
     */
    private updateNodeStatus(buildNode: BuildNode, alreadyUpdatedNodes: BuildNode[]): BuildNode[] {
        // Update the state of the not already updated nodes based on the dependencies and the already updated node (from concurrent recursions).
        let updatedNodes = [...alreadyUpdatedNodes];

        // Update the not yet updated deps.
        buildNode.dependencies.forEach((d) => {
            const alreadyUpdatedDep = alreadyUpdatedNodes.find((n) => n.moduleName === d.moduleName);
            if (!alreadyUpdatedDep) {
                const updatedDepInfo = this.updateNodeStatus(d, updatedNodes);
                updatedNodes = [...updatedNodes, ...updatedDepInfo];
            }
        });

        // If the node is waiting but all the deps are done with success, make it "deps ready".
        if (buildNode.isWaitingForDeps() && 
            buildNode.dependencies.find((s) => !s.isDoneWithSuccess()) === undefined) {
            buildNode.depsReady();
        } else if (!buildNode.isWaitingForDeps() && 
            buildNode.dependencies.find((s) => !s.isDone()) !== undefined) {
            // If the node is not marked WAITING (may be PENDING, BUILDING or done)
            // but a dep is set to a "not done" status, set the node back to waiting for deps.
            buildNode.depsNotReady();
        }

        return [...updatedNodes, buildNode];
    }

}