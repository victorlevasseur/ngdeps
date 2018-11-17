import { readNgdepFile } from "./input/file-reader";
import { buildTree } from "./tree/tree-builder";
import { BuildScheduler } from "./scheduler/build-scheduler";

const tree = buildTree({
    modules: [
        /*{ name: 'A', builder: 'noop', dependencies: ['B', 'D'] },
        { name: 'B', builder: 'noop', dependencies: ['C'] },
        { name: 'C', builder: 'noop', dependencies: ['E'] },
        { name: 'D', builder: 'noop', dependencies: [] },
        { name: 'E', builder: 'noop', dependencies: ['D'] },
        { name: 'F', builder: 'noop', dependencies: ['A', 'B', 'E'] }*/
        { name: 'A', builder: 'noop', dependencies: ['B', 'C', 'DDD', 'E'] },
        { name: 'B', builder: 'noop', dependencies: ['DDD'] },
        { name: 'C', builder: 'noop', dependencies: ['E'] },
        { name: 'DDD', builder: 'noop', dependencies: [] },
        { name: 'E', builder: 'noop', dependencies: [] },
        //{ name: 'AAAAAAAAAAAAA', builder: 'noop', dependencies: [] }
    ]
}, 'A');

new BuildScheduler(4).schedule(tree)
    .then((result) => {
        if (result) {
            console.log('Oh yeah!!!');
        } else {
            console.error('Nope!');
        }
    });

// Just to rebuild DDD when the nodes depending on it (B) have started building to test the "build until stable" feature.
/*setTimeout(() => {
    const moduleToRebuild = tree.nodes.find((n) => n.moduleName === 'DDD');
    if (moduleToRebuild) {
        moduleToRebuild.depsNotReady();
    }
}, 6000);*/

/**
 * TODO
 * Rethink BuildQueue, it can just be a list of all the build node as the scheduler already manage their state
 * so the executors can just pass through the list of all the nodes to pick their node (their pick method already support that).
 */