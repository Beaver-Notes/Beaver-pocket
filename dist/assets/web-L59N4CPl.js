<<<<<<<< HEAD:dist/assets/web-L59N4CPl.js
import{W as a}from"./index-3mbydtR9.js";class n extends a{async canShare(){return typeof navigator>"u"||!navigator.share?{value:!1}:{value:!0}}async share(e){if(typeof navigator>"u"||!navigator.share)throw this.unavailable("Share API not available in this browser");return await navigator.share({title:e.title,text:e.text,url:e.url}),{}}}export{n as ShareWeb};
========
import{W as a}from"./index-6dEnVDeT.js";class n extends a{async canShare(){return typeof navigator>"u"||!navigator.share?{value:!1}:{value:!0}}async share(e){if(typeof navigator>"u"||!navigator.share)throw this.unavailable("Share API not available in this browser");return await navigator.share({title:e.title,text:e.text,url:e.url}),{}}}export{n as ShareWeb};
>>>>>>>> 7fa80ba83bcb09c1dabcb083dcdd2d248b3d70a7:dist/assets/web-AgqNe0mY.js
