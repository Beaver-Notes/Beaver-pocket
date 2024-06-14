import{i as Fn}from"./init-Gi6I4Gst.js";function B(n,e){return n==null||e==null?NaN:n<e?-1:n>e?1:n>=e?0:NaN}function _n(n,e){return n==null||e==null?NaN:e<n?-1:e>n?1:e>=n?0:NaN}function Rn(n){let e,r,t;n.length!==2?(e=B,r=(a,c)=>B(n(a),c),t=(a,c)=>n(a)-c):(e=n===B||n===_n?n:Dn,r=n,t=n);function i(a,c,u=0,l=a.length){if(u<l){if(e(c,c)!==0)return l;do{const s=u+l>>>1;r(a[s],c)<0?u=s+1:l=s}while(u<l)}return u}function o(a,c,u=0,l=a.length){if(u<l){if(e(c,c)!==0)return l;do{const s=u+l>>>1;r(a[s],c)<=0?u=s+1:l=s}while(u<l)}return u}function f(a,c,u=0,l=a.length){const s=i(a,c,u,l-1);return s>u&&t(a[s-1],c)>-t(a[s],c)?s-1:s}return{left:i,center:f,right:o}}function Dn(){return 0}function Ln(n){return n===null?NaN:+n}const On=Rn(B),Tn=On.right;Rn(Ln).center;const Bn=Math.sqrt(50),Gn=Math.sqrt(10),Vn=Math.sqrt(2);function G(n,e,r){const t=(e-n)/Math.max(0,r),i=Math.floor(Math.log10(t)),o=t/Math.pow(10,i),f=o>=Bn?10:o>=Gn?5:o>=Vn?2:1;let a,c,u;return i<0?(u=Math.pow(10,-i)/f,a=Math.round(n*u),c=Math.round(e*u),a/u<n&&++a,c/u>e&&--c,u=-u):(u=Math.pow(10,i)*f,a=Math.round(n/u),c=Math.round(e/u),a*u<n&&++a,c*u>e&&--c),c<a&&.5<=r&&r<2?G(n,e,r*2):[a,c,u]}function Xn(n,e,r){if(e=+e,n=+n,r=+r,!(r>0))return[];if(n===e)return[n];const t=e<n,[i,o,f]=t?G(e,n,r):G(n,e,r);if(!(o>=i))return[];const a=o-i+1,c=new Array(a);if(t)if(f<0)for(let u=0;u<a;++u)c[u]=(o-u)/-f;else for(let u=0;u<a;++u)c[u]=(o-u)*f;else if(f<0)for(let u=0;u<a;++u)c[u]=(i+u)/-f;else for(let u=0;u<a;++u)c[u]=(i+u)*f;return c}function W(n,e,r){return e=+e,n=+n,r=+r,G(n,e,r)[2]}function Un(n,e,r){e=+e,n=+n,r=+r;const t=e<n,i=t?W(e,n,r):W(n,e,r);return(t?-1:1)*(i<0?1/-i:i)}function tn(n,e,r){n.prototype=e.prototype=r,r.constructor=n}function Sn(n,e){var r=Object.create(n.prototype);for(var t in e)r[t]=e[t];return r}function C(){}var q=.7,V=1/q,H="\\s*([+-]?\\d+)\\s*",z="\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*",y="\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*",Yn=/^#([0-9a-f]{3,8})$/,Zn=new RegExp(`^rgb\\(${H},${H},${H}\\)$`),Jn=new RegExp(`^rgb\\(${y},${y},${y}\\)$`),Kn=new RegExp(`^rgba\\(${H},${H},${H},${z}\\)$`),Qn=new RegExp(`^rgba\\(${y},${y},${y},${z}\\)$`),Wn=new RegExp(`^hsl\\(${z},${y},${y}\\)$`),ne=new RegExp(`^hsla\\(${z},${y},${y},${z}\\)$`),hn={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074};tn(C,I,{copy(n){return Object.assign(new this.constructor,this,n)},displayable(){return this.rgb().displayable()},hex:dn,formatHex:dn,formatHex8:ee,formatHsl:re,formatRgb:xn,toString:xn});function dn(){return this.rgb().formatHex()}function ee(){return this.rgb().formatHex8()}function re(){return Hn(this).formatHsl()}function xn(){return this.rgb().formatRgb()}function I(n){var e,r;return n=(n+"").trim().toLowerCase(),(e=Yn.exec(n))?(r=e[1].length,e=parseInt(e[1],16),r===6?gn(e):r===3?new x(e>>8&15|e>>4&240,e>>4&15|e&240,(e&15)<<4|e&15,1):r===8?L(e>>24&255,e>>16&255,e>>8&255,(e&255)/255):r===4?L(e>>12&15|e>>8&240,e>>8&15|e>>4&240,e>>4&15|e&240,((e&15)<<4|e&15)/255):null):(e=Zn.exec(n))?new x(e[1],e[2],e[3],1):(e=Jn.exec(n))?new x(e[1]*255/100,e[2]*255/100,e[3]*255/100,1):(e=Kn.exec(n))?L(e[1],e[2],e[3],e[4]):(e=Qn.exec(n))?L(e[1]*255/100,e[2]*255/100,e[3]*255/100,e[4]):(e=Wn.exec(n))?pn(e[1],e[2]/100,e[3]/100,1):(e=ne.exec(n))?pn(e[1],e[2]/100,e[3]/100,e[4]):hn.hasOwnProperty(n)?gn(hn[n]):n==="transparent"?new x(NaN,NaN,NaN,0):null}function gn(n){return new x(n>>16&255,n>>8&255,n&255,1)}function L(n,e,r,t){return t<=0&&(n=e=r=NaN),new x(n,e,r,t)}function te(n){return n instanceof C||(n=I(n)),n?(n=n.rgb(),new x(n.r,n.g,n.b,n.opacity)):new x}function nn(n,e,r,t){return arguments.length===1?te(n):new x(n,e,r,t??1)}function x(n,e,r,t){this.r=+n,this.g=+e,this.b=+r,this.opacity=+t}tn(x,nn,Sn(C,{brighter(n){return n=n==null?V:Math.pow(V,n),new x(this.r*n,this.g*n,this.b*n,this.opacity)},darker(n){return n=n==null?q:Math.pow(q,n),new x(this.r*n,this.g*n,this.b*n,this.opacity)},rgb(){return this},clamp(){return new x(v(this.r),v(this.g),v(this.b),X(this.opacity))},displayable(){return-.5<=this.r&&this.r<255.5&&-.5<=this.g&&this.g<255.5&&-.5<=this.b&&this.b<255.5&&0<=this.opacity&&this.opacity<=1},hex:mn,formatHex:mn,formatHex8:ie,formatRgb:bn,toString:bn}));function mn(){return`#${k(this.r)}${k(this.g)}${k(this.b)}`}function ie(){return`#${k(this.r)}${k(this.g)}${k(this.b)}${k((isNaN(this.opacity)?1:this.opacity)*255)}`}function bn(){const n=X(this.opacity);return`${n===1?"rgb(":"rgba("}${v(this.r)}, ${v(this.g)}, ${v(this.b)}${n===1?")":`, ${n})`}`}function X(n){return isNaN(n)?1:Math.max(0,Math.min(1,n))}function v(n){return Math.max(0,Math.min(255,Math.round(n)||0))}function k(n){return n=v(n),(n<16?"0":"")+n.toString(16)}function pn(n,e,r,t){return t<=0?n=e=r=NaN:r<=0||r>=1?n=e=NaN:e<=0&&(n=NaN),new b(n,e,r,t)}function Hn(n){if(n instanceof b)return new b(n.h,n.s,n.l,n.opacity);if(n instanceof C||(n=I(n)),!n)return new b;if(n instanceof b)return n;n=n.rgb();var e=n.r/255,r=n.g/255,t=n.b/255,i=Math.min(e,r,t),o=Math.max(e,r,t),f=NaN,a=o-i,c=(o+i)/2;return a?(e===o?f=(r-t)/a+(r<t)*6:r===o?f=(t-e)/a+2:f=(e-r)/a+4,a/=c<.5?o+i:2-o-i,f*=60):a=c>0&&c<1?0:f,new b(f,a,c,n.opacity)}function fe(n,e,r,t){return arguments.length===1?Hn(n):new b(n,e,r,t??1)}function b(n,e,r,t){this.h=+n,this.s=+e,this.l=+r,this.opacity=+t}tn(b,fe,Sn(C,{brighter(n){return n=n==null?V:Math.pow(V,n),new b(this.h,this.s,this.l*n,this.opacity)},darker(n){return n=n==null?q:Math.pow(q,n),new b(this.h,this.s,this.l*n,this.opacity)},rgb(){var n=this.h%360+(this.h<0)*360,e=isNaN(n)||isNaN(this.s)?0:this.s,r=this.l,t=r+(r<.5?r:1-r)*e,i=2*r-t;return new x(K(n>=240?n-240:n+120,i,t),K(n,i,t),K(n<120?n+240:n-120,i,t),this.opacity)},clamp(){return new b(yn(this.h),O(this.s),O(this.l),X(this.opacity))},displayable(){return(0<=this.s&&this.s<=1||isNaN(this.s))&&0<=this.l&&this.l<=1&&0<=this.opacity&&this.opacity<=1},formatHsl(){const n=X(this.opacity);return`${n===1?"hsl(":"hsla("}${yn(this.h)}, ${O(this.s)*100}%, ${O(this.l)*100}%${n===1?")":`, ${n})`}`}}));function yn(n){return n=(n||0)%360,n<0?n+360:n}function O(n){return Math.max(0,Math.min(1,n||0))}function K(n,e,r){return(n<60?e+(r-e)*n/60:n<180?r:n<240?e+(r-e)*(240-n)/60:e)*255}const fn=n=>()=>n;function ae(n,e){return function(r){return n+r*e}}function oe(n,e,r){return n=Math.pow(n,r),e=Math.pow(e,r)-n,r=1/r,function(t){return Math.pow(n+t*e,r)}}function ue(n){return(n=+n)==1?Pn:function(e,r){return r-e?oe(e,r,n):fn(isNaN(e)?r:e)}}function Pn(n,e){var r=e-n;return r?ae(n,r):fn(isNaN(n)?e:n)}const wn=function n(e){var r=ue(e);function t(i,o){var f=r((i=nn(i)).r,(o=nn(o)).r),a=r(i.g,o.g),c=r(i.b,o.b),u=Pn(i.opacity,o.opacity);return function(l){return i.r=f(l),i.g=a(l),i.b=c(l),i.opacity=u(l),i+""}}return t.gamma=n,t}(1);function ce(n,e){e||(e=[]);var r=n?Math.min(e.length,n.length):0,t=e.slice(),i;return function(o){for(i=0;i<r;++i)t[i]=n[i]*(1-o)+e[i]*o;return t}}function se(n){return ArrayBuffer.isView(n)&&!(n instanceof DataView)}function le(n,e){var r=e?e.length:0,t=n?Math.min(r,n.length):0,i=new Array(t),o=new Array(r),f;for(f=0;f<t;++f)i[f]=an(n[f],e[f]);for(;f<r;++f)o[f]=e[f];return function(a){for(f=0;f<t;++f)o[f]=i[f](a);return o}}function he(n,e){var r=new Date;return n=+n,e=+e,function(t){return r.setTime(n*(1-t)+e*t),r}}function U(n,e){return n=+n,e=+e,function(r){return n*(1-r)+e*r}}function de(n,e){var r={},t={},i;(n===null||typeof n!="object")&&(n={}),(e===null||typeof e!="object")&&(e={});for(i in e)i in n?r[i]=an(n[i],e[i]):t[i]=e[i];return function(o){for(i in r)t[i]=r[i](o);return t}}var en=/[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g,Q=new RegExp(en.source,"g");function xe(n){return function(){return n}}function ge(n){return function(e){return n(e)+""}}function me(n,e){var r=en.lastIndex=Q.lastIndex=0,t,i,o,f=-1,a=[],c=[];for(n=n+"",e=e+"";(t=en.exec(n))&&(i=Q.exec(e));)(o=i.index)>r&&(o=e.slice(r,o),a[f]?a[f]+=o:a[++f]=o),(t=t[0])===(i=i[0])?a[f]?a[f]+=i:a[++f]=i:(a[++f]=null,c.push({i:f,x:U(t,i)})),r=Q.lastIndex;return r<e.length&&(o=e.slice(r),a[f]?a[f]+=o:a[++f]=o),a.length<2?c[0]?ge(c[0].x):xe(e):(e=c.length,function(u){for(var l=0,s;l<e;++l)a[(s=c[l]).i]=s.x(u);return a.join("")})}function an(n,e){var r=typeof e,t;return e==null||r==="boolean"?fn(e):(r==="number"?U:r==="string"?(t=I(e))?(e=t,wn):me:e instanceof I?wn:e instanceof Date?he:se(e)?ce:Array.isArray(e)?le:typeof e.valueOf!="function"&&typeof e.toString!="function"||isNaN(e)?de:U)(n,e)}function be(n,e){return n=+n,e=+e,function(r){return Math.round(n*(1-r)+e*r)}}function pe(n){return function(){return n}}function ye(n){return+n}var Mn=[0,1];function S(n){return n}function rn(n,e){return(e-=n=+n)?function(r){return(r-n)/e}:pe(isNaN(e)?NaN:.5)}function we(n,e){var r;return n>e&&(r=n,n=e,e=r),function(t){return Math.max(n,Math.min(e,t))}}function Me(n,e,r){var t=n[0],i=n[1],o=e[0],f=e[1];return i<t?(t=rn(i,t),o=r(f,o)):(t=rn(t,i),o=r(o,f)),function(a){return o(t(a))}}function Ne(n,e,r){var t=Math.min(n.length,e.length)-1,i=new Array(t),o=new Array(t),f=-1;for(n[t]<n[0]&&(n=n.slice().reverse(),e=e.slice().reverse());++f<t;)i[f]=rn(n[f],n[f+1]),o[f]=r(e[f],e[f+1]);return function(a){var c=Tn(n,a,1,t)-1;return o[c](i[c](a))}}function $e(n,e){return e.domain(n.domain()).range(n.range()).interpolate(n.interpolate()).clamp(n.clamp()).unknown(n.unknown())}function ke(){var n=Mn,e=Mn,r=an,t,i,o,f=S,a,c,u;function l(){var d=Math.min(n.length,e.length);return f!==S&&(f=we(n[0],n[d-1])),a=d>2?Ne:Me,c=u=null,s}function s(d){return d==null||isNaN(d=+d)?o:(c||(c=a(n.map(t),e,r)))(t(f(d)))}return s.invert=function(d){return f(i((u||(u=a(e,n.map(t),U)))(d)))},s.domain=function(d){return arguments.length?(n=Array.from(d,ye),l()):n.slice()},s.range=function(d){return arguments.length?(e=Array.from(d),l()):e.slice()},s.rangeRound=function(d){return e=Array.from(d),r=be,l()},s.clamp=function(d){return arguments.length?(f=d?!0:S,l()):f!==S},s.interpolate=function(d){return arguments.length?(r=d,l()):r},s.unknown=function(d){return arguments.length?(o=d,s):o},function(d,M){return t=d,i=M,l()}}function ve(){return ke()(S,S)}function Ae(n){return Math.abs(n=Math.round(n))>=1e21?n.toLocaleString("en").replace(/,/g,""):n.toString(10)}function Y(n,e){if((r=(n=e?n.toExponential(e-1):n.toExponential()).indexOf("e"))<0)return null;var r,t=n.slice(0,r);return[t.length>1?t[0]+t.slice(2):t,+n.slice(r+1)]}function P(n){return n=Y(Math.abs(n)),n?n[1]:NaN}function Re(n,e){return function(r,t){for(var i=r.length,o=[],f=0,a=n[0],c=0;i>0&&a>0&&(c+a+1>t&&(a=Math.max(1,t-c)),o.push(r.substring(i-=a,i+a)),!((c+=a+1)>t));)a=n[f=(f+1)%n.length];return o.reverse().join(e)}}function Se(n){return function(e){return e.replace(/[0-9]/g,function(r){return n[+r]})}}var He=/^(?:(.)?([<>=^]))?([+\-( ])?([$#])?(0)?(\d+)?(,)?(\.\d+)?(~)?([a-z%])?$/i;function Z(n){if(!(e=He.exec(n)))throw new Error("invalid format: "+n);var e;return new on({fill:e[1],align:e[2],sign:e[3],symbol:e[4],zero:e[5],width:e[6],comma:e[7],precision:e[8]&&e[8].slice(1),trim:e[9],type:e[10]})}Z.prototype=on.prototype;function on(n){this.fill=n.fill===void 0?" ":n.fill+"",this.align=n.align===void 0?">":n.align+"",this.sign=n.sign===void 0?"-":n.sign+"",this.symbol=n.symbol===void 0?"":n.symbol+"",this.zero=!!n.zero,this.width=n.width===void 0?void 0:+n.width,this.comma=!!n.comma,this.precision=n.precision===void 0?void 0:+n.precision,this.trim=!!n.trim,this.type=n.type===void 0?"":n.type+""}on.prototype.toString=function(){return this.fill+this.align+this.sign+this.symbol+(this.zero?"0":"")+(this.width===void 0?"":Math.max(1,this.width|0))+(this.comma?",":"")+(this.precision===void 0?"":"."+Math.max(0,this.precision|0))+(this.trim?"~":"")+this.type};function Pe(n){n:for(var e=n.length,r=1,t=-1,i;r<e;++r)switch(n[r]){case".":t=i=r;break;case"0":t===0&&(t=r),i=r;break;default:if(!+n[r])break n;t>0&&(t=0);break}return t>0?n.slice(0,t)+n.slice(i+1):n}var En;function Ee(n,e){var r=Y(n,e);if(!r)return n+"";var t=r[0],i=r[1],o=i-(En=Math.max(-8,Math.min(8,Math.floor(i/3)))*3)+1,f=t.length;return o===f?t:o>f?t+new Array(o-f+1).join("0"):o>0?t.slice(0,o)+"."+t.slice(o):"0."+new Array(1-o).join("0")+Y(n,Math.max(0,e+o-1))[0]}function Nn(n,e){var r=Y(n,e);if(!r)return n+"";var t=r[0],i=r[1];return i<0?"0."+new Array(-i).join("0")+t:t.length>i+1?t.slice(0,i+1)+"."+t.slice(i+1):t+new Array(i-t.length+2).join("0")}const $n={"%":(n,e)=>(n*100).toFixed(e),b:n=>Math.round(n).toString(2),c:n=>n+"",d:Ae,e:(n,e)=>n.toExponential(e),f:(n,e)=>n.toFixed(e),g:(n,e)=>n.toPrecision(e),o:n=>Math.round(n).toString(8),p:(n,e)=>Nn(n*100,e),r:Nn,s:Ee,X:n=>Math.round(n).toString(16).toUpperCase(),x:n=>Math.round(n).toString(16)};function kn(n){return n}var vn=Array.prototype.map,An=["y","z","a","f","p","n","µ","m","","k","M","G","T","P","E","Z","Y"];function je(n){var e=n.grouping===void 0||n.thousands===void 0?kn:Re(vn.call(n.grouping,Number),n.thousands+""),r=n.currency===void 0?"":n.currency[0]+"",t=n.currency===void 0?"":n.currency[1]+"",i=n.decimal===void 0?".":n.decimal+"",o=n.numerals===void 0?kn:Se(vn.call(n.numerals,String)),f=n.percent===void 0?"%":n.percent+"",a=n.minus===void 0?"−":n.minus+"",c=n.nan===void 0?"NaN":n.nan+"";function u(s){s=Z(s);var d=s.fill,M=s.align,p=s.sign,E=s.symbol,A=s.zero,j=s.width,J=s.comma,N=s.precision,un=s.trim,g=s.type;g==="n"?(J=!0,g="g"):$n[g]||(N===void 0&&(N=12),un=!0,g="g"),(A||d==="0"&&M==="=")&&(A=!0,d="0",M="=");var zn=E==="$"?r:E==="#"&&/[boxX]/.test(g)?"0"+g.toLowerCase():"",In=E==="$"?t:/[%p]/.test(g)?f:"",cn=$n[g],Cn=/[defgprs%]/.test(g);N=N===void 0?6:/[gprs]/.test(g)?Math.max(1,Math.min(21,N)):Math.max(0,Math.min(20,N));function sn(h){var $=zn,m=In,R,ln,F;if(g==="c")m=cn(h)+m,h="";else{h=+h;var _=h<0||1/h<0;if(h=isNaN(h)?c:cn(Math.abs(h),N),un&&(h=Pe(h)),_&&+h==0&&p!=="+"&&(_=!1),$=(_?p==="("?p:a:p==="-"||p==="("?"":p)+$,m=(g==="s"?An[8+En/3]:"")+m+(_&&p==="("?")":""),Cn){for(R=-1,ln=h.length;++R<ln;)if(F=h.charCodeAt(R),48>F||F>57){m=(F===46?i+h.slice(R+1):h.slice(R))+m,h=h.slice(0,R);break}}}J&&!A&&(h=e(h,1/0));var D=$.length+h.length+m.length,w=D<j?new Array(j-D+1).join(d):"";switch(J&&A&&(h=e(w+h,w.length?j-m.length:1/0),w=""),M){case"<":h=$+h+m+w;break;case"=":h=$+w+h+m;break;case"^":h=w.slice(0,D=w.length>>1)+$+h+m+w.slice(D);break;default:h=w+$+h+m;break}return o(h)}return sn.toString=function(){return s+""},sn}function l(s,d){var M=u((s=Z(s),s.type="f",s)),p=Math.max(-8,Math.min(8,Math.floor(P(d)/3)))*3,E=Math.pow(10,-p),A=An[8+p/3];return function(j){return M(E*j)+A}}return{format:u,formatPrefix:l}}var T,jn,qn;qe({thousands:",",grouping:[3],currency:["$",""]});function qe(n){return T=je(n),jn=T.format,qn=T.formatPrefix,T}function ze(n){return Math.max(0,-P(Math.abs(n)))}function Ie(n,e){return Math.max(0,Math.max(-8,Math.min(8,Math.floor(P(e)/3)))*3-P(Math.abs(n)))}function Ce(n,e){return n=Math.abs(n),e=Math.abs(e)-n,Math.max(0,P(e)-P(n))+1}function Fe(n,e,r,t){var i=Un(n,e,r),o;switch(t=Z(t??",f"),t.type){case"s":{var f=Math.max(Math.abs(n),Math.abs(e));return t.precision==null&&!isNaN(o=Ie(i,f))&&(t.precision=o),qn(t,f)}case"":case"e":case"g":case"p":case"r":{t.precision==null&&!isNaN(o=Ce(i,Math.max(Math.abs(n),Math.abs(e))))&&(t.precision=o-(t.type==="e"));break}case"f":case"%":{t.precision==null&&!isNaN(o=ze(i))&&(t.precision=o-(t.type==="%")*2);break}}return jn(t)}function _e(n){var e=n.domain;return n.ticks=function(r){var t=e();return Xn(t[0],t[t.length-1],r??10)},n.tickFormat=function(r,t){var i=e();return Fe(i[0],i[i.length-1],r??10,t)},n.nice=function(r){r==null&&(r=10);var t=e(),i=0,o=t.length-1,f=t[i],a=t[o],c,u,l=10;for(a<f&&(u=f,f=a,a=u,u=i,i=o,o=u);l-- >0;){if(u=W(f,a,r),u===c)return t[i]=f,t[o]=a,e(t);if(u>0)f=Math.floor(f/u)*u,a=Math.ceil(a/u)*u;else if(u<0)f=Math.ceil(f*u)/u,a=Math.floor(a*u)/u;else break;c=u}return n},n}function De(){var n=ve();return n.copy=function(){return $e(n,De())},Fn.apply(n,arguments),_e(n)}export{$e as a,Rn as b,ve as c,De as l,Un as t};