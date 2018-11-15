import { BuildNode, BuildNodeStatus } from "../tree/build-node";
import { BuildQueue } from "./build-queue";

/**
 * The executor is responsible for treating task from a queue of pending nodes.
 */
export class Executor {
    private static AWARENESS_INTERVAL = 500;

    private awarenessTimerId?: NodeJS.Timeout;

    private currentBuildingNode?: BuildNode;

    constructor(private id: number) {}

    isBuilding(): boolean {
        return this.currentBuildingNode !== undefined;
    }

    isRunning(): boolean {
        return this.awarenessTimerId !== undefined;
    }

    isWaiting(): boolean {
        return this.isRunning() && !this.isBuilding();
    }

    start(data: BuildQueue): void {
        this.awarenessTimerId = setInterval(() => {
            this.doWork(data);
        }, Executor.AWARENESS_INTERVAL);
        this.log('started.');
    }

    stop(): Promise<void> {
        if (!this.awarenessTimerId) {
            throw new Error('Trying to stop executor while not even started!');
        }
        this.log('stopping...');
        clearInterval(this.awarenessTimerId);
        this.awarenessTimerId = undefined;

        if (this.currentBuildingNode) {
            return this.currentBuildingNode.builder.stop()
                .then(() => {
                    if (!this.currentBuildingNode) {
                        throw new Error('Should not happen!');
                    }
                    this.currentBuildingNode.markError('Stopped!');
                    this.log('stopped.');
                });
        } else {
            this.log('stopped.');
            return Promise.resolve();
        }
    }

    private pickFirstAvailableNode(data: BuildQueue): BuildNode|undefined {
        if (data.pendingNodes.length > 0) {
            // TODO rewrite as while.
            //this.log(data.lockedNodes.reduce((s, n) => s + n.moduleName + ',', ''));
            let index = 0;
            let newBuildingNode: BuildNode|undefined;
            // Find the first node in the queue that is pending and not locked (by another executor).
            do {
                const queueNode = data.pendingNodes[index];
                if (queueNode.status === BuildNodeStatus.PENDING && 
                    data.lockedNodes.find((n) => n.moduleName === queueNode.moduleName) === undefined) {
                    newBuildingNode = queueNode;
                }
                index++;
            } while(newBuildingNode === undefined && index < data.pendingNodes.length)
            
            if (index < data.pendingNodes.length) {
                data.pendingNodes.splice(index, 1);
            }
            return newBuildingNode;
        } else {
            return undefined
        }
    }

    private lockNode(data: BuildQueue, node: BuildNode, enable: boolean) {
        if (enable) {
            data.lockedNodes.push(node);
        } else {
            data.lockedNodes = data.lockedNodes.filter((n) => n.moduleName !== node.moduleName);
        }
    }

    private doWork(data: BuildQueue): void {
        if (!this.currentBuildingNode) {
            const newBuildingNode = this.pickFirstAvailableNode(data);
            if (!newBuildingNode) {
                return;
            }
            this.lockNode(data, newBuildingNode, true);
            this.log(`building ${newBuildingNode.moduleName}...`);

            this.currentBuildingNode = newBuildingNode;
            this.currentBuildingNode.markBuilding();
            this.currentBuildingNode.builder.build(this.currentBuildingNode.moduleName, data.targetModuleName, /* FIXME */'')
                .then((result) => {
                    if (!this.currentBuildingNode) {
                        throw new Error('Should not happen!');
                    }

                    // Check if the scheduler has put back the node to pending or waiting status.
                    // If not, mark the node as success or error depending on the builder's result.
                    if (this.currentBuildingNode.status === BuildNodeStatus.BUILDING) {
                        if (result.success) {
                            this.currentBuildingNode.markSuccess(result.detail);
                            this.log(`success building ${this.currentBuildingNode.moduleName}.`);
                        } else {
                            this.currentBuildingNode.markError(result.detail);
                            this.log(`error building ${this.currentBuildingNode.moduleName}.`);
                        }
                    } else {
                        // If the scheduler put the node to WAITING or PENDING during the build,
                        // it means the dependencies may have been updated.
                        // Do not mark the node as success or error but leave it in its state so that
                        // another executor will pick it to rebuild it.
                        this.log(`obsolete building ${this.currentBuildingNode.moduleName} (with status: ${this.currentBuildingNode.status}). Will be redone soon.`);
                    }
                    
                    this.lockNode(data, this.currentBuildingNode, false);
                    this.currentBuildingNode = undefined;
                });
        }
        // TODO: If a node is currently building, check for WAITING or PENDING status, meaning the schedule wants a new build:
        // in this case, stop the build and leave the node in its WAITING or PENDING status.
        // NOT MANDATORY but gain time on frequent reschedulings.
    }

    private log(message: string): void {
        console.log(`Executor #${this.id}: ${message}`);
    }
}