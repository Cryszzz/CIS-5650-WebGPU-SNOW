"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[347],{3704:function(e,t,r){r.d(t,{Z:function(){return BaseDecoder}});let BaseDecoder=class BaseDecoder{async decode(e,t){let r=await this.decodeBlock(t),n=e.Predictor||1;if(1!==n){let t=!e.StripOffsets,a=t?e.TileWidth:e.ImageWidth,i=t?e.TileLength:e.RowsPerStrip||e.ImageLength;return function(e,t,r,n,a,i){if(!t||1===t)return e;for(let e=0;e<a.length;++e){if(a[e]%8!=0)throw Error("When decoding with predictor, only multiple of 8 bits are supported.");if(a[e]!==a[0])throw Error("When decoding with predictor, all samples must have the same size.")}let l=a[0]/8,s=2===i?1:a.length;for(let i=0;i<n;++i){let n;if(i*s*r*l>=e.byteLength)break;if(2===t){switch(a[0]){case 8:n=new Uint8Array(e,i*s*r*l,s*r*l);break;case 16:n=new Uint16Array(e,i*s*r*l,s*r*l/2);break;case 32:n=new Uint32Array(e,i*s*r*l,s*r*l/4);break;default:throw Error(`Predictor 2 not allowed with ${a[0]} bits per sample.`)}!function(e,t){let r=e.length-t,n=0;do{for(let r=t;r>0;r--)e[n+t]+=e[n],n++;r-=t}while(r>0)}(n,s,l)}else 3===t&&function(e,t,r){let n=0,a=e.length,i=a/r;for(;a>t;){for(let r=t;r>0;--r)e[n+t]+=e[n],++n;a-=t}let l=e.slice();for(let t=0;t<i;++t)for(let n=0;n<r;++n)e[r*t+n]=l[(r-n-1)*i+t]}(n=new Uint8Array(e,i*s*r*l,s*r*l),s,l)}return e}(r,n,a,i,e.BitsPerSample,e.PlanarConfiguration)}return r}}},9347:function(e,t,r){r.r(t),r.d(t,{default:function(){return JpegDecoder}});var n=r(3704);let a=new Int32Array([0,1,8,16,9,2,3,10,17,24,32,25,18,11,4,5,12,19,26,33,40,48,41,34,27,20,13,6,7,14,21,28,35,42,49,56,57,50,43,36,29,22,15,23,30,37,44,51,58,59,52,45,38,31,39,46,53,60,61,54,47,55,62,63]);function buildHuffmanTable(e,t){let r,n=0,a=[],i=16;for(;i>0&&!e[i-1];)--i;a.push({children:[],index:0});let l=a[0];for(let s=0;s<i;s++){for(let i=0;i<e[s];i++){for((l=a.pop()).children[l.index]=t[n];l.index>0;)l=a.pop();for(l.index++,a.push(l);a.length<=s;)a.push(r={children:[],index:0}),l.children[l.index]=r.children,l=r;n++}s+1<i&&(a.push(r={children:[],index:0}),l.children[l.index]=r.children,l=r)}return a[0].children}let JpegStreamReader=class JpegStreamReader{constructor(){this.jfif=null,this.adobe=null,this.quantizationTables=[],this.huffmanTablesAC=[],this.huffmanTablesDC=[],this.resetFrames()}resetFrames(){this.frames=[]}parse(e){let t=0;function readUint16(){let r=e[t]<<8|e[t+1];return t+=2,r}let r=readUint16();if(65496!==r)throw Error("SOI not found");for(r=readUint16();65497!==r;){switch(r){case 65280:break;case 65504:case 65505:case 65506:case 65507:case 65508:case 65509:case 65510:case 65511:case 65512:case 65513:case 65514:case 65515:case 65516:case 65517:case 65518:case 65519:case 65534:{let n=function(){let r=readUint16(),n=e.subarray(t,t+r-2);return t+=n.length,n}();65504===r&&74===n[0]&&70===n[1]&&73===n[2]&&70===n[3]&&0===n[4]&&(this.jfif={version:{major:n[5],minor:n[6]},densityUnits:n[7],xDensity:n[8]<<8|n[9],yDensity:n[10]<<8|n[11],thumbWidth:n[12],thumbHeight:n[13],thumbData:n.subarray(14,14+3*n[12]*n[13])}),65518===r&&65===n[0]&&100===n[1]&&111===n[2]&&98===n[3]&&101===n[4]&&0===n[5]&&(this.adobe={version:n[6],flags0:n[7]<<8|n[8],flags1:n[9]<<8|n[10],transformCode:n[11]});break}case 65499:{let r=readUint16(),n=r+t-2;for(;t<n;){let r=e[t++],n=new Int32Array(64);if(r>>4==0)for(let r=0;r<64;r++){let i=a[r];n[i]=e[t++]}else if(r>>4==1)for(let e=0;e<64;e++){let t=a[e];n[t]=readUint16()}else throw Error("DQT: invalid table spec");this.quantizationTables[15&r]=n}break}case 65472:case 65473:case 65474:{let n;readUint16();let a={extended:65473===r,progressive:65474===r,precision:e[t++],scanLines:readUint16(),samplesPerLine:readUint16(),components:{},componentsOrder:[]},i=e[t++];for(let r=0;r<i;r++){n=e[t];let r=e[t+1]>>4,i=15&e[t+1],l=e[t+2];a.componentsOrder.push(n),a.components[n]={h:r,v:i,quantizationIdx:l},t+=3}!function(e){let t,r,n=0,a=0;for(r in e.components)e.components.hasOwnProperty(r)&&(n<(t=e.components[r]).h&&(n=t.h),a<t.v&&(a=t.v));let i=Math.ceil(e.samplesPerLine/8/n),l=Math.ceil(e.scanLines/8/a);for(r in e.components)if(e.components.hasOwnProperty(r)){t=e.components[r];let s=Math.ceil(Math.ceil(e.samplesPerLine/8)*t.h/n),o=Math.ceil(Math.ceil(e.scanLines/8)*t.v/a),f=i*t.h,c=l*t.v,u=[];for(let e=0;e<c;e++){let e=[];for(let t=0;t<f;t++)e.push(new Int32Array(64));u.push(e)}t.blocksPerLine=s,t.blocksPerColumn=o,t.blocks=u}e.maxH=n,e.maxV=a,e.mcusPerLine=i,e.mcusPerColumn=l}(a),this.frames.push(a);break}case 65476:{let r=readUint16();for(let n=2;n<r;){let r=e[t++],a=new Uint8Array(16),i=0;for(let r=0;r<16;r++,t++)a[r]=e[t],i+=a[r];let l=new Uint8Array(i);for(let r=0;r<i;r++,t++)l[r]=e[t];n+=17+i,r>>4==0?this.huffmanTablesDC[15&r]=buildHuffmanTable(a,l):this.huffmanTablesAC[15&r]=buildHuffmanTable(a,l)}break}case 65501:readUint16(),this.resetInterval=readUint16();break;case 65498:{readUint16();let r=e[t++],n=[],i=this.frames[0];for(let a=0;a<r;a++){let r=i.components[e[t++]],a=e[t++];r.huffmanTableDC=this.huffmanTablesDC[a>>4],r.huffmanTableAC=this.huffmanTablesAC[15&a],n.push(r)}let l=e[t++],s=e[t++],o=e[t++],f=function(e,t,r,n,i,l,s,o,f){let c,u,d,h,m,b,p,w,k;let{mcusPerLine:g,progressive:y}=r,A=t,v=0,T=0;function readBit(){if(T>0)return T--,v>>T&1;if(255===(v=e[A++])){let t=e[A++];if(t)throw Error(`unexpected marker: ${(v<<8|t).toString(16)}`)}return T=7,v>>>7}function decodeHuffman(e){let t,r=e;for(;null!==(t=readBit());){if("number"==typeof(r=r[t]))return r;if("object"!=typeof r)throw Error("invalid huffman sequence")}return null}function receive(e){let t=e,r=0;for(;t>0;){let e=readBit();if(null===e)return;r=r<<1|e,--t}return r}function receiveAndExtend(e){let t=receive(e);return t>=1<<e-1?t:t+(-1<<e)+1}let x=0,U=0,P=n.length;p=y?0===l?0===o?function(e,t){let r=decodeHuffman(e.huffmanTableDC),n=0===r?0:receiveAndExtend(r)<<f;e.pred+=n,t[0]=e.pred}:function(e,t){t[0]|=readBit()<<f}:0===o?function(e,t){if(x>0){x--;return}let r=l;for(;r<=s;){let n=decodeHuffman(e.huffmanTableAC),i=15&n,l=n>>4;if(0===i){if(l<15){x=receive(l)+(1<<l)-1;break}r+=16}else{r+=l;let e=a[r];t[e]=receiveAndExtend(i)*(1<<f),r++}}}:function(e,t){let r=l,n=0;for(;r<=s;){let i=a[r],l=t[i]<0?-1:1;switch(U){case 0:{let t=decodeHuffman(e.huffmanTableAC),r=15&t;if(n=t>>4,0===r)n<15?(x=receive(n)+(1<<n),U=4):(n=16,U=1);else{if(1!==r)throw Error("invalid ACn encoding");c=receiveAndExtend(r),U=n?2:3}continue}case 1:case 2:t[i]?t[i]+=(readBit()<<f)*l:0==--n&&(U=2===U?3:0);break;case 3:t[i]?t[i]+=(readBit()<<f)*l:(t[i]=c<<f,U=0);break;case 4:t[i]&&(t[i]+=(readBit()<<f)*l)}r++}4===U&&0==--x&&(U=0)}:function(e,t){let r=decodeHuffman(e.huffmanTableDC),n=0===r?0:receiveAndExtend(r);e.pred+=n,t[0]=e.pred;let i=1;for(;i<64;){let r=decodeHuffman(e.huffmanTableAC),n=15&r,l=r>>4;if(0===n){if(l<15)break;i+=16}else{i+=l;let e=a[i];t[e]=receiveAndExtend(n),i++}}};let C=0;k=1===P?n[0].blocksPerLine*n[0].blocksPerColumn:g*r.mcusPerColumn;let E=i||k;for(;C<k;){for(d=0;d<P;d++)n[d].pred=0;if(x=0,1===P)for(b=0,u=n[0];b<E;b++)!function(e,t,r){let n=r/e.blocksPerLine|0,a=r%e.blocksPerLine;t(e,e.blocks[n][a])}(u,p,C),C++;else for(b=0;b<E;b++){for(d=0;d<P;d++){u=n[d];let{h:e,v:t}=u;for(h=0;h<t;h++)for(m=0;m<e;m++)!function(e,t,r,n,a){let i=(r/g|0)*e.v+n,l=r%g*e.h+a;t(e,e.blocks[i][l])}(u,p,C,h,m)}if(++C===k)break}if(T=0,(w=e[A]<<8|e[A+1])<65280)throw Error("marker was not found");if(w>=65488&&w<=65495)A+=2;else break}return A-t}(e,t,i,n,this.resetInterval,l,s,o>>4,15&o);t+=f;break}case 65535:255!==e[t]&&t--;break;default:if(255===e[t-3]&&e[t-2]>=192&&e[t-2]<=254){t-=3;break}throw Error(`unknown JPEG marker ${r.toString(16)}`)}r=readUint16()}}getResult(){let{frames:e}=this;if(0===this.frames.length)throw Error("no frames were decoded");this.frames.length>1&&console.warn("more than one frame is not supported");for(let e=0;e<this.frames.length;e++){let t=this.frames[e].components;for(let e of Object.keys(t))t[e].quantizationTable=this.quantizationTables[t[e].quantizationIdx],delete t[e].quantizationIdx}let t=e[0],{components:r,componentsOrder:n}=t,a=[],i=t.samplesPerLine,l=t.scanLines;for(let e=0;e<n.length;e++){let i=r[n[e]];a.push({lines:function(e,t){let r=[],{blocksPerLine:n,blocksPerColumn:a}=t,i=n<<3,l=new Int32Array(64),s=new Uint8Array(64);for(let e=0;e<a;e++){let a=e<<3;for(let e=0;e<8;e++)r.push(new Uint8Array(i));for(let i=0;i<n;i++){!function(e,r,n){let a,i,l,s,o,f,c,u,d,h;let m=t.quantizationTable;for(h=0;h<64;h++)n[h]=e[h]*m[h];for(h=0;h<8;++h){let e=8*h;if(0===n[1+e]&&0===n[2+e]&&0===n[3+e]&&0===n[4+e]&&0===n[5+e]&&0===n[6+e]&&0===n[7+e]){d=5793*n[0+e]+512>>10,n[0+e]=d,n[1+e]=d,n[2+e]=d,n[3+e]=d,n[4+e]=d,n[5+e]=d,n[6+e]=d,n[7+e]=d;continue}a=5793*n[0+e]+128>>8,i=5793*n[4+e]+128>>8,l=n[2+e],s=n[6+e],o=2896*(n[1+e]-n[7+e])+128>>8,u=2896*(n[1+e]+n[7+e])+128>>8,f=n[3+e]<<4,c=n[5+e]<<4,d=a-i+1>>1,a=a+i+1>>1,i=d,d=3784*l+1567*s+128>>8,l=1567*l-3784*s+128>>8,s=d,d=o-c+1>>1,o=o+c+1>>1,c=d,d=u+f+1>>1,f=u-f+1>>1,u=d,d=a-s+1>>1,a=a+s+1>>1,s=d,d=i-l+1>>1,i=i+l+1>>1,l=d,d=2276*o+3406*u+2048>>12,o=3406*o-2276*u+2048>>12,u=d,d=799*f+4017*c+2048>>12,f=4017*f-799*c+2048>>12,c=d,n[0+e]=a+u,n[7+e]=a-u,n[1+e]=i+c,n[6+e]=i-c,n[2+e]=l+f,n[5+e]=l-f,n[3+e]=s+o,n[4+e]=s-o}for(h=0;h<8;++h){let e=h;if(0===n[8+e]&&0===n[16+e]&&0===n[24+e]&&0===n[32+e]&&0===n[40+e]&&0===n[48+e]&&0===n[56+e]){d=5793*n[h+0]+8192>>14,n[0+e]=d,n[8+e]=d,n[16+e]=d,n[24+e]=d,n[32+e]=d,n[40+e]=d,n[48+e]=d,n[56+e]=d;continue}a=5793*n[0+e]+2048>>12,i=5793*n[32+e]+2048>>12,l=n[16+e],s=n[48+e],o=2896*(n[8+e]-n[56+e])+2048>>12,u=2896*(n[8+e]+n[56+e])+2048>>12,f=n[24+e],c=n[40+e],d=a-i+1>>1,a=a+i+1>>1,i=d,d=3784*l+1567*s+2048>>12,l=1567*l-3784*s+2048>>12,s=d,d=o-c+1>>1,o=o+c+1>>1,c=d,d=u+f+1>>1,f=u-f+1>>1,u=d,d=a-s+1>>1,a=a+s+1>>1,s=d,d=i-l+1>>1,i=i+l+1>>1,l=d,d=2276*o+3406*u+2048>>12,o=3406*o-2276*u+2048>>12,u=d,d=799*f+4017*c+2048>>12,f=4017*f-799*c+2048>>12,c=d,n[0+e]=a+u,n[56+e]=a-u,n[8+e]=i+c,n[48+e]=i-c,n[16+e]=l+f,n[40+e]=l-f,n[24+e]=s+o,n[32+e]=s-o}for(h=0;h<64;++h){let e=128+(n[h]+8>>4);e<0?r[h]=0:e>255?r[h]=255:r[h]=e}}(t.blocks[e][i],s,l);let n=0,o=i<<3;for(let e=0;e<8;e++){let t=r[a+e];for(let e=0;e<8;e++)t[o+e]=s[n++]}}}return r}(0,i),scaleX:i.h/t.maxH,scaleY:i.v/t.maxV})}let s=new Uint8Array(i*l*a.length),o=0;for(let e=0;e<l;++e)for(let t=0;t<i;++t)for(let r=0;r<a.length;++r){let n=a[r];s[o]=n.lines[0|e*n.scaleY][0|t*n.scaleX],++o}return s}};let JpegDecoder=class JpegDecoder extends n.Z{constructor(e){super(),this.reader=new JpegStreamReader,e.JPEGTables&&this.reader.parse(e.JPEGTables)}decodeBlock(e){return this.reader.resetFrames(),this.reader.parse(new Uint8Array(e)),this.reader.getResult().buffer}}}}]);