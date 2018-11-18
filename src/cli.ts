#!/usr/bin/env node

import * as program from 'commander';
import * as os from 'os';
const terminal = require('terminal-kit').terminal;
import { readNgdepFile } from "./input/file-reader";
import { buildTree } from './tree/tree-builder';
import { BuildScheduler } from './scheduler/build-scheduler';

program
    .version('1.0')
    .usage('[options] target')
    .option('--executors [count]', 'The count of executors', parseInt, os.cpus().length)
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
            terminal.green.bold('Successfully built.');
            terminal.processExit(0);
        } else {
            throw new Error('Build error!'); // Get the detail of the failed node.
        }
    })
    .catch((e: Error) => {
        terminal.red.bold('Build error.\n\n')
        terminal.red(e.message);
        terminal.processExit(1);
    });