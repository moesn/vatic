import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';

const config = {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/index.cjs.js',
      format: 'cjs',
      sourcemap: false,
    },
    {
      file: 'dist/index.mjs',
      format: 'esm',
      sourcemap: false,
    },
  ],
  plugins: [
    resolve(),
    commonjs(),
    typescript(),
    terser({
      compress: true,
      format: { comments: false },
    }),
  ],
  external: ['react', 'vue'],
};

const dtsConfig = {
  input: 'src/types.ts',
  output: [{ file: 'dist/index.d.ts', format: 'es' }],
  plugins: [dts()],
};

export default [config, dtsConfig];
