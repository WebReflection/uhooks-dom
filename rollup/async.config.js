import {nodeResolve} from '@rollup/plugin-node-resolve';
import {terser} from 'rollup-plugin-terser';
import includePaths from 'rollup-plugin-includepaths';

export default {
  input: './esm/async.js',
  plugins: [
    includePaths({
      include: {
        '@ungap/custom-event': 'node_modules/@ungap/degap/custom-event.js',
        '@webreflection/lie': 'node_modules/@ungap/degap/promise.js'
      }
    }),
    nodeResolve(),
    terser()
  ],
  
  output: {
    esModule: false,
    exports: 'named',
    file: './async.js',
    format: 'iife',
    name: 'uhooksDOM'
  }
};
