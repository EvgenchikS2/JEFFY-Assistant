import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
export function windows(op, payload = {}, timeout = 20000) {
  if (process.platform !== 'win32') return Promise.reject(new Error('Управление компьютером доступно только в Windows.'));
  return new Promise((resolve, reject) => {
    const script=fileURLToPath(new URL('../scripts/windows.ps1',import.meta.url)).replace(`app.asar${process.platform==='win32'?'\\':'/'}`,`app.asar.unpacked${process.platform==='win32'?'\\':'/'}`);
    const child = spawn('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',script], {windowsHide:true, stdio:['pipe','pipe','pipe']});
    let output = '', error = '';
    const timer = setTimeout(()=>{child.kill(); reject(new Error('Windows не ответила вовремя.'));},timeout);
    child.stdout.on('data', d => {output += d.toString('utf8');});
    child.stderr.on('data', d => {error += d.toString('utf8');});
    child.on('error',e=>{clearTimeout(timer);reject(e);});
    child.on('close', code => {clearTimeout(timer); if(code !== 0) reject(new Error(error.trim().split('\n')[0] || 'Не удалось выполнить действие Windows.')); else {try {resolve(JSON.parse(output.replace(/^\uFEFF/, '').trim()));} catch {reject(new Error('Не удалось прочитать ответ Windows.'));}} });
    child.stdin.on('error',()=>{});
    child.stdin.end(Buffer.from(JSON.stringify({op,...payload}),'utf8').toString('base64'));
  });
}
