import { buildTree } from './tree-builder';

import { expect } from 'chai';
import * as chai from 'chai';
const chaiSubset = require('chai-subset');

chai.use(chaiSubset);
// if you used the '@types/mocha' method to install mocha type definitions, uncomment the following line
// import 'mocha';

describe('tree/build-tree buildTree', () => {
    it('should fail on circular dependencies (basic)', () => {
        expect(() => {
            buildTree({
                modules: [
                    { name: 'A', builder: 'noop', dependencies: ['A', 'B'] },
                    { name: 'B', builder: 'noop', dependencies: [] }
                ]
            }, 'A')
        }).to.throw('Circular dependency: -> A -> A !');
    });

    it('should fail on circular dependencies (advanced)', () => {
        expect(() => {
            buildTree({
                modules: [
                    { name: 'A', builder: 'noop', dependencies: ['B', 'D'] },
                    { name: 'B', builder: 'noop', dependencies: ['C'] },
                    { name: 'C', builder: 'noop', dependencies: ['E'] },
                    { name: 'D', builder: 'noop', dependencies: [] },
                    { name: 'E', builder: 'noop', dependencies: ['D', 'B'] }
                ]
            }, 'A')
        }).to.throw('Circular dependency: -> B -> C -> E -> B !');
    });

    it('should fail on unknown module', () => {
        expect(() => {
            buildTree({
                modules: [
                    { name: 'A', builder: 'noop', dependencies: ['B'] },
                    { name: 'B', builder: 'noop', dependencies: ['U'] }
                ]
            }, 'A')
        }).to.throw('Module U unknown!');

        expect(() => {
            buildTree({
                modules: [
                    { name: 'A', builder: 'noop', dependencies: ['B'] },
                    { name: 'B', builder: 'noop', dependencies: [] }
                ]
            }, 'Y')
        }).to.throw('Target module Y unknown!');
    });

    it('should build a BuildTree from a NgdepsFile', () => {
        const result = buildTree({
            modules: [
                { name: 'A', builder: 'noop', dependencies: ['B', 'D'] },
                { name: 'B', builder: 'noop', dependencies: ['C'] },
                { name: 'C', builder: 'noop', dependencies: ['D', 'E'] },
                { name: 'D', builder: 'noop', dependencies: [] },
                { name: 'E', builder: 'noop', dependencies: ['D'] },
                { name: 'F', builder: 'noop', dependencies: ['A', 'B', 'E'] }
            ]
        }, 'A');

        expect(result.target.moduleName).to.equal('A');
        expect(result.nodes.map((n) => n.moduleName)).to.have.members(['A', 'B', 'C', 'D', 'E']);

        /*
        Expected:
        {
            moduleName: 'A',
            dependencies: [
                {
                    dependencies: [
                        {
                            dependencies: [
                                {
                                    dependencies: [],
                                    moduleName: "D"
                                },
                                {
                                    dependencies: [
                                        {
                                            dependencies: [],
                                            moduleName: "D"
                                        }
                                    ],
                                    moduleName: "E"
                                },
                            ],
                            moduleName: "C"
                        }
                    ],
                    moduleName: "B"
                },
                {
                    dependencies: [],
                    moduleName: "D"
                }
            ]
        }
        */
        
        expect(result.target
            .dependencies.map((m) => m.moduleName)).to.have.members(['B', 'D']);
        expect(result.target
            .dependencies.find((m) => m.moduleName === 'B')
            .dependencies.map((m) => m.moduleName)).to.have.members(['C']);
        expect(result.target
            .dependencies.find((m) => m.moduleName === 'B')
            .dependencies.find((m) => m.moduleName === 'C')
            .dependencies.map((m) => m.moduleName)).to.have.members(['D', 'E']);
        expect(result.target
            .dependencies.find((m) => m.moduleName === 'B')
            .dependencies.find((m) => m.moduleName === 'C')
            .dependencies.find((m) => m.moduleName === 'D')
            .dependencies.map((m) => m.moduleName)).to.have.members([]);
        expect(result.target
            .dependencies.find((m) => m.moduleName === 'B')
            .dependencies.find((m) => m.moduleName === 'C')
            .dependencies.find((m) => m.moduleName === 'E')
            .dependencies.map((m) => m.moduleName)).to.have.members(['D']);
        expect(result.target
            .dependencies.find((m) => m.moduleName === 'B')
            .dependencies.find((m) => m.moduleName === 'C')
            .dependencies.find((m) => m.moduleName === 'E')
            .dependencies.find((m) => m.moduleName === 'D')
            .dependencies.map((m) => m.moduleName)).to.have.members([]);
        expect(result.target
            .dependencies.find((m) => m.moduleName === 'D')
            .dependencies.map((m) => m.moduleName)).to.have.members([]);

        // FIXME test leafs.
    });
});