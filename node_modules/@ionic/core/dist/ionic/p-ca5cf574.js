/*!
 * (C) Ionic http://ionicframework.com - MIT License
 */
import{h as l}from"./p-63eb0acd.js";const a=a=>{const e=a;let n;return{hasLegacyControl:()=>{if(void 0===n){const a=void 0!==e.label||o(e),r=e.hasAttribute("aria-label")||e.hasAttribute("aria-labelledby")&&null===e.shadowRoot,t=l(e);n=!0===e.legacy||!a&&!r&&null!==t}return n}}},o=l=>!!(null!==l.shadowRoot&&(e.includes(l.tagName)&&null!==l.querySelector('[slot="label"]')||n.includes(l.tagName)&&""!==l.textContent)),e=["ION-RANGE"],n=["ION-TOGGLE","ION-CHECKBOX","ION-RADIO"];export{a as c}