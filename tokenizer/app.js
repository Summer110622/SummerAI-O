// SPDX-License-Identifier: MIT
import {createEngine, fixtures} from "./engine.js";
const $=id=>document.getElementById(id);
const SHA="182d590a84060a0b0744005147fb91f66389c230e225f2dde89e218170e45cec";
const EXPECTED=21450501, MAX=32*1024*1024;
const te=new TextEncoder(), td=new TextDecoder("utf-8",{fatal:true,ignoreBOM:true});
let engine=null,timer,loadGeneration=0,latestIds=[];
const samples={ja:"人工知能を研究しています。日本語の文章を効率的にトークン化します。",en:"Artificial intelligence is transforming society. Researchers are developing new technologies.",multi:"日本語 · 中文 · 한국어 · العربية · हिन्दी · ภาษาไทย · မြန်မာစာ · Ελληνικά · 🚀",code:"def fibonacci(n):\n    a, b = 0, 1\n    for _ in range(n):\n        a, b = b, a + b\n    return a\n"};
const COLOR_COUNT=8;
function placeholder(message){const node=document.createElement("span");node.className="empty";node.textContent=message;$("tokens").replaceChildren(node);}
function syncIds(){$("tokens").classList.toggle("show-ids",$("show-ids").checked);}
$("show-ids").addEventListener("change",syncIds);syncIds();
function status(message,error=false,ready=false){$("status").textContent=message;$("status").dataset.error=String(error);$("status").dataset.ready=String(ready);}
function enable(ok){for(const id of ["copy","download","decode"])$(id).disabled=!ok;}
async function extractZip(buffer){
  const view=new DataView(buffer), u16=i=>view.getUint16(i,true),u32=i=>view.getUint32(i,true);
  let e=-1;for(let i=buffer.byteLength-22;i>=Math.max(0,buffer.byteLength-65557);i--){if(u32(i)===0x06054b50&&i+22+u16(i+20)===buffer.byteLength){e=i;break;}}
  if(e<0||u16(e+4)||u16(e+6))throw Error("Unsupported ZIP archive.");
  const count=u16(e+10);let p=u32(e+16);
  for(let n=0;n<count;n++){
    if(p+46>buffer.byteLength||u32(p)!==0x02014b50)throw Error("Invalid ZIP directory.");
    const flags=u16(p+8),method=u16(p+10),packed=u32(p+20),size=u32(p+24),nl=u16(p+28),el=u16(p+30),cl=u16(p+32),off=u32(p+42);
    const name=td.decode(new Uint8Array(buffer,p+46,nl));p+=46+nl+el+cl;
    if(name.split("/").pop()!=="tokenizer.json")continue;
    if((flags&1)||size!==EXPECTED||size>MAX||packed>MAX||off+30>buffer.byteLength||u32(off)!==0x04034b50)throw Error("Unexpected tokenizer ZIP entry.");
    const start=off+30+u16(off+26)+u16(off+28);
    if(start+packed>buffer.byteLength)throw Error("Truncated ZIP entry.");
    const data=buffer.slice(start,start+packed);
    if(method===0)return data;
    if(method!==8)throw Error("Unsupported ZIP compression. Extract tokenizer.json first.");
    let stream;
    try{stream=new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));}catch{throw Error("ZIP decompression unavailable. Extract tokenizer.json and select it instead.");}
    const reader=stream.getReader(), chunks=[];let total=0;
    try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>size)throw Error("ZIP size mismatch.");chunks.push(value);}}finally{await reader.cancel();}
    if(total!==size)throw Error("ZIP size mismatch.");
    const out=new Uint8Array(total);let q=0;for(const chunk of chunks){out.set(chunk,q);q+=chunk.byteLength;}return out.buffer;
  }
  throw Error("tokenizer.json was not found in this ZIP.");
}
async function load(buffer,generation){
  if(buffer.byteLength!==EXPECTED)throw Error("Not the original Custom Global 264K tokenizer.json.");
  const digest=[...new Uint8Array(await crypto.subtle.digest("SHA-256",buffer))].map(x=>x.toString(16).padStart(2,"0")).join("");
  if(digest!==SHA)throw Error("SHA-256 does not match the original model.");
  if(generation!==loadGeneration)return;
  status("Building local vocabulary and running reference checks…");
  await new Promise(r=>setTimeout(r,0));
  const candidate=createEngine(JSON.parse(td.decode(buffer)));
  for(const [s,expected] of fixtures){
    const ids=candidate.encode(s);
    if(JSON.stringify(ids)!==JSON.stringify(expected)||candidate.decode(ids)!==s)throw Error("Reference check failed: "+JSON.stringify(s));
  }
  if(generation!==loadGeneration)return;
  engine=candidate;enable(true);status("Ready · verified original model · "+fixtures.length+" reference checks passed",false,true);render();
}
async function select(file){
  const generation=++loadGeneration;enable(false);engine=null;placeholder("Loading selected tokenizer…");status("Reading "+file.name+"…");
  try{if(file.size>MAX)throw Error("File is too large.");let data=await file.arrayBuffer();if(file.name.toLowerCase().endsWith(".zip"))data=await extractZip(data);await load(data,generation);}
  catch(e){if(generation===loadGeneration){status(e.message,true);$("roundtrip").textContent="Model not loaded";placeholder("Unable to load tokenizer. Check the message above or select the original model file.");}}
}
function visible(s){return s.replace(/ /g,"␠").replace(/\n/g,"↵\n").replace(/\r/g,"␍").replace(/\t/g,"⇥");}
function render(){
  const s=$("input").value,n=te.encode(s).length;
  $("bytes").textContent=n.toLocaleString();$("chars").textContent=Array.from(s).length.toLocaleString();
  if(!engine)return;
  try{
    const ids=engine.encode(s),decoded=engine.decode(ids),ok=decoded===s;
    latestIds=ids;$("count").textContent=ids.length.toLocaleString();$("ratio").textContent=ids.length?(n/ids.length).toFixed(3):"—";
    $("roundtrip").textContent=ok?"Exact roundtrip ✓":"Roundtrip mismatch";$("roundtrip").dataset.error=String(!ok);
    $("ids").value=ids.join(", ");$("decoded").value=decoded;
    const frag=document.createDocumentFragment();
    for(let i=0;i<Math.min(ids.length,1500);i++){
      const id=ids[i],span=document.createElement("span"),label=document.createElement("span"),badge=document.createElement("span");
      span.className="piece token-color-"+(i%COLOR_COUNT);
      const piece=visible(engine.label(id));
      label.className="token-text";label.textContent=piece||"∅";
      badge.className="token-id";badge.textContent="#"+id;
      span.title="Token "+(i+1)+" · ID "+id;
      span.append(label,badge);frag.append(span);
    }
    if(ids.length){$("tokens").replaceChildren(frag);}else{placeholder("Enter text to see the colored token blocks.");}
    syncIds();$("shown").textContent=(ids.length>1500?"Showing first 1,500 of "+ids.length.toLocaleString()+" tokens. ":"")+"Each colored block represents one token. Spaces and control characters are marked; partial UTF-8 pieces are shown as hex bytes.";
  }catch(e){$("roundtrip").textContent=e.message;$("roundtrip").dataset.error="true";}
}
function parseIds(){const s=$("ids").value.trim();if(!s)return [];let a;if(s.startsWith("[")){a=JSON.parse(s);if(!Array.isArray(a))throw Error("Expected an array of token IDs.");}else a=s.split(/[\s,]+/).map(x=>{if(!/^\d+$/.test(x))throw Error("Invalid token ID: "+x);return Number(x);});if(a.length>200000||a.some(x=>!Number.isInteger(x)||x<0||x>=264498))throw Error("Invalid or excessive token IDs.");return a;}
$("file").addEventListener("change",e=>{if(e.target.files[0])select(e.target.files[0]);});
$("input").addEventListener("input",()=>{clearTimeout(timer);timer=setTimeout(render,150);});
document.querySelectorAll("[data-sample]").forEach(b=>b.addEventListener("click",()=>{$("input").value=samples[b.dataset.sample];render();}));
$("clear").addEventListener("click",()=>{$("input").value="";render();});
$("decode").addEventListener("click",()=>{try{$("decoded").value=engine.decode(parseIds());$("roundtrip").textContent="IDs decoded";$("roundtrip").dataset.error="false";}catch(e){$("roundtrip").textContent=e.message;$("roundtrip").dataset.error="true";}});
$("copy").addEventListener("click",async()=>{try{await navigator.clipboard.writeText($("ids").value);$("copy").textContent="Copied";setTimeout(()=>$("copy").textContent="Copy IDs",1200);}catch{$("ids").select();}});
$("download").addEventListener("click",()=>{try{const url=URL.createObjectURL(new Blob([JSON.stringify(parseIds())],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download="token-ids.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){$("roundtrip").textContent=e.message;}});
render();enable(false);
(async()=>{
  const generation=++loadGeneration;
  const errors=[];
  // The original asset is in tokenizer/tokenizer.json; retain root fallback.
  for(const path of ["./tokenizer.json","../tokenizer.json"]){
    if(generation!==loadGeneration)return;
    try{
      const r=await fetch(path,{cache:"no-cache"});
      if(!r.ok)throw Error("HTTP "+r.status);
      await load(await r.arrayBuffer(),generation);
      return;
    }catch(e){errors.push(path+": "+e.message);}
  }
  if(generation===loadGeneration){
    status("Automatic loading failed: "+errors.join(" | ")+". Select the original ZIP or tokenizer.json to continue locally.",true);
    placeholder("Tokenizer could not be loaded. Select the original model above.");
  }
})();
