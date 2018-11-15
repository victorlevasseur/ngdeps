import { Scheduler } from "./scheduler";
import { BuildTree } from "../tree/build-tree";
import { Executor } from "../executor/executor";
import { BuildNode, BuildNodeStatus } from "../tree/build-node";
import { BuildQueue } from "../executor/build-queue";
import { toUnicode } from "punycode";

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
                const buildQueue: BuildQueue = {
                    targetModuleName: buildTree.target.moduleName,
                    pendingNodes: [],
                    lockedNodes: []
                };
                this.executors.forEach((e) => e.start(buildQueue));
                return buildQueue;
            })
            .then((buildQueue) => {
                return new Promise<boolean>((resolve, reject) => {
                    this.awarenessIntervalId = setInterval(() => {
                        const workResult = this.doWork(buildTree, buildQueue);

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

    private doWork(buildTree: BuildTree, buildQueue: BuildQueue): boolean|undefined {
        const { status } = this.updateNodeStatus(buildTree.target, []);
        buildQueue.pendingNodes = this.getQueue(buildTree.target, []);
        console.log('Queue is: ' + buildQueue.pendingNodes.map((n) => n.moduleName + ' '));
        console.log('Lock is: ' + buildQueue.lockedNodes.map((n) => n.moduleName + ' '));
        if (this.isDoneStatus(status)) {
            // If error, display error.
            return status === BuildNodeStatus.SUCCESS;
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
        const erroredNode = buildTree.nodes.find((n) => n.status === BuildNodeStatus.ERROR);
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
    private updateNodeStatus(buildNode: BuildNode, alreadyUpdatedNodes: BuildNode[]): { status: BuildNodeStatus, updatedNodes: BuildNode[] } {
        // Update the state of the not already updated nodes based on the dependencies and the already updated node (from concurrent recursions).
        let updatedNodes = [...alreadyUpdatedNodes];
        const depsStatus = buildNode.dependencies.map((d) => {
            const alreadyUpdatedDep = alreadyUpdatedNodes.find((n) => n.moduleName === d.moduleName);
            if (alreadyUpdatedDep) {
                return alreadyUpdatedDep.status;
            } else {
                const updatedDepInfo = this.updateNodeStatus(d, updatedNodes);
                updatedNodes = [...updatedNodes, ...updatedDepInfo.updatedNodes];
                return updatedDepInfo.status;
            }
        });

        // If the node is waiting but all the deps are done, make it pending.
        if (buildNode.status === BuildNodeStatus.WAITING && 
            depsStatus.find((s) => s !== BuildNodeStatus.SUCCESS) === undefined) {
            buildNode.markPending();
        } else if (buildNode.status !== BuildNodeStatus.WAITING && 
            depsStatus.find((s) => !this.isDoneStatus(s)) !== undefined) {
            // If the node is not marked WAITING (may be PENDING, BUILDING or done)
            // but a dep is set to a "not done" status, set the node back to waiting.
            buildNode.markWaiting();
        }

        return {
            status: buildNode.status,
            updatedNodes: [...updatedNodes, buildNode]
        };
    }

    private getQueue(buildNode: BuildNode, queue: BuildNode[]): BuildNode[] {
        if (buildNode.status === BuildNodeStatus.PENDING) {
            // Don't add the same node multiple times.
            if (queue.find((n) => n.moduleName === buildNode.moduleName) === undefined) {
                return [...queue, buildNode];
            }
            return queue;
            // The deps are expected not to be PENDING if the node is PENDING.
        } else {
            let newQueue = [...queue];
            buildNode.dependencies.forEach((d) => {
                newQueue = this.getQueue(d, newQueue);
            });
            return newQueue;
        }
    }

    private isDoneStatus(status: BuildNodeStatus): boolean {
        return status === BuildNodeStatus.SUCCESS || status === BuildNodeStatus.ERROR;
    }

}