// No server, personal documents or online translation service needed.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../web/i18n.js'),'utf8');
function load(saved=null,blocked=false){const sandbox={window:{},document:{documentElement:{}},localStorage:{getItem(){if(blocked)throw Error('Storage blocked');return saved;},setItem(k,value){saved=value;}}};vm.runInNewContext(source,sandbox);return {app:sandbox.window.NMOI18n,document:sandbox.document};}
const {app,document}=load();assert.equal(app.language,'ar');assert.equal(document.documentElement.dir,'rtl');assert.equal(app.t('Completed contracts'),'العقود المكتملة');
app.setFields([['name_en','Full name · English','الاسم الكامل بالإنجليزية']]);assert.equal(app.message('Full name · English is missing.'),'أدخل الاسم الكامل بالإنجليزية.');
assert.equal(app.ui`<p>Completed contracts</p><strong>${'Completed contracts'}</strong>`,'<p>العقود المكتملة</p><strong>Completed contracts</strong>');
assert.equal(app.ui`<input value="${'00001234'}">`,'<input value="00001234">');assert.equal(app.message('Your saved instruction for this employee requires: Exact custom role'),'التعليمات المحفوظة لهذا الموظف تتطلب: Exact custom role');
assert.equal(app.t('{count} existing fields kept. ',{count:2}),'تم الاحتفاظ بـ 2 حقلًا معبأً. ');
app.setLanguage('en');assert.equal(app.ui`<p>Completed contracts</p>`,'<p>Completed contracts</p>');assert.equal(app.message('Full name · English is missing.'),'Full name · English is missing.');assert.equal(document.documentElement.dir,'ltr');
assert.equal(load('en').app.language,'en');assert.equal(load('invalid').app.language,'ar');assert.equal(load(null,true).app.language,'ar');
console.log('Language defaults, persistence fallback, UI-only translation and unchanged interpolated values passed.');
