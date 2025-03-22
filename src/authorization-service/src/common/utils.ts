export const logEvent = (msg: string, source = 'Lambda') => console.log(`[${source} log] ${msg}`);
