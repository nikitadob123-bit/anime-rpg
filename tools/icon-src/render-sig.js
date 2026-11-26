const { chromium } = require('playwright-core');
const fs=require('fs');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
const p=await b.newPage({viewport:{width:256,height:256},deviceScaleFactor:1});
const svg=fs.readFileSync('/workspace/anime-rpg/tools/icon-src/sig_asc.svg','utf8');
await p.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
await p.screenshot({path:'/tmp/ic/sig.png',omitBackground:true,clip:{x:0,y:0,width:256,height:256}});await b.close();})();
