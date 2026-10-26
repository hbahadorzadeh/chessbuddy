export function replayDelay(durationMs:number|null,recorded:boolean,speed:number,fallbackMs=1500){return Math.max(50,(recorded&&durationMs!==null?durationMs:fallbackMs)/speed);}
