import { Builder } from "../builder/builder";

export interface BuildNodeStatusInfo {
    preBuild: 'wait_for_deps'|'wait_for_build'|'not_waiting';
    build: 'building'|'not_building';
    postBuild: 'success'|'error'|'aborted'|'never';
}

export class BuildNode {
    private _statusInfo: BuildNodeStatusInfo = {
        preBuild: 'wait_for_deps',
        build: 'not_building',
        postBuild: 'never'
    };

    private _detail?: string;

    constructor(public readonly moduleName: string, public readonly targetModuleName: string, 
        public readonly builder: Builder, public dependencies: BuildNode[]) {}

    /**
     * Returns true if the node waits for its deps.
     */
    isWaitingForDeps(): boolean {
        return this._statusInfo.preBuild === 'wait_for_deps';
    }

    /**
     * Returns true if the node is ready to be built by an executor.
     */
    isReadyForBuild(): boolean {
        return this._statusInfo.preBuild === 'wait_for_build' && this._statusInfo.build !== 'building';
    }

    /**
     * Return true if the build node is done/finished (and no over builds are required).
     */
    isDone(): boolean {
        return this._statusInfo.preBuild === 'not_waiting' && this._statusInfo.build === 'not_building'  && this._statusInfo.postBuild !== 'never';
    }

    isDoneWithSuccess(): boolean {
        return this.isDone() && this._statusInfo.postBuild === 'success';
    }

    isDoneWithError(): boolean {
        return this.isDone() && this._statusInfo.postBuild === 'error';
    }

    isDoneWithAbort(): boolean {
        return this.isDone() && this._statusInfo.postBuild === 'aborted';
    }

    isBuilding(): boolean {
        return this._statusInfo.build === 'building';
    }

    depsNotReady(): this {
        this._statusInfo.preBuild = 'wait_for_deps';
        return this;
    }

    depsReady(): this {
        if (this._statusInfo.preBuild !== 'wait_for_deps') {
            throw new Error('Cannot mark a build node wait_for_build while not not_waiting');
        }
        this._statusInfo.preBuild = 'wait_for_build';
        return this;
    }

    building(): this {
        if (!this.isReadyForBuild()) {
            throw new Error('Cannot mark a build node building while building or not wait_for_build');
        }
        this._statusInfo.preBuild = 'not_waiting';
        this._statusInfo.build = 'building';
        return this;
    }

    success(detail?: string): this {
        if (!this.isBuilding()) {
            throw new Error('Cannot marke a build node success while building');
        }
        this._statusInfo.build = 'not_building';
        this._statusInfo.postBuild = 'success';
        this._detail = detail;
        return this;
    }

    error(detail?: string): this  {
        if (!this.isBuilding()) {
            throw new Error('Cannot marke a build node error while building');
        }
        this._statusInfo.build = 'not_building';
        this._statusInfo.postBuild = 'error';
        this._detail = detail;
        return this;
    }

    abort(detail?: string): this  {
        if (!this.isBuilding()) {
            throw new Error('Cannot marke a build node aborted while building or ');
        }
        this._statusInfo.build = 'not_building';
        this._statusInfo.postBuild = 'error';
        this._detail = detail;
        return this;
    }

    get detail(): string | undefined {
        return this._detail;
    }
} 