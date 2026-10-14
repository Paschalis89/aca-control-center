// Pure numeric smoke tests for STEP 2–4; no npm dependencies except installed global TypeScript.
const fs=require('node:fs'), path=require('node:path'), assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');let ts;
try{ts=require('typescript')}catch{ts=require(process.env.NODE_PATH?.split(':').find(x=>fs.existsSync(path.join(x,'typescript')))?path.join(process.env.NODE_PATH.split(':').find(x=>fs.existsSync(path.join(x,'typescript'))),'typescript'):'/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript')}
function walk(folder){return fs.readdirSync(folder,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(folder,e.name)):[path.join(folder,e.name)]);}
const scripts=walk(path.join(root,'backend','src')).concat(walk(path.join(root,'frontend','src'))).filter(n=>n.endsWith('.ts'));
for(const f of scripts){const source=ts.createSourceFile(f,fs.readFileSync(f,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);assert.equal(source.parseDiagnostics.length,0,'TS syntax '+f);}
const name=path.join(root,'backend/src/commerce/shopify.service.ts');
const js=ts.transpileModule(fs.readFileSync(name,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,experimentalDecorators:true}}).outputText;
const mod={exports:{}};
const fakeRequire=name=>name==='@nestjs/common'?{Injectable:()=>x=>x,BadGatewayException:Error,ConflictException:Error,ServiceUnavailableException:Error}:name==='../db.service'?{Db:class{}}:require(name);
new Function('require','module','exports',js)(fakeRequire,mod,mod.exports);
const {calculateLineContribution,moneyValue}=mod.exports;
const line={lineAmount:170,quantity:1,currentQuantity:1,baseCostAtOrder:100};
const order={taxesIncluded:false,hasDiscounts:false,totalRefunded:0,cancelledAt:null};
assert.equal(calculateLineContribution(line,order),70);
assert.equal(calculateLineContribution({...line,baseCostAtOrder:null},order),null);
assert.equal(calculateLineContribution(line,{...order,taxesIncluded:true}),null);
assert.equal(calculateLineContribution(line,{...order,hasDiscounts:true}),null);
assert.equal(calculateLineContribution(line,{...order,totalRefunded:10}),null);
assert.equal(calculateLineContribution({...line,currentQuantity:0},order),null);
assert.equal(moneyValue({shopMoney:{amount:'123.45'}}),123.45);
console.log(`OK: ${scripts.length} TypeScript files parsed; 7 Shopify contribution/money assertions passed.`);
