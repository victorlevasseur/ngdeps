import { Builder } from "../builder/builder";

export enum BuildNodeStatus {
    WAITING = 'W',
    PENDING = 'P',
    BUILDING = 'B',
    SUCCESS  = 'S',
    ERROR = 'E'
}

export class BuildNode {
    private _status: BuildNodeStatus = BuildNodeStatus.WAITING;

    private _detail?: string;

    constructor(public readonly moduleName: string, public readonly builder: Builder, public dependencies: BuildNode[]) {}

    get status(): BuildNodeStatus {
        return this._status;
    }

    get detail(): string | undefined {
        return this._detail;
    }

    markPending(): void {
        if (this.status !== BuildNodeStatus.WAITING) {
            throw new Error('Invalid state!')
        }
        this._status = BuildNodeStatus.PENDING;
    }

    markBuilding(): void {
        if (this.status !== BuildNodeStatus.PENDING) {
            throw new Error('Invalid state!')
        }
        this._status = BuildNodeStatus.BUILDING;
    }

    markSuccess(detail: string): void {
        if (this.status !== BuildNodeStatus.BUILDING) {
            throw new Error('Invalid state!')
        }
        this._status = BuildNodeStatus.SUCCESS;
        this._detail = detail;
    }

    markError(detail: string): void {
        if (this.status !== BuildNodeStatus.BUILDING) {
            throw new Error('Invalid state!')
        }
        this._status = BuildNodeStatus.ERROR;
        this._detail = detail;
    }
} 