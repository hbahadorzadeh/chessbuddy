import {build} from 'esbuild';
import {writeFile,mkdir} from 'node:fs/promises';
await mkdir('public',{recursive:true});
for(const [entry,file,title] of [['widget/main.tsx','chess-widget.html','ChessBuddy practice board'],['replay/main.tsx','replay-widget.html','ChessBuddy replay'],['multiplayer/main.tsx','multiplayer-widget.html','ChessBuddy multiplayer']]){
 const result=await build({entryPoints:[entry],bundle:true,write:false,outdir:'out',minify:true,format:'iife',target:'es2022',define:{'process.env.NODE_ENV':'"production"'}});
 const js=result.outputFiles.find(f=>f.path.endsWith('.js')).text.replaceAll('</script','<\\/script');
 const css=result.outputFiles.find(f=>f.path.endsWith('.css')).text;
 await writeFile(`public/${file}`,`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><style>${css}</style></head><body><div id="root"></div><script>${js}</script></body></html>`);
}
