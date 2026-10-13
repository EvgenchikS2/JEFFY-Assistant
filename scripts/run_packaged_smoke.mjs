import {spawn} from 'node:child_process';
import path from 'node:path';
const child=spawn(path.resolve('dist/win-unpacked/Jeffy Assistant.exe'),[path.resolve('scripts/verify_packaged.cjs')],{env:{...process.env,ELECTRON_RUN_AS_NODE:'1'},windowsHide:true,stdio:['ignore','pipe','pipe']});
let output='',error='';const timer=setTimeout(()=>{child.kill();console.error('Packaged verification timed out.');process.exitCode=1;},45000);
child.stdout.on('data',d=>output+=d.toString());child.stderr.on('data',d=>error+=d.toString());
child.on('error',e=>{clearTimeout(timer);console.error(e.message);process.exitCode=1;});
child.on('close',code=>{clearTimeout(timer);if(code!==0||!output.includes('"packaged":true')){console.error(error||output||'Packaged verification returned no evidence.');process.exitCode=1;}else console.log(output.trim());});
