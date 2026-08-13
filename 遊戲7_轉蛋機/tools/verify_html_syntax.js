"use strict";

const fs = require("fs");

if (process.argv.length < 3) {
  console.error("Usage: node verify_html_syntax.js <index.html> [...]");
  process.exit(2);
}

let failed = false;
for (const file of process.argv.slice(2)) {
  const html = fs.readFileSync(file, "utf8");
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    .map(match => match[1])
    .filter(Boolean);
  try {
    scripts.forEach(source => new Function(source));
    console.log(`PASS  inline syntax: ${file}`);
  } catch (error) {
    console.error(`FAIL  inline syntax: ${file}\n      ${error.message}`);
    failed = true;
  }
}

if (failed) process.exitCode = 1;
