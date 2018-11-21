import * as child_process from 'child_process';
import { Builder } from "../builder";
import { BuilderResult } from "../builder-result";

export class NgLibBuilder implements Builder {

    private process?: child_process.ChildProcess;

    build(moduleName: string, targetModuleName: string, extraCommands: string): Promise<BuilderResult> {
        const command = `ng build ${moduleName} ${ moduleName === targetModuleName ? extraCommands : '' }`;
        return new Promise<BuilderResult>((resolve, reject) => {
            this.process = child_process.exec(command, { windowsHide: true }, (err, stdout, stderr) => {
                if (err) {
                    resolve({ success: false, detail: stderr });
                } else {
                    resolve({ success: true, detail: stdout });
                }
            });
        })
    }    
    
    stop(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (this.process) {
                this.process.on('close', (code, signal) => {
                    if (signal === 'SIGTERM') {
                        resolve();
                    }
                });
                this.process.kill();
            } else {
                return resolve();
            }
        })
    }

}