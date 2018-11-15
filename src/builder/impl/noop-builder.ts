import { Builder } from "../builder";
import { BuilderResult } from '../builder-result';

export class NoopBuilder implements Builder {
    build(moduleName: string, targetModuleName: string, extraCommands: string): Promise<BuilderResult> {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (moduleName.search('error') !== -1) {
                    resolve({
                        success: false,
                        detail: 'Big problem!!!'
                    });
                } else {
                    resolve({
                        success: true,
                        detail: 'Good.' + targetModuleName === moduleName ? ' This is me !' : ''
                    });
                }
            }, 1000 * moduleName.length);
        });
    }

    stop(): Promise<void> {
        return new Promise((resolve, reject) => {
            setTimeout(() => resolve(), 1000);
        });
    }
}