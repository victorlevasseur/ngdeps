import { BuildNode } from "../tree/build-node";
import { BuildTree } from "../tree/build-tree";

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

    start(tree: BuildTree): void {
        this.awarenessTimerId = setInterval(() => {
            this.doWork(tree);
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
                    this.currentBuildingNode.abort('Stopped!');
                    this.log('stopped.');
                });
        } else {
            this.log('stopped.');
            return Promise.resolve();
        }
    }

    private pickFirstAvailableNode(tree: BuildTree): BuildNode|undefined {
        return tree.nodes.find((n) => n.isReadyForBuild());
    }

    private doWork(tree: BuildTree): void {
        if (!this.currentBuildingNode) {
            const newBuildingNode = this.pickFirstAvailableNode(tree);
            if (!newBuildingNode) {
                return;
            }
            this.log(`building ${newBuildingNode.moduleName}...`);

            this.currentBuildingNode = newBuildingNode;
            this.currentBuildingNode.building();
            this.currentBuildingNode.builder.build(this.currentBuildingNode.moduleName, tree.target.moduleName, /* FIXME */'')
                .then((result) => {
                    if (!this.currentBuildingNode) {
                        throw new Error('Should not happen!');
                    }

                    // Check if the scheduler has put back the node to pending or waiting status.
                    // If not, mark the node as success or error depending on the builder's result.
                    if (result.success) {
                        this.currentBuildingNode.success(result.detail);
                        this.log(`success building ${this.currentBuildingNode.moduleName}.`);
                    } else {
                        this.currentBuildingNode.error(result.detail);
                        this.log(`error building ${this.currentBuildingNode.moduleName}.`);
                    }
                    
                    this.currentBuildingNode = undefined;
                });
        }
        // TODO: If a node is currently building, check for 'waiting_for_build' status, meaning the schedule wants a new build:
        // in this case, stop the build and let another (or same) executor take the next build.
        // NOT MANDATORY but gain time on frequent reschedulings.
    }

    private log(message: string): void {
        console.log(`Executor #${this.id}: ${message}`);
    }
}