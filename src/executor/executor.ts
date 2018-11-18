const terminal = require('terminal-kit').terminal;
import { BuildNode } from "../tree/build-node";
import { BuildTree } from "../tree/build-tree";

/**
 * The executor is responsible for treating task from a queue of pending nodes.
 */
export class Executor {
    private static AWARENESS_INTERVAL = 500;

    private awarenessTimerId?: NodeJS.Timeout;

    private currentBuildingNode?: BuildNode;

    private isStopping = false;

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
        clearInterval(this.awarenessTimerId);
        this.awarenessTimerId = undefined;

        if (this.currentBuildingNode) {
            return this.currentBuildingNode.builder.stop()
                .then(() => {
                    if (this.currentBuildingNode) {
                        this.currentBuildingNode.abort('Stopped!');
                    }
                });
        } else {
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
                    if (this.currentBuildingNode) {
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
                    }
                });
        } else {
            // Check if the currently building node finally has dirty deps after the build started.
            // It can be seen from the 'wait_for_deps' preBuild status.
            if (!this.isStopping && this.currentBuildingNode.isWaitingForDeps()) {
                this.isStopping = true;
                this.currentBuildingNode.builder.stop()
                    .then(() => {
                        this.isStopping = false;
                        // The node may have been built correctly just in the mean time.
                        if (this.currentBuildingNode) {
                            this.log(`abort building ${this.currentBuildingNode.moduleName} for dirty dep.`);
                            this.currentBuildingNode.abortBuild();
                            this.currentBuildingNode = undefined;
                        }
                    });
            }
        }
    }

    private log(message: string): void {
        terminal.bold(`[${this.id}] `);
        terminal(`${message}\n`);
    }
}