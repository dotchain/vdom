#!/bin/sh

yarn add rollup --dev
yarn add @rollup/plugin-node-resolve  --dev
yarn add @rollup/plugin-commonjs  --dev
yarn add @rollup/plugin-json --dev
yarn add eslint --dev
cat > rollup.config.js <<EOF
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

export default {
  input: '-',
  shimMissingExports: true,
  output: {
    file: 'eslint.js',
    format: 'cjs',
    name: 'Boo'
  },
  plugins: [
    resolve({preferBuiltins: true}),
    commonjs(),
    json()
  ],
}
EOF

yarn run rollup -c  <<EOF
import eslint from "eslint";
import format from "eslint/lib/cli-engine/formatters/compact.js";

function main() {
  const cli = new (eslint.CLIEngine)({
    envs: ["es6", "mocha"],
    useEslintrc: false
  });

  const report = cli.executeOnFiles(["vdom_test.js"]);
  console.log(format(report.results));
}

main();

EOF

rm rollup.config.js
yarn remove @rollup/plugin-json
yarn remove @rollup/plugin-node-resolve
yarn remove @rollup/plugin-commonjs
yarn remove rollup
yarn remove eslint
