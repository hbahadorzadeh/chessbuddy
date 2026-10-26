import {build} from 'esbuild';
import {writeFile,mkdir} from 'node:fs/promises';
const result=await build({entryPoints:['widget/main.tsx'],bundle:true,write:false,metafile:true,outdir:'out',minify:true,format:'iife',target:'es2022',define:{'process.env.NODE_ENV':'"production"'}});
const js=result.outputFiles.find(f=>f.path.endsWith('.js')).text.replaceAll('</script','<\\/script');
const css=result.outputFiles.find(f=>f.path.endsWith('.css')).text;
await mkdir('public',{recursive:true});
await writeFile('public/chess-widget.html',`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>ChessBuddy practice board</title><style>${css}</style></head><body><div id="root"></div><script>${js}</script></body></html>`);
