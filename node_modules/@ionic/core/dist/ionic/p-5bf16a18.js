/*!
 * (C) Ionic http://ionicframework.com - MIT License
 */
const e=(e,t,n)=>{if("undefined"==typeof MutationObserver)return;const u=new MutationObserver((e=>{n(r(e,t))}));return u.observe(e,{childList:!0,subtree:!0}),u},r=(e,r)=>{let n;return e.forEach((e=>{for(let u=0;u<e.addedNodes.length;u++)n=t(e.addedNodes[u],r)||n})),n},t=(e,r)=>{if(1===e.nodeType)return(e.tagName===r.toUpperCase()?[e]:Array.from(e.querySelectorAll(r))).find((r=>r.value===e.value))};export{e as w}