!function(){"use strict";var e,r,_,t,n,u,i,a,c,o,b={},p={};function __webpack_require__(e){var r=p[e];if(void 0!==r)return r.exports;var _=p[e]={exports:{}},t=!0;try{b[e].call(_.exports,_,_.exports,__webpack_require__),t=!1}finally{t&&delete p[e]}return _.exports}__webpack_require__.m=b,e=[],__webpack_require__.O=function(r,_,t,n){if(_){n=n||0;for(var u=e.length;u>0&&e[u-1][2]>n;u--)e[u]=e[u-1];e[u]=[_,t,n];return}for(var i=1/0,u=0;u<e.length;u++){for(var _=e[u][0],t=e[u][1],n=e[u][2],a=!0,c=0;c<_.length;c++)i>=n&&Object.keys(__webpack_require__.O).every(function(e){return __webpack_require__.O[e](_[c])})?_.splice(c--,1):(a=!1,n<i&&(i=n));if(a){e.splice(u--,1);var o=t()}}return o},__webpack_require__.n=function(e){var r=e&&e.__esModule?function(){return e.default}:function(){return e};return __webpack_require__.d(r,{a:r}),r},__webpack_require__.d=function(e,r){for(var _ in r)__webpack_require__.o(r,_)&&!__webpack_require__.o(e,_)&&Object.defineProperty(e,_,{enumerable:!0,get:r[_]})},__webpack_require__.f={},__webpack_require__.e=function(e){return Promise.all(Object.keys(__webpack_require__.f).reduce(function(r,_){return __webpack_require__.f[_](e,r),r},[]))},__webpack_require__.u=function(e){return"static/chunks/"+(({126:"f65a48b9",655:"11e07bb4",746:"b8074065"})[e]||e)+"."+({126:"7e1704e9e22f98bb",175:"b3bb21000d54e125",321:"41b1c33f3faebdf5",347:"0e7805242bda1b36",411:"0fd3fd3c73920cd4",522:"a2f5d924712abecf",588:"495e80fd7e2e5ca2",655:"4aeacb2fd8ee4f03",659:"44713a9bb4823558",672:"b2ba4370c57f420d",746:"0cc14a7ab66ca858",824:"0f9c777f0aedb712"})[e]+".js"},__webpack_require__.miniCssF=function(e){return"static/css/"+({405:"b25e1c9869a42afc",824:"0585100487f975e6",888:"c78061c13dda9b05"})[e]+".css"},__webpack_require__.o=function(e,r){return Object.prototype.hasOwnProperty.call(e,r)},r={},_="_N_E:",__webpack_require__.l=function(e,t,n,u){if(r[e]){r[e].push(t);return}if(void 0!==n)for(var i,a,c=document.getElementsByTagName("script"),o=0;o<c.length;o++){var b=c[o];if(b.getAttribute("src")==e||b.getAttribute("data-webpack")==_+n){i=b;break}}i||(a=!0,(i=document.createElement("script")).charset="utf-8",i.timeout=120,__webpack_require__.nc&&i.setAttribute("nonce",__webpack_require__.nc),i.setAttribute("data-webpack",_+n),i.src=__webpack_require__.tu(e)),r[e]=[t];var onScriptComplete=function(_,t){i.onerror=i.onload=null,clearTimeout(p);var n=r[e];if(delete r[e],i.parentNode&&i.parentNode.removeChild(i),n&&n.forEach(function(e){return e(t)}),_)return _(t)},p=setTimeout(onScriptComplete.bind(null,void 0,{type:"timeout",target:i}),12e4);i.onerror=onScriptComplete.bind(null,i.onerror),i.onload=onScriptComplete.bind(null,i.onload),a&&document.head.appendChild(i)},__webpack_require__.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},__webpack_require__.tt=function(){return void 0===t&&(t={createScriptURL:function(e){return e}},"undefined"!=typeof trustedTypes&&trustedTypes.createPolicy&&(t=trustedTypes.createPolicy("nextjs#bundler",t))),t},__webpack_require__.tu=function(e){return __webpack_require__.tt().createScriptURL(e)},__webpack_require__.p="/webgpu-snow-accumulation/_next/",n=function(e,r,_,t){var n=document.createElement("link");return n.rel="stylesheet",n.type="text/css",n.onerror=n.onload=function(u){if(n.onerror=n.onload=null,"load"===u.type)_();else{var i=u&&("load"===u.type?"missing":u.type),a=u&&u.target&&u.target.href||r,c=Error("Loading CSS chunk "+e+" failed.\n("+a+")");c.code="CSS_CHUNK_LOAD_FAILED",c.type=i,c.request=a,n.parentNode.removeChild(n),t(c)}},n.href=r,document.head.appendChild(n),n},u=function(e,r){for(var _=document.getElementsByTagName("link"),t=0;t<_.length;t++){var n=_[t],u=n.getAttribute("data-href")||n.getAttribute("href");if("stylesheet"===n.rel&&(u===e||u===r))return n}for(var i=document.getElementsByTagName("style"),t=0;t<i.length;t++){var n=i[t],u=n.getAttribute("data-href");if(u===e||u===r)return n}},i={272:0},__webpack_require__.f.miniCss=function(e,r){i[e]?r.push(i[e]):0!==i[e]&&({824:1})[e]&&r.push(i[e]=new Promise(function(r,_){var t=__webpack_require__.miniCssF(e),i=__webpack_require__.p+t;if(u(t,i))return r();n(e,i,r,_)}).then(function(){i[e]=0},function(r){throw delete i[e],r}))},a={272:0},__webpack_require__.f.j=function(e,r){var _=__webpack_require__.o(a,e)?a[e]:void 0;if(0!==_){if(_)r.push(_[2]);else if(272!=e){var t=new Promise(function(r,t){_=a[e]=[r,t]});r.push(_[2]=t);var n=__webpack_require__.p+__webpack_require__.u(e),u=Error();__webpack_require__.l(n,function(r){if(__webpack_require__.o(a,e)&&(0!==(_=a[e])&&(a[e]=void 0),_)){var t=r&&("load"===r.type?"missing":r.type),n=r&&r.target&&r.target.src;u.message="Loading chunk "+e+" failed.\n("+t+": "+n+")",u.name="ChunkLoadError",u.type=t,u.request=n,_[1](u)}},"chunk-"+e,e)}else a[e]=0}},__webpack_require__.O.j=function(e){return 0===a[e]},c=function(e,r){var _,t,n=r[0],u=r[1],i=r[2],c=0;if(n.some(function(e){return 0!==a[e]})){for(_ in u)__webpack_require__.o(u,_)&&(__webpack_require__.m[_]=u[_]);if(i)var o=i(__webpack_require__)}for(e&&e(r);c<n.length;c++)t=n[c],__webpack_require__.o(a,t)&&a[t]&&a[t][0](),a[t]=0;return __webpack_require__.O(o)},(o=self.webpackChunk_N_E=self.webpackChunk_N_E||[]).forEach(c.bind(null,0)),o.push=c.bind(null,o.push.bind(o))}();