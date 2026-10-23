const fs = require("fs");
const vm = require("vm");
const v8 = require("v8");

const [input, output, expectedV8] = process.argv.slice(2);
if (!input || !output) {
  throw new Error(
    "usage: electron generate_electron_cache_from_file.cjs INPUT.js OUTPUT.jsc [EXPECTED_V8]",
  );
}
const actualV8 = process.versions.v8.replace(/-.*$/, "");
if (expectedV8 && actualV8 !== expectedV8) {
  throw new Error(
    `Electron V8 mismatch: expected ${expectedV8}, got ${process.versions.v8}`,
  );
}

// Real-world code touches read-only heap objects that tiny fixtures never
// reference, so it exposes d8 builds whose read-only heap differs from
// Electron's. Mirror the app loader: eager compilation, CommonJS wrapper.
v8.setFlagsFromString("--no-lazy");
v8.setFlagsFromString("--no-flush-bytecode");
const source =
  "(function (exports, require, module, __filename, __dirname) {" +
  fs.readFileSync(input, "utf8") +
  "\n})";
const script = new vm.Script(source, { filename: "fixture.js" });
const cachedData = script.createCachedData();
if (!Buffer.isBuffer(cachedData) || cachedData.length === 0) {
  throw new Error("Electron did not produce cached data");
}
fs.writeFileSync(output, cachedData);
console.log(
  `wrote ${cachedData.length} bytes from ${input} with V8 ${process.versions.v8} to ${output}`,
);
