import { NgdepsFile } from "./ngdeps-file";
import * as fs from 'fs';



export function readNgdepFile(path: string): Promise<NgdepsFile> {
    return new Promise((resolve, reject) => {
        fs.readFile(path, { encoding: 'utf8' },(err, data) => {
            if (err) {
                reject(err);
                return;
            }
            try {
                resolve(JSON.parse(data));
            } catch(e) {
                reject(e);
            }
        })
    });
}