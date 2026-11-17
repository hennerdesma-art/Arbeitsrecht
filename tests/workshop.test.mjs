import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const files=["workshop.html","workshop.css","workshop.js","workshop-analytics.js","index.html"];
const data=Object.fromEntries(files.map(file=>[file,readFileSync(new URL("../"+file,import.meta.url),"utf8")]));
for(const path of ["workshop.js","workshop-analytics.js"]){
  new Function(data[path]);
  console.log("✓ Syntax:",path);
}
const scripts=[...data["workshop.html"].matchAll(/<script[^>]+src="([^"]+)"/g)].map(match=>match[1]);
assert.deepEqual(scripts,["workshop-analytics.js","workshop.js"],"Analytics module must initialize before game controller");
const htmlIds=[...data["workshop.html"].matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
assert.equal(htmlIds.length,new Set(htmlIds).size,"Each DOM id must be unique");
assert.match(data["workshop.html"],/viewport-fit=cover/,"Respect iPhone safe areas");
assert.match(data["index.html"],/href="workshop.html"/,"Link new games from existing homepage");
assert.match(data["workshop.css"],/@media\s*\(max-width:520px\)/,"Responsive phone layout required");
for(const functionName of ["arb_ws_public","arb_ws_submit","arb_ws_join","arb_ws_admin"]){
 assert.ok(data["workshop.js"].includes('"'+functionName+'"'),"Missing backend RPC "+functionName);
}
for(const element of ["wsQuestion","wsAdmin","wsAdminTabs","wsOverlay","wsJoinForm","wsExport"]){
 assert.ok(htmlIds.includes(element),"Missing critical UI element "+element);
}
assert.match(data["workshop-analytics.js"],/wsPercentile/,"Salary percentiles must be calculated");
assert.match(data["workshop-analytics.js"],/wsHistogram/,"Salary histogram required");
assert.match(data["workshop-analytics.js"],/wsBand/,"Salary band visualization required");
assert.match(data["workshop-analytics.js"],/wsLegalSum/,"Legal accuracy required");
assert.match(data["workshop.js"],/ws\.busy/,"Double-submission guard required");
console.log("✓ Static UI, responsive, routing and dashboard checks passed");
