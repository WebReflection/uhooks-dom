self.uhooksDOM=function(e){"use strict";var t=CustomEvent;const n=(e,t,n,c)=>{const o=new WeakMap,a=new WeakMap,r=new WeakMap,l=e=>o.has(e),i=e=>{l(e)&&(u(e,e.removeEventListener,o.get(e)),o.delete(e))},u=(e,t,n)=>{t.call(e,"disconnected",n),t.call(e,"connected",n)},h=(e,t,n,s)=>{for(let{length:c}=e,o=0;o<c;o++)d(e[o],t,n,s)},d=(e,s,c,o)=>{l(e)&&!c.has(e)&&(o.delete(e),c.set(e,0),e.dispatchEvent(new(n||CustomEvent)(s))),h(e[t||"children"]||[],s,c,o)},p=new(c||MutationObserver)((e=>{for(let{length:t}=e,n=0;n<t;n++){const{removedNodes:t,addedNodes:s}=e[n];h(t,"disconnected",r,a),h(s,"connected",a,r)}}));return p.observe(e||document,{subtree:!0,childList:!0}),{has:l,connect:(e,t)=>{i(e),(t||(t={})).handleEvent||(t.handleEvent=s),u(e,e.addEventListener,t),o.set(e,t)},disconnect:i,kill(){p.disconnect()}}};function s(e){e.type in this&&this[e.type](e)}var c=Promise;let o=null,a=new Set;const r=e=>{const{$:t,r:n,h:s}=e;f(n)&&(i.get(s).delete(e),n()),f(e.r=t())&&i.get(s).add(e)},l=()=>{const e=a;a=new Set,e.forEach((({h:e,c:t,a:n,e:s})=>{s&&e.apply(t,n)}))},i=new WeakMap,u=[],h=[];function d(e,t){return e!==this[t]}const p=()=>o,f=e=>"function"==typeof e,v=e=>{const t={h:n,c:null,a:null,e:0,i:0,s:[]};return n;function n(){const n=o;o=t,t.e=t.i=0;try{return e.apply(t.c=this,t.a=arguments)}finally{o=n,u.length&&w.then(u.forEach.bind(u.splice(0),r)),h.length&&h.splice(0).forEach(r)}}},w=new c((e=>e()));function y(e){const{_:t,value:n}=this;n!==e&&(this._=new Set,this.value=e,t.forEach((({h:e,c:t,a:n})=>{e.apply(t,n)})))}const g=(e,t)=>{const n=p(),{i:s,s:c}=n;return s!==c.length&&t&&!t.some(d,c[s]._)||(c[s]={$:e(),_:t}),c[n.i++].$},E=e=>(t,n)=>{const s=p(),{i:c,s:o,h:a}=s,r=c===o.length;s.i++,r&&(i.has(a)||i.set(a,new Set),o[c]={$:t,_:n,r:null,h:a}),(r||!n||n.some(d,o[c]._))&&e.push(o[c]),o[c].$=t,o[c]._=n},k=E(u),m=E(h),M=(e,t)=>f(t)?t(e):t,$=(e,t,n)=>{const s=p(),{i:c,s:o}=s;c===o.length&&o.push({$:f(n)?n(t):M(void 0,t),set:t=>{o[c].$=e(o[c].$,t),(e=>{a.has(e)||(e.e=1,a.add(e),w.then(l))})(s)}});const{$:r,set:i}=o[s.i++];return[r,i]},_=new WeakMap,b=e=>(e=>{const t=i.get(e);t&&w.then((()=>{t.forEach((e=>{e.r(),e.r=null})),t.clear()}))})(_.get(e)),S=e=>(e=>i.has(e))(_.get(e)),W=e=>{const t=v(e);return _.set(n,t),n;async function n(){return await t.apply(this,arguments)}};
/*! (c) Andrea Giammarchi - ISC */
let C=null,L=null,x=null;const O=new WeakMap,D=new WeakMap,N=(e,t,n,s)=>{const c=c=>{O.has(e)||(O.set(e,0),w.then((()=>{O.delete(e),e.apply(t,n)}))),s(c)};return D.set(s,c),c},R=(e,t,n,s)=>e?[s[0],D.get(s[1])||N(e,t,n,s[1])]:s,T=(e,t)=>{const n=W(t?async function(){const[t,s,c]=[C,L,x];[C,L,x]=[n,this,arguments];try{return await e.apply(L,x)}finally{[C,L,x]=[t,s,c]}}:e);return n};
/*! (c) Andrea Giammarchi - ISC */
let P=null;const j=({firstChild:e})=>{if(e&&1!==e.nodeType&&!(e=e.nextElementSibling))throw"unobservable";return e},q=e=>{const{nodeType:t}=e;if(t)return 1===t?e:j(e);{const t=e.valueOf();return t!==e?q(t):j(t)}};return e.createContext=e=>({_:new Set,provide:y,value:e}),e.hooked=(e,s)=>{const c=T(e,s);return async function(){const e=await c.apply(this,arguments);if(S(c)){const s=q(e);P||(P=n(s.ownerDocument,"children",t)),P.has(s)||P.connect(s,{disconnected(){b(c)}})}return e}},e.useCallback=(e,t)=>g((()=>e),t),e.useContext=({_:e,value:t})=>(e.add(p()),t),e.useEffect=k,e.useLayoutEffect=m,e.useMemo=g,e.useReducer=(e,t,n)=>R(C,L,x,$(e,t,n)),e.useRef=e=>{const t=p(),{i:n,s:s}=t;return n===s.length&&s.push({current:e}),s[t.i++]},e.useState=e=>R(C,L,x,(e=>$(M,e))(e)),e.wait=w,e}({});
