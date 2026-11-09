import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {createRequire} from 'node:module';import {seed,tables,exercises} from '../lib/training/domain.mjs';
const require=createRequire(import.meta.url),vendor=fs.readFileSync('public/vendor/sql-wasm.js','utf8');let box={module:{exports:{}},exports:{},require,console,__dirname:process.cwd()+'/public/vendor',process,Buffer,TextDecoder,TextEncoder,setTimeout,clearTimeout};vm.runInNewContext(vendor,box);const SQL=await box.module.exports({wasmBinary:fs.readFileSync('public/vendor/sql-wasm.wasm')});let context=vm.createContext({console,initSqlJs:async()=>SQL,importScripts(){},onmessage:null,postMessage:null});vm.runInContext(fs.readFileSync('public/sql-catalog.js','utf8'),context);vm.runInContext(fs.readFileSync('public/sql-worker.js','utf8'),context);async function run(data){let out;context.postMessage=x=>out=x;await context.onmessage({data});return out}
test('all 15 SQL solutions pass current, empty and varied fixtures',async()=>{for(const ex of exercises){let out=await run({tables:tables(seed()),sql:ex.solution,exercise:ex.id});assert.equal(out.error,undefined,ex.id+': '+out.error);assert.equal(out.assessment.passed,true,ex.id+': '+JSON.stringify(out.assessment))}});
test('empty schema exists, SQL writes denied, incorrect exercise rejected',async()=>{let empty=await run({tables:{},sql:'SELECT COUNT(*) FROM results'});assert.equal(empty.values[0][0],0);let write=await run({tables:{},sql:'DELETE FROM patients'});assert.match(write.error,/read-only/);let many=await run({tables:{},sql:'SELECT 1; SELECT 2'});assert.match(many.error,/one SQL/);let wrong=await run({tables:tables(seed()),sql:'SELECT 0',exercise:'SQL-1'});assert.equal(wrong.assessment.passed,false)});

test('query limits reject oversized results while preserving SQLite column order',async()=>{
  const duplicate=await run({tables:{},sql:"SELECT 'P1' AS id, 'E1' AS id, ';' AS sample"});
  assert.deepEqual(Array.from(duplicate.columns),['id','id','sample']);
  assert.deepEqual(Array.from(duplicate.values[0]),['P1','E1',';']);
  const tooMany=await run({tables:{},sql:'WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<2001) SELECT x FROM n'});
  assert.match(tooMany.error,/2,000 rows/);
});
