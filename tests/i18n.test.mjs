import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import vm from 'node:vm';
import os from 'node:os';
import path from 'node:path';
import {createServer} from '../src/server.mjs';

test('localization changes interface text without changing interpolated user content or internal values',async()=>{
  const context=vm.createContext({});vm.runInContext(await readFile(new URL('../public/i18n.js',import.meta.url),'utf8'),context);
  const i18n=context.I18n;assert.equal(i18n.t('Настройки'),'Настройки');
  i18n.setLanguage('en');assert.equal(i18n.t('Настройки'),'Settings');assert.equal(i18n.locale(),'en-US');
  const custom='Настройки <English> Все';
  assert.equal(i18n.tr(['<h3>','</h3><button>Сохранить</button>'],custom),'<h3>'+custom+'</h3><button>Save</button>');
  assert.equal(i18n.tr(['<option value="Мои команды">Мои команды</option>']),'<option value="Мои команды">My commands</option>');
  assert.equal(i18n.t(custom),custom);assert.equal(i18n.t('Лимит озвучки исчерпан. Подождите или смените сервис в настройках голоса.'),'Voice quota exceeded. Wait or choose another voice service in Settings.');
  assert.throws(()=>i18n.setLanguage('fr'),/Unsupported/);i18n.setLanguage('ru');assert.equal(i18n.tr(['<button>Сохранить</button>']),'<button>Сохранить</button>');
});

test('interface language is authenticated, persisted and independent from speech preferences and commands',async()=>{
  const dataDir=await mkdtemp(path.join(os.tmpdir(),'jeffy-locale-')),events=[];
  const options={dataDir,runWindows:async()=>({voices:[],recognizers:[]}),onLanguageChange:language=>events.push(language)};
  let app=await createServer(options),bootstrap=await(await fetch(app.url+'/api/bootstrap')).json();
  const post=async(endpoint,body,token=bootstrap.token)=>{const r=await fetch(app.url+'/api/'+endpoint,{method:'POST',headers:{'Content-Type':'application/json','X-Jeffy-Token':token},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};};
  try{
    assert.equal((await post('language',{language:'en'},'bad-token')).status,403);
    assert.equal((await post('language',{language:'fr'})).status,400);
    const result=await post('language',{language:'en'});assert.equal(result.status,200);assert.equal(result.data.settings.uiLanguage,'en');
    for(const key of ['inputLanguage','replyLanguage','ttsProvider','voice','rate','provider','model'])assert.equal(result.data.settings[key],bootstrap.settings[key]);
    assert.deepEqual(events,['en']);
    const after=await(await fetch(app.url+'/api/bootstrap')).json();assert.deepEqual(after.commands,bootstrap.commands);
    await app.close();app=await createServer(options);bootstrap=await(await fetch(app.url+'/api/bootstrap')).json();assert.equal(bootstrap.settings.uiLanguage,'en');assert.equal(app.getUiLanguage(),'en');
    const {uiLanguage,...legacySettings}=bootstrap.settings;assert.equal((await post('settings',legacySettings)).status,200);assert.equal(app.getUiLanguage(),'en');
  }finally{await app.close();await rm(dataDir,{recursive:true,force:true});}
});
