import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import babel from '@rollup/plugin-babel';
import terser from '@rollup/plugin-terser';

export default {
  input: 'src/index.js', // Adjust based on your entry point
  output: {
    file: 'dist/bundle.js',
    format: 'cjs', // or 'esm' or any format Rollup supports
  },
  plugins: [
    resolve(),
    commonjs(),
    json(),
    babel({ babelHelpers: 'bundled' }),
    terser(),
  ],
};


const createConfig = (build, options) => {
  const {
    file,
    dir,
    format,
    name,
    browser = false,
    bundle = false,
    minified = false,
  } = build;

  const {
    pkg,
    extensions = ['.js', '.ts'],
    globals = {},
    dependenciesToExcludeInBundle = [],
    dependenciesToDedupes = [],
    additionalExternals = [],
  } = options;

  const allDependencies = [
    ...Object.keys(pkg.dependencies),
    ...additionalExternals,
  ];
  const external = allDependencies.filter((dependency) => {
    return !bundle || dependenciesToExcludeInBundle.includes(dependency);
  });

  const outputExtension = format === 'es' ? 'mjs' : 'cjs';
  const entryFileNames = `[name].${outputExtension}`;

  return {
    input: ['src/index.ts'],
    output: {
      dir,
      file,
      format,
      name,
      entryFileNames,
      exports: 'named',
      preserveModules: !bundle,
      sourcemap: true,
      globals,
    },
    external,
    treeshake: {
      moduleSideEffects: false,
    },
    plugins: [
      commonjs(),
      nodeResolve({
        browser,
        dedupe: dependenciesToDedupes,
        extensions,
        preferBuiltins: !browser,
      }),
      babel({
        exclude: '**/node_modules/**',
        extensions,
        babelHelpers: 'bundled',
      }),
      replace({
        preventAssignment: true,
        values: {
          'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
          'process.env.BROWSER': JSON.stringify(browser),
        },
      }),
      ...(bundle ? [json(), nodePolyfills()] : []),
      ...(minified ? [terser()] : []),
    ],
    onwarn(warning, rollupWarn) {
      rollupWarn(warning);
      if (!bundle && warning.code === 'CIRCULAR_DEPENDENCY') {
        const msg =
          'Please eliminate the circular dependencies listed above and retry the build';
        throw new Error(msg);
      }
    },
  };
};
