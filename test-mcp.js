#!/usr/bin/env node
// Test du serveur MCP Mnemos — protocole JSON-RPC stdio
const { spawn } = require("child_process");
const readline = require("readline");
const path = require("path");

const SERVER = path.join(__dirname, "mcp-server", "index.cjs");
process.env.SUPABASE_URL = "https://hpbsowihyydzdnxuzoxs.supabase.co";

const server = spawn("node", [SERVER], { stdio: ["pipe", "pipe", "pipe"] });
const rl = readline.createInterface({ input: server.stdout });

let resolvers = {};
let nextId = 1;
let pass = 0, fail = 0;

function ok(d) { console.log(`  \x1b[32mPASS\x1b[0m ${d}`); pass++; }
function ko(d, detail) {
  console.log(`  \x1b[31mFAIL\x1b[0m ${d}`);
  if (detail) console.log(`  \x1b[33mGot:\x1b[0m ${String(detail).substring(0, 300)}`);
  fail++;
}

rl.on("line", (line) => {
  try {
    const msg = JSON.parse(line);
    if (msg.id && resolvers[msg.id]) { resolvers[msg.id](msg); delete resolvers[msg.id]; }
  } catch (e) {}
});
server.stderr.on("data", () => {});

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    resolvers[id] = resolve;
    server.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
    setTimeout(() => { delete resolvers[id]; reject(new Error("timeout " + method)); }, 15000);
  });
}

async function run() {
  console.log("========================================");
  console.log(" Mnemos MCP Server — Test Suite");
  console.log(` ${new Date().toLocaleString()}`);
  console.log("========================================\n");

  // Init
  console.log("--- Initialisation ---");
  const init = await send("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "test-suite", version: "1.0" }
  });
  if (init.result?.serverInfo) ok("Serveur: " + init.result.serverInfo.name);
  else ko("Init échouée", JSON.stringify(init));
  server.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
  console.log("");

  // Test 1 : list tools
  console.log("--- Test 1 : Liste des outils ---");
  const tools = await send("tools/list");
  const count = tools.result?.tools?.length || 0;
  if (count >= 36) ok(`${count} outils enregistrés`);
  else ko(`Attendu >= 36, got ${count}`);
  for (const t of ["mnemos_login", "mnemos_signup", "mnemos_logout", "mnemos_whoami"]) {
    if (tools.result?.tools?.some(x => x.name === t)) ok(`outil ${t}`);
    else ko(`outil ${t} manquant`);
  }
  console.log("");

  // Test 2 : whoami sans credentials
  console.log("--- Test 2 : whoami (pas connecté) ---");
  const w1 = await send("tools/call", { name: "mnemos_whoami", arguments: {} });
  const w1t = w1.result?.content?.[0]?.text || JSON.stringify(w1);
  if (w1t.includes("false") || w1t.includes("Non connect") || w1t.includes("no credentials")) ok("whoami → non connecté");
  else ko("whoami devrait être non-connecté", w1t);
  console.log("");

  // Test 3 : login
  console.log("--- Test 3 : login user test ---");
  const login = await send("tools/call", {
    name: "mnemos_login",
    arguments: { email: "test-mnemos@evidencai.com", password: "TestMnemos2026!" }
  });
  const lt = login.result?.content?.[0]?.text || JSON.stringify(login);
  if (lt.includes("41b26916") || lt.includes("success") || lt.includes("onnect")) ok("login réussi");
  else ko("login échoué", lt);
  console.log("");

  // Test 4 : whoami après login
  console.log("--- Test 4 : whoami (après login) ---");
  const w2 = await send("tools/call", { name: "mnemos_whoami", arguments: {} });
  const w2t = w2.result?.content?.[0]?.text || JSON.stringify(w2);
  if (w2t.includes("true") || w2t.includes("41b26916")) ok("whoami → connecté");
  else ko("whoami devrait être connecté", w2t);
  console.log("");

  // Test 5 : quick_boot
  console.log("--- Test 5 : quick_boot ---");
  const boot = await send("tools/call", {
    name: "mnemos_quick_boot",
    arguments: { userId: "41b26916-3e01-4f38-9e0a-bdf20430f1b3" }
  });
  const bt = boot.result?.content?.[0]?.text || JSON.stringify(boot);
  if (bt.includes("QUICK BOOT") || bt.includes("boot")) ok("quick_boot exécuté");
  else ko("quick_boot échoué", bt);
  console.log("");

  // Test 6 : logout
  console.log("--- Test 6 : logout ---");
  const logout = await send("tools/call", { name: "mnemos_logout", arguments: {} });
  const lot = logout.result?.content?.[0]?.text || JSON.stringify(logout);
  if (lot.includes("success") || lot.includes("connect") || lot.includes("supprim")) ok("logout réussi");
  else ko("logout échoué", lot);
  console.log("");

  // Résumé
  console.log("========================================");
  console.log(`  Résultats : \x1b[32m${pass} PASS\x1b[0m / \x1b[31m${fail} FAIL\x1b[0m`);
  console.log("========================================");
  if (fail === 0) console.log("  \x1b[32mTous les tests passent !\x1b[0m");
  else console.log(`  \x1b[31m${fail} test(s) en échec\x1b[0m`);

  server.stdin.end();
  server.kill();
  process.exit(fail > 0 ? 1 : 0);
}

run().catch(e => { console.error("FATAL:", e.message); server.kill(); process.exit(1); });
