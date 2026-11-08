import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const workerPath = resolve(projectRoot, "dist/server/index.js");
const manifestPath = resolve(projectRoot, "dist/.openai/hosting.json");

const [source, manifest] = await Promise.all([
  readFile(workerPath, "utf8"),
  readFile(manifestPath, "utf8"),
]);
const hosting=JSON.parse(manifest);
assert.equal(hosting.d1,'DB','Hosted persistence must declare the DB binding');
const journal=JSON.parse(await readFile(resolve(projectRoot,'dist/.openai/drizzle/meta/_journal.json'),'utf8'));
assert.ok(journal.entries.some(e=>e.tag==='0001_board_management'),'Board deletion migration must be packaged');

// A data URL forces ESM parsing even though the generated output has no package.json.
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const workerModule = await import(moduleUrl);
assert.equal(
  typeof workerModule.default?.fetch,
  "function",
  `${pathToFileURL(workerPath)} must export default.fetch`,
);

console.log("Artifact is valid ESM and exports default.fetch");
const adminLogin=await workerModule.default.fetch(new Request('https://site.test/admin/login'),{});
assert.match(await adminLogin.text(),/id="admin-login"/);
const boardScript=await workerModule.default.fetch(new Request('https://site.test/board-admin.js'),{});
assert.equal(boardScript.status,200);
assert.match(await boardScript.text(),/게시판 관리자 도구/);
console.log('Administrator screen, management script and D1 migrations are packaged');
