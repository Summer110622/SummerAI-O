// SPDX-License-Identifier: MIT
function createEngine(spec) {
  if(spec.model.type!=="BPE" || spec.normalizer!==null || spec.pre_tokenizer.type!=="ByteLevel" || spec.pre_tokenizer.add_prefix_space || !spec.pre_tokenizer.use_regex || spec.model.dropout!==null || spec.model.ignore_merges || spec.model.continuing_subword_prefix || spec.model.end_of_word_suffix || spec.model.byte_fallback) throw Error("Unsupported tokenizer configuration.");
  const vocab=spec.model.vocab, V=Object.keys(vocab).length;
  const pieces=new Array(V);
  for(const [p,id] of Object.entries(vocab)) pieces[id]=p;
  if(V!==264498 || pieces.some(x=>typeof x!=="string")) throw Error("Unexpected vocabulary.");
  const bs=[], cs=[];
  for(let i=33;i<=126;i++) bs.push(i);
  for(let i=161;i<=172;i++) bs.push(i);
  for(let i=174;i<=255;i++) bs.push(i);
  cs.push(...bs);
  const seen=new Set(bs); let n=0;
  for(let b=0;b<256;b++) if(!seen.has(b)){bs.push(b);cs.push(256+n++);}
  const byteToId=new Int32Array(256), charToByte=new Map();
  for(let i=0;i<256;i++){
    const ch=String.fromCharCode(cs[i]);
    charToByte.set(ch,bs[i]); byteToId[bs[i]]=vocab[ch];
    if(vocab[ch]===undefined) throw Error("Missing byte alphabet.");
  }
  const pairs=new Map();
  for(let rank=0;rank<spec.model.merges.length;rank++){
    const m=spec.model.merges[rank], [a,b]=Array.isArray(m)?m:m.split(" ");
    const x=vocab[a], y=vocab[b], z=vocab[a+b];
    if(x===undefined || y===undefined || z===undefined) throw Error("Invalid merge "+rank);
    pairs.set(x*V+y,[rank,z]);
  }
  const specials=new Map(spec.added_tokens.map(t=>[t.content,t.id]));
  const specialIds=new Map(spec.added_tokens.map(t=>[t.id,t.content]));
  if(spec.added_tokens.some(t=>!t.special || t.single_word || t.lstrip || t.rstrip || t.normalized)) throw Error("Unsupported added tokens.");
  const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  const specialPattern=new RegExp("("+[...specials.keys()].sort((a,b)=>b.length-a.length).map(esc).join("|")+")","g");
  const pattern=/'(?:s|t|re|ve|m|ll|d)| ?\p{L}+| ?\p{N}+| ?[^\p{White_Space}\p{L}\p{N}]+|\p{White_Space}+(?!\P{White_Space})|\p{White_Space}+/gu;
  const te=new TextEncoder(), td=new TextDecoder("utf-8",{fatal:true,ignoreBOM:true});
  const cache=new Map();
  const less=(a,b)=>a.rank<b.rank || (a.rank===b.rank && a.i<b.i);
  function bpe(part){
    if(cache.has(part)) return cache.get(part);
    const raw=te.encode(part), len=raw.length;
    const symbols=Int32Array.from(raw,b=>byteToId[b]);
    const prev=new Int32Array(len),next=new Int32Array(len),alive=new Uint8Array(len),heap=[];
    for(let i=0;i<len;i++){prev[i]=i-1;next[i]=i+1<len?i+1:-1;alive[i]=1;}
    function push(i){
      if(i<0 || !alive[i]) return;
      const j=next[i]; if(j<0 || !alive[j]) return;
      const a=symbols[i],b=symbols[j],m=pairs.get(a*V+b);if(!m)return;
      const e={i,j,a,b,rank:m[0],id:m[1]};
      let k=heap.length;heap.push(e);
      while(k>0){const p=(k-1)>>1;if(!less(e,heap[p]))break;heap[k]=heap[p];k=p;}
      heap[k]=e;
    }
    function pop(){
      const result=heap[0],last=heap.pop();
      if(heap.length){let k=0;while(2*k+1<heap.length){let c=2*k+1;if(c+1<heap.length&&less(heap[c+1],heap[c]))c++;if(!less(heap[c],last))break;heap[k]=heap[c];k=c;}heap[k]=last;}
      return result;
    }
    for(let i=0;i<len-1;i++)push(i);
    while(heap.length){
      const e=pop(),{i,j}=e;
      if(!alive[i]||!alive[j]||next[i]!==j||symbols[i]!==e.a||symbols[j]!==e.b)continue;
      symbols[i]=e.id;alive[j]=0;next[i]=next[j];if(next[j]>=0)prev[next[j]]=i;
      push(prev[i]);push(i);
    }
    const ids=[];for(let i=len?0:-1;i>=0;i=next[i])ids.push(symbols[i]);
    if(part.length<=256){if(cache.size>=4096)cache.clear();cache.set(part,ids);}
    return ids;
  }
  function encode(text){
    const ids=[];
    for(const part of text.split(specialPattern)){
      if(!part)continue;
      if(specials.has(part)){ids.push(specials.get(part));continue;}
      for(const m of part.matchAll(pattern))for(const id of bpe(m[0]))ids.push(id);
    }
    return ids;
  }
  function bytes(id){
    if(!Number.isInteger(id)||id<0||id>=V||typeof pieces[id]!=="string")throw Error("Unknown token ID: "+id);
    if(specialIds.has(id))return te.encode(specialIds.get(id));
    return Uint8Array.from(pieces[id],c=>{const b=charToByte.get(c);if(b===undefined)throw Error("Invalid byte piece");return b;});
  }
  function decode(ids){
    const arrays=ids.map(bytes),out=new Uint8Array(arrays.reduce((n,a)=>n+a.length,0));let pos=0;
    for(const a of arrays){out.set(a,pos);pos+=a.length;}
    return td.decode(out);
  }
  function label(id){
    const b=bytes(id);
    try{return td.decode(b);}catch{return [...b].map(x=>"<0x"+x.toString(16).toUpperCase().padStart(2,"0")+">").join("");}
  }
  return {encode,decode,label,vocabSize:V};
}
export {createEngine};
export const fixtures = [["人工知能を研究しています。",[216195,455,6397,5075,367]],["Artificial intelligence is transforming society.",[217082,28991,400,105201,11795,23]],["こんにちは！🚀🌸🤖",[24837,1031,194201,232,233155,63488,254]],["ภาษาไทย العربية हिन्दी",[129474,922,30835,66519,1615,657,669,499,1617,716]],["def main():\n    return True\n",[2680,3785,13960,517,1603,11671,208]],["\t\n\r\n    ",[177623,30552]],["café́",[76,91493,131063]],["﻿Hello",[56080,36708]],["I'm here.  Next",[50,9983,4357,23,230,27699]],["  日本語  ",[230,66921,267]],["<|user|><eos>",[4,3]]];
