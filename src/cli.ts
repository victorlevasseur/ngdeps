#!/usr/bin/env node

import * as program from 'commander';
import * as os from 'os';
import { readNgdepFile } from "./input/file-reader";
import { buildTree } from './tree/tree-builder';
import { BuildScheduler } from './scheduler/build-scheduler';

program
    .version('1.0')
    .usage('[options] target')
    .option('--executors', 'The count of executors', parseInt, os.cpus().length)
    .option('--command <command>', 'Extra args to be passed to builders', '')
    .parse(process.argv);

if (program.args.length !== 1) {
    console.error('Only one target module is accepted!')
    process.exit(1);
}

readNgdepFile('ngdeps.json')
    .then((file) => {
        const tree = buildTree(file, program.args[0]);
        const scheduler = new BuildScheduler(program.executors);
        return scheduler.schedule(tree);
    })
    .then((result) => {
        if (result === true) {
            console.log('Successfully built.');
        } else {
            throw new Error('Build error!');
        }
    })
    .catch((e: Error) => {
        console.error(e.message);
        process.exit(1);
    });