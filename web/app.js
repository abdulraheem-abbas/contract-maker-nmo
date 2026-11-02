'use strict';
const {t,ui,message}=window.NMOI18n;
const isArabic=()=>NMOI18n.language==='ar';
const jobLabel=job=>(job.is_untitled||(!job.archive_only&&job.fields&&!job.fields.name_ar?.value&&!job.fields.name_en?.value))?t('New contract'):job.title;
const kindLabel=kind=>t(({employment:'Employment contract',service:'Service contract',extension:'Extension letter'})[kind]||kind);
const $ = (selector, root=document) => root.querySelector(selector);
const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
const state = {boot:null,job:null,tab:'documents',view:'workspace',mode:'create',source:null,page:1,task:null,role:'offer',saving:false,unsaved:false,saveError:false,saveVersion:0,savePending:null,template:null,templateKind:null,templateBusy:false,sheet:null,touched:new Set(),validateAll:false,archiveJob:null,archiveFile:null};
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let toastTimer,saveTimer;

async function api(path,body){
  const options={credentials:'same-origin',headers:{}};
  if(body!==undefined){options.method='POST';options.headers={'Content-Type':'application/json','X-Private-CSRF':state.boot.csrf};options.body=JSON.stringify(body);}
  const response=await fetch(path,options);
  const data=await response.json();
  if(!response.ok){const error=new Error(data.error||t('This action could not finish.'));error.findings=data.findings;throw error;}
  return data;
}
function toast(message,error=false){clearTimeout(toastTimer);const el=$('#toast');el.textContent=NMOI18n.message(message);el.classList.remove('hidden');el.classList.toggle('error',error);toastTimer=setTimeout(()=>el.classList.add('hidden'),6500);}
function setView(view){
  state.view=view;
  for(const name of ['workspace','job','completed','history','templates','setup'])$(`#${name}-view`).classList.toggle('hidden',name!==view);
  $$('.nav').forEach(n=>n.classList.toggle('active',n.dataset.nav===(view==='job'?'workspace':view==='history'?'completed':view)));
  $('#breadcrumb').textContent=({workspace:t('My workspace'),job:t('My workspace / Contract details'),completed:t('Completed contracts'),history:t('Contract history'),templates:t('Templates & rules'),setup:t('About & storage')})[view];
  if(view==='workspace')renderJobs();
  if(view==='completed')renderCompleted();
  if(view==='templates')renderTemplates();
  if(view==='setup')renderSetup();
  if(view==='history')renderHistory();
  window.scrollTo({top:0,behavior:'instant'});
}
function dateLabel(value){try{return new Date(value).toLocaleDateString(NMOI18n.locale(),{day:'numeric',month:'short'});}catch{return '';}}
function renderJobs(){
  const jobs=state.boot.jobs.filter(job=>!job.word_count||job.has_changes);
  $('#work-count').textContent=jobs.length?isArabic()?t('{count} saved workspaces',{count:jobs.length}):`${jobs.length} saved ${jobs.length===1?'workspace':'workspaces'}`:t('Saved on this computer');
  if(!jobs.length){$('#job-list').innerHTML=ui('<div class="empty-state"><span>▤</span><h3>No unfinished drafts</h3><p>Start a new contract, or open Completed contracts to edit saved work.</p></div>');return;}
  $('#job-list').innerHTML=jobs.map(job=>ui`<button class="job-row" data-job="${job.id}"><span class="row-icon">▤</span><span class="row-title"><strong dir="auto">${escapeHTML(jobLabel(job))}</strong><small>Saved locally</small></span><span class="status-chip">Continue work</span><span class="row-date">${dateLabel(job.updated)}</span><span>↗</span></button>`).join('');
}
async function refreshBootstrap(){const csrf=state.boot?.csrf;state.boot=await api('/api/bootstrap');NMOI18n.setFields(state.boot.fields);if(csrf&&csrf!==state.boot.csrf)toast(t('The local app restarted. Your saved work is safe.'));}
function newDialog(mode){state.mode=mode;$('#new-mode-label').textContent=mode==='spreadsheet'?t('START FROM A SPREADSHEET'):t('NEW CONTRACT');$('#new-dialog').showModal();}
async function openJob(id){
  if(state.task)throw new Error(t('Wait for the current step to finish.'));
  if(state.job&&(state.unsaved||state.saving))await saveJob();
  clearTimeout(saveTimer);await refreshBootstrap();state.touched=new Set();state.validateAll=false;state.job=await api('/api/job?id='+encodeURIComponent(id));state.source=state.job.sources[0]||null;state.page=1;
  state.unsaved=false;state.saveError=false;
  renderJob();setView('job');setTab(state.job.archive_only?'outputs':'details');
}
function setTab(tab){
  state.tab=tab;
  for(const name of ['documents','details','findings','outputs'])$(`#${name}-panel`).classList.toggle('hidden',name!==tab);
  $$('.tab').forEach(el=>el.classList.toggle('active',el.dataset.tab===tab));
  if(tab==='details')renderViewer();
}
function fieldValue(key){return state.job?.fields[key]?.value||'';}
function requiredFields(){
  const kind=fieldValue('contract_type');
  const common=['contract_type','name_ar','name_en','gender','identity_type','identity_number','identity_issue_date','execution_date','start_date','end_date','job_title_ar','job_title_en','workplace_ar','workplace_en','salary_usd','manager_title_ar','manager_title_en'];
  let required=kind==='employment'?[...common,'grade_ar','grade_en']:kind==='service'?[...common,'manager_name_ar','manager_name_en','project_ar','project_en']:['contract_type','name_ar','name_en','execution_date','start_date','end_date','original_contract_date'];
  return [...new Set([...required,...((state.job.template_reference?.kind===kind?state.job.template_required_fields:state.boot.templates[kind]?.required_fields)||[])])];
}
function updateCounts(){
  if(!state.job)return;
  const required=requiredFields();const confirmed=required.filter(k=>state.job.fields[k].confirmed&&state.job.fields[k].value).length;
  $('#source-count').textContent=state.job.sources.length;$('#confirmed-count').textContent=`${confirmed}/${required.length}`;
  $('#finding-count').textContent=state.job.findings.filter(f=>f.level!=='pass').length;$('#output-count').textContent=state.job.outputs.length;
}
function renderJob(){
  const kind=fieldValue('contract_type');$('#job-kind').textContent=kindLabel(kind);
  $('#job-title').textContent=jobLabel(state.job);
  $('#main-action').innerHTML=state.job.editing_target?ui('Save version & download <span>↗</span>'):ui('Create Word <span>↗</span>');
  $('#version-edit-note').classList.toggle('hidden',!state.job.editing_version&&!state.job.template_warning);
  $('#version-edit-note').textContent=state.job.editing_version?t(state.job.editing_target?'Updating Version {number}. Other versions stay saved.':'Editing a new copy of Version {number}. The original stays saved.',{number:state.job.editing_version}):'';
  if(state.job.template_warning)$('#version-edit-note').textContent+=' '+message(state.job.template_warning);
  $('#main-action').classList.toggle('hidden',!!state.job.archive_only);$('#save-job').classList.toggle('hidden',!!state.job.archive_only);
  $$('.tab').forEach(tab=>tab.classList.toggle('hidden',!!state.job.archive_only&&tab.dataset.tab!=='outputs'));
  renderSaveStatus();
  renderSources();renderFields();renderFindings();renderOutputs();renderCalculations();updateCounts();
}
function renderSources(){
  const cards=[['offer','▤',t('Job offer'),t('Open the offer and enter its dates, role and salary.')],['identity','◫',t('ID or passport'),t('Inspect the full name, number and issuing details.')],['list','▦',t('Employee spreadsheet'),t('Choose a row and map the columns you want to import.')]];
  $('#source-cards').innerHTML=cards.map(([role,icon,title,description])=>{
    const sources=state.job.source_details.filter(s=>s.role===role);
    return ui`<article class="source-card ${sources.length?'has-file':''}" data-drop-role="${role}"><span class="source-symbol">${icon}</span><h3>${title}</h3><p>${description}</p>${sources.map(s=>ui`<button class="source-file" dir="auto" data-preview="${s.id}">${escapeHTML(s.name)}<small>${s.pages.length} ${t(s.pages.length===1?t('page'):t('pages'))} · local copy</small></button>${/\.(ods|xlsx|csv)$/i.test(s.name)?ui`<button class="inline-link sheet-source-link" data-sheet-source="${s.id}">Import employee row ↗</button>`:''}`).join('')}<button class="button secondary" data-add-role="${role}">${sources.length?t('Add another file'):t('Choose file')} ＋</button></article>`;
  }).join('');
  $$('.source-card').forEach(el=>{
    el.addEventListener('dragover',event=>{event.preventDefault();el.classList.add('drop-hover');});
    el.addEventListener('dragleave',()=>el.classList.remove('drop-hover'));
    el.addEventListener('drop',event=>{event.preventDefault();el.classList.remove('drop-hover');if(event.dataTransfer.files[0])importFile(event.dataTransfer.files[0],el.dataset.dropRole).catch(handleError);});
  });
}
const fieldGroups=[
 ['Contract & identity',['contract_type','name_ar','name_en','gender','identity_type','identity_number','identity_issue_date','identity_expiry_date','issuer_ar','issuer_en']],
 ['Dates & pay',['execution_date','start_date','end_date','original_contract_date','salary_usd']],
 ['Role & workplace',['job_title_ar','job_title_en','grade_ar','grade_en','workplace_ar','workplace_en']],
 ['Reporting & project',['manager_title_ar','manager_title_en','manager_name_ar','manager_name_en','manager_base_ar','manager_base_en','project_ar','project_en']]
];
function visibleField(key){
  const kind=fieldValue('contract_type');
  if((state.job.template_reference?.kind===kind?state.job.template_required_fields:state.boot.templates[kind]?.required_fields)?.includes(key))return true;
  if(key==='original_contract_date'&&kind!=='extension')return false;
  if(kind==='extension'&&!requiredFields().includes(key)&&!['issuer_ar','issuer_en','identity_expiry_date'].includes(key))return false;
  if(kind==='employment'&&['manager_name_ar','manager_name_en','manager_base_ar','manager_base_en','project_ar','project_en'].includes(key))return false;
  if(kind==='service'&&key.startsWith('grade_'))return false;
  return true;
}
function renderFields(){
  const specs=Object.fromEntries(state.boot.fields.map(s=>[s[0],s]));const required=requiredFields();
  $('#fields-form').innerHTML=fieldGroups.map(([label,keys])=>ui`<section class="field-group"><h3>${t(label)}</h3>${keys.filter(visibleField).map(key=>{
    const [_,english,arabic,type]=specs[key];const field=state.job.fields[key];
    let input;
    if(type==='select'){
      const options=key==='contract_type'?[['employment',t('Employment contract · عقد عمل')],['service',t('Service contract · عقد خدمة')],['extension',t('Extension letter · خطاب تمديد')]]:key==='gender'?[['',t('Not supplied')],['male',t('Male · ذكر')],['female',t('Female · أنثى')]]:[['',t('Choose document type')],...(state.boot.identity_types||[]).map(d=>[d.id,d[isArabic()?'ar':'en']]),['__add__',t('＋ Add my own document type…')]];
      input=ui`<select class="field-input" id="field-${key}" data-field="${key}">${options.map(([v,l])=>ui`<option value="${v}" ${field.value===v?'selected':''}>${escapeHTML(l)}</option>`).join('')}</select>`;
    }else input=ui`<input class="field-input" id="field-${key}" data-field="${key}" type="${type==='date'?'date':'text'}" dir="${key.endsWith('_ar')?'rtl':'ltr'}" value="${escapeHTML(field.value)}" autocomplete="off" ${key==='salary_usd'?'inputmode="decimal"':''}>`;
    const evidence=(field.evidence||[]).map((e,i)=>ui`<button class="evidence-link" data-evidence="${key}" data-index="${i}">↗ ${escapeHTML(e.source_name)} · ${t('Page {page} of {pages}',{page:e.page,pages:state.job.source_details.find(s=>s.id===e.source_id)?.pages.length||'—'})}${e.text_match===false?t(' · inspect image'):''}</button>`).join('');
    const alternatives='';
    return ui`<div class="field-row ${field.confirmed?'confirmed':''}" data-row="${key}"><div class="field-label"><label for="field-${key}"><span>${escapeHTML(isArabic()?arabic:english)}${required.includes(key)?ui('<b class="required-star">*</b>'):''}</span><br><small lang="${isArabic()?'en':'ar'}" dir="${isArabic()?'ltr':'rtl'}">${escapeHTML(isArabic()?english:arabic)}</small></label><label class="confirm-label"><input type="checkbox" data-confirm="${key}" ${field.confirmed?'checked':''} ${!field.value?'disabled':''}>Checked</label></div>${input}<p class="field-error hidden" id="error-${key}" role="alert"></p><div class="field-evidence">${evidence}${alternatives}<span class="field-origin">${escapeHTML(message(field.note||(field.origin==='empty'?t('Not entered yet.'):field.origin)||t('Enter or read from a source')))}</span></div></div>`;
  }).join('')}</section>`).join('');
  paintFieldErrors();
}
function savePayload(){return {job:state.job.id,fields:state.job.fields};}
function renderSaveStatus(){
  const status=$('#saved-status');
  status.classList.toggle('save-error',state.saveError);
  status.textContent=state.saving?t('Saving locally…'):state.saveError?t('Changes could not be saved. Keep this page open and choose Save work to retry.'):state.unsaved?t('Changes not saved yet.'):state.job?.archive_only?t('Word file saved as uploaded.'):state.job?.last_word_origin==='uploaded_word'?t('Latest Word file was uploaded. These form details have not been updated from that file.'):t('Saved on this computer');
}
async function saveJob(silent=true){
  if(!state.job||state.task)return;clearTimeout(saveTimer);
  // Serialize writes so a slower response cannot overwrite newer edits.
  while(state.savePending)await state.savePending;
  const job=state.job,version=state.saveVersion;
  state.saving=true;state.saveError=false;renderSaveStatus();
  state.savePending=api('/api/save',savePayload());
  try{
    const saved=await state.savePending;
    if(state.job===job){
      state.unsaved=state.saveVersion!==version;
      if(!state.unsaved){state.job.title=saved.title;$('#job-title').textContent=jobLabel(state.job);state.job.calculations=saved.calculations;state.job.validation=saved.validation;paintFieldErrors();renderCalculations();}
    }
  }catch(error){if(state.job===job){state.unsaved=true;state.saveError=true;}throw error;}
  finally{state.savePending=null;state.saving=false;renderSaveStatus();}
  if(state.job===job&&state.unsaved)return saveJob(silent);
  if(!silent)toast(t('Your work is saved locally.'));
}
function queueSave(){if(state.task)return;state.unsaved=true;state.saveVersion++;state.saveError=false;clearTimeout(saveTimer);renderSaveStatus();saveTimer=setTimeout(()=>saveJob().catch(handleError),800);}
async function importFile(file,role){
  if(state.task)throw new Error(t('Wait for the current task to finish first.'));
  if(file.size>25*1024*1024)throw new Error(t('Choose a file up to 25 MB.'));
  await saveJob();
  const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=reject;reader.readAsDataURL(file);});
  const result=await api('/api/import',{job:state.job.id,role,name:file.name,data});
  const completed=await watchTask(result.task);
  toast(t('Document added to this local workspace.'));
  if(role==='list'&&/\.(ods|xlsx|csv)$/i.test(file.name)&&completed?.source)await openSheet(completed.source);
}
async function watchTask(taskId){
  state.task=taskId;clearTimeout(saveTimer);$('#task-banner').classList.remove('hidden');$('#main-action').disabled=true;$$('#fields-form input,#fields-form select,#confirm-visible,#save-job').forEach(b=>b.disabled=true);
  try{
    while(true){
      const task=await api('/api/task?id='+taskId);state.taskDetails=task;$('#task-title').textContent=message(task.label);$('#task-message').textContent=message(task.message);
      if(task.status==='error')throw new Error(task.message);
      if(task.status==='complete'||task.status==='cancelled'){
        if(task.result?.job){const oldTab=state.tab;state.job=await api('/api/job?id='+task.result.job);renderJob();setTab(oldTab);}
        return task.result;
      }
      await new Promise(resolve=>setTimeout(resolve,1000));
    }
  }finally{state.task=null;$('#task-banner').classList.add('hidden');$('#main-action').disabled=false;$$('#fields-form input,#fields-form select,#confirm-visible,#save-job').forEach(b=>b.disabled=false);if(state.job){renderFields();renderCalculations();}}
}
function selectedSource(){return state.job?.source_details.find(s=>s.id===state.source);}
function renderViewer(quote=''){
  state.viewerQuote=quote;
  if(!state.job)return;
  const sources=state.job.source_details;
  if(!state.source&&sources.length)state.source=sources[0].id;
  $('#viewer-source').innerHTML=sources.map(s=>ui`<option value="${s.id}" ${s.id===state.source?'selected':''}>${escapeHTML(s.name)}</option>`).join('');
  const source=selectedSource();const target=$('#viewer-content');
  $('#open-source').classList.toggle('hidden',!source);if(source)$('#open-source').href='/api/source-file?job='+state.job.id+'&source='+source.id;
  if(!source){$('#prev-page').disabled=true;$('#next-page').disabled=true;$('#page-number').textContent=t('No reference file');target.innerHTML=ui('<div class="viewer-empty">Reference files are optional.<br>Add one in Documents to inspect it here.</div>');return;}
  state.page=Math.min(Math.max(state.page,1),source.pages.length);const page=source.pages[state.page-1];
  $('#page-number').textContent=t('Page {page} of {pages}',{page:state.page,pages:source.pages.length});
  $('#prev-page').disabled=state.page<=1;$('#next-page').disabled=state.page>=source.pages.length;
  $('#evidence-quote').classList.toggle('hidden',!quote);$('#evidence-quote').textContent=quote?t('Quoted evidence:')+' '+quote:'';
  if(page.image)target.innerHTML=ui`<img src="/api/page?source=${source.id}&page=${state.page}" alt="${t('Source document page {page}',{page:state.page})}" loading="eager">`;
  else target.innerHTML=ui`<pre dir="auto">${escapeHTML(page.text)}</pre>`;
}
function renderFindings(){
  const findings=state.job.findings;const counts={error:0,warning:0,pass:0};findings.forEach(f=>counts[f.level]=(counts[f.level]||0)+1);
  $('#findings-summary').innerHTML=findings.length?Object.entries(counts).map(([level,n])=>ui`<div class="summary-item"><strong>${n}</strong><span>${{error:t('Needs correction'),warning:t('Needs your review'),pass:t('Matching checks')}[level]}</span></div>`).join(''):'';
  const labels=Object.fromEntries(state.boot.fields.map(s=>[s[0],s[isArabic()?2:1]]));
  $('#findings-list').innerHTML=findings.length?[...findings].sort((a,b)=>['error','warning','pass'].indexOf(a.level)-['error','warning','pass'].indexOf(b.level)).map(f=>ui`<article class="finding ${f.level}"><span class="finding-icon">${{error:'!',warning:'!',pass:'✓'}[f.level]}</span><div><h3>${escapeHTML(labels[f.field]||f.field||t('Document'))}</h3><p>${escapeHTML(message(f.message))}</p>${f.expected?ui`<p dir="auto">Expected: ${escapeHTML(f.expected)}</p>`:''}</div><small>${f.page?t('Page {page} of {pages}',{page:f.page,pages:'—'}):t('Check field')}</small></article>`).join(''):ui`<div class="empty-state"><span>✓</span><h3>${state.job.checked_at?t('No field issues found'):t('No checks run yet')}</h3><p>${state.job.checked_at?t('Check and confirm the details, then create the Word file and check its pages.'):t('Complete the employee details, then run the field checks.')}</p></div>`;
}
function renderOutputs(){
  const outputs=(state.job.edit_shadow?state.job.outputs.slice(-1):state.job.outputs).filter(name=>name.toLowerCase().endsWith('.docx')).slice().reverse();
  $('#visual-review-note').classList.toggle('hidden',!outputs.length);
  const card=(name,index)=>{const url='/api/file?job='+state.job.id+'&name='+encodeURIComponent(name)+'&download=1';const metadata=state.job.revisions?.find(r=>r.name===name);return ui`<article class="output-card"><span class="file-type">WORD</span><div class="output-info"><strong dir="auto">${escapeHTML(state.job.output_labels?.[name]||name)}</strong><p>${index===0?t('Latest Word revision'):t('Previous Word revision · kept locally')}</p>${metadata?.created?ui`<p>${escapeHTML(t('Created: {date}',{date:dateTimeLabel(metadata.created)}))}</p>`:''}</div><a class="button primary" href="${url}">Download Word ↓</a></article>`;};
  $('#outputs-list').innerHTML=outputs.length?card(outputs[0],0)+(outputs.length>1?ui`<details class="output-history"><summary>${t('Earlier versions ({count})',{count:outputs.length-1})}</summary>${outputs.slice(1).map((name,i)=>card(name,i+1)).join('')}</details>`:''):ui('<div class="empty-state"><span>▤</span><h3>Your Word contract will appear here</h3><p>Check the details, then choose Create Word.</p></div>');
}

async function checkFields(){
  await saveJob();
  const result=await api('/api/check',savePayload());state.job.findings=result.findings;state.job.validation=result.findings;state.validateAll=true;paintFieldErrors();state.job.checked_at=result.checked_at;state.job.calculations=result.calculations;renderCalculations();renderFindings();updateCounts();setTab('findings');return result.findings;
}
async function mainAction(acknowledge=false){
  await saveJob();
  const issues=await api('/api/check',savePayload());const errors=issues.findings.filter(f=>f.level==='error');
  if(errors.length){state.job.findings=issues.findings;state.job.validation=issues.findings;state.validateAll=true;renderFields();renderFindings();updateCounts();setTab('details');focusFirstError();throw new Error(t('Complete the missing or invalid fields first.'));}
  const unconfirmed=Object.keys(state.job.fields).filter(k=>visibleField(k)&&state.job.fields[k].value&&!state.job.fields[k].confirmed);
  if(unconfirmed.length){setTab('details');throw new Error(t('Check and confirm the {count} remaining filled fields first.',{count:unconfirmed.length}));}
  const warnings=issues.findings.filter(f=>f.level==='warning');
  if(warnings.length&&!acknowledge){state.warningFindings=warnings;$('#warning-content').innerHTML=warnings.map(f=>ui`<article class="finding warning"><span class="finding-icon">!</span><p>${escapeHTML(message(f.message))}</p></article>`).join('');$('#acknowledge-warnings').checked=false;$('#create-confirmed').disabled=true;$('#warning-dialog').showModal();return;}
  const result=await api('/api/generate',{...savePayload(),template_sha:state.boot.templates[fieldValue('contract_type')]?.sha256,acknowledge_warnings:acknowledge});await watchTask(result.task);setTab('outputs');downloadLatestWord();toast(t('Your Word contract is ready. It is also saved in Completed contracts.'));await refreshBootstrap();
}
const templateNames={get employment(){return kindLabel('employment');},get service(){return kindLabel('service');},get extension(){return kindLabel('extension');}};
function templateURL(template,format='docx'){return '/api/template-file?'+new URLSearchParams({kind:template.kind,...(template.draft?{draft:template.draft}:{}),...(template.sha256?{sha:template.sha256}:{}),format});}
function renderTemplates(){
  $('#templates-list').innerHTML=Object.entries(templateNames).map(([kind,label])=>{const template=state.boot.templates[kind];return ui`<article class="template-card" data-template-card="${kind}"><span class="source-symbol">▤</span><h3>${t(label)}</h3><p lang="${isArabic()?'en':'ar'}" dir="${isArabic()?'ltr':'rtl'}">${(isArabic()?{employment:'Employment contract',service:'Service contract',extension:'Extension letter'}:{employment:'عقد عمل',service:'عقد خدمة',extension:'خطاب تمديد'})[kind]}</p><span class="status-chip">${template?.placeholders?.length?t('{count} fields · Active locally',{count:template.placeholders.length}):t('Choose your Word template')}</span>${template?.source_name?ui`<p class="template-filename" dir="auto">${escapeHTML(template.source_name)}</p>`:''}<div class="template-actions">${template?ui`<a class="button secondary" href="${templateURL({kind})}">Download to edit ↓</a>`:''}<button class="button primary" data-replace-template="${kind}">${template?t('Replace template'):t('Choose template')} ＋</button>${template?ui`<button class="inline-link" data-template="${kind}">Fields, preview &amp; previous versions ↗</button>`:''}</div></article>`;}).join('');
  $('#override-list').innerHTML=(state.boot.rules.job_title_overrides||[]).map(r=>ui`<div class="override-row"><strong dir="rtl">${escapeHTML(r.name_ar)}</strong><span>${escapeHTML(r.job_title_en)}</span></div>`).join('')||ui('<p>No individual overrides saved.</p>');
}
async function templateEditor(kind,draft=null){
  const result=await api('/api/template-editor?'+new URLSearchParams({kind,...(draft?{draft}:{})}));showTemplateEditor(result);$('#template-editor').scrollIntoView({behavior:'smooth',block:'start'});
}
function tokenLabel(token){return state.boot.fields.find(f=>f[0]===token)?.[isArabic()?2:1]||({execution_ar:t('Contract date · Arabic'),execution_en:t('Contract date · English'),start_ar:t('Start date · Arabic'),start_en:t('Start date · English'),end_ar:t('End date · Arabic'),end_en:t('End date · English'),identity_details_ar:t('ID / passport details · Arabic'),identity_details_en:t('ID / passport details · English'),salary_words_ar:t('Salary in words · Arabic'),salary_words_en:t('Salary in words · English'),weekday_ar:t('Contract weekday · Arabic'),weekday_en:t('Contract weekday · English'),original_ar:t('Original contract date · Arabic'),original_en:t('Original contract date · English')}[token])||token.replaceAll('_',' ');}
function showTemplateEditor(result){
  state.template=result;state.refreshPreview=null;const editor=$('#template-editor');editor.classList.remove('hidden');
  const isDraft=!!result.draft;
  editor.innerHTML=ui`<div class="panel-heading"><div><span class="eyebrow">${isDraft?t('NEW VERSION · DRAFT'):t('CURRENT TEMPLATE')}</span><h2>${templateNames[result.kind]}</h2><p class="template-filename" dir="auto">${escapeHTML(result.name)}</p></div><button class="button secondary" id="close-template">Close</button></div><p class="template-help">${isDraft?t('Your active template stays in use until you activate this draft.'):t('Download this Word file to change wording or layout. Keep tags such as {{name_ar}} and {{name_en}}, or use the mapper below to mark changing text.')}</p><div class="heading-buttons template-toolbar"><a class="button secondary" href="${templateURL(result)}">${t(isDraft?t('Draft download ↓'):t('Download to edit ↓'))}</a><button class="button secondary" id="preview-template">Preview pages</button><button class="button secondary" data-replace-template="${result.kind}">Choose another Word file ＋</button></div><div id="template-preview" class="hidden"></div><div class="template-checks">${result.errors.map(message=>ui`<p class="template-check error">! ${escapeHTML(NMOI18n.message(message))}</p>`).join('')}${result.warnings.map(message=>ui`<p class="template-check">${escapeHTML(NMOI18n.message(message))}</p>`).join('')}<p><strong>${result.placeholders.length} field types found</strong></p><div class="token-list">${result.placeholders.map(t=>ui`<span>{{${escapeHTML(t)}}}</span>`).join('')}</div></div>${isDraft?ui`<div class="template-activation"><label class="acknowledge"><input id="template-reviewed" type="checkbox">I checked the wording, Arabic and English layout, and all changing fields, including repeated names, dates and signature details.</label><button class="button primary" id="activate-template" disabled>Use this template →</button><p>Previous versions are kept locally. Existing contract files remain saved.</p></div>`:''}<details class="template-mapper" ${result.errors.length?'open':''}><summary>Map the text that should change for each employee</summary><p class="template-help">Select text in a paragraph below, then choose the field it represents. Map each repeated occurrence separately. Fixed wording and formatting are retained.</p><form class="mapping-form" id="mapping-form"><label>Paragraph<input id="map-paragraph" type="number" min="0" required></label><label>Exact text to replace<input id="map-before" dir="auto" required></label><label>Fill with field<select id="map-key">${result.tokens.map(t=>ui`<option value="${t}">${escapeHTML(tokenLabel(t))} · {{${t}}}</option>`).join('')}</select></label><button class="button primary" type="submit">Save to draft</button></form><div class="template-paragraphs">${result.paragraphs.map(p=>ui`<div class="template-paragraph" data-paragraph="${p.index}" dir="auto"><small class="subtle">${t('Paragraph {number}',{number:p.index})}</small><br><span>${escapeHTML(p.text)}</span></div>`).join('')}</div></details><details class="template-history"><summary>Previous versions (${result.history.length})</summary><p class="template-help">Restore opens a draft for you to check before using it.</p>${result.history.map(old=>ui`<div class="template-version"><div><strong>${escapeHTML(old.source_name||t('Previous template'))}</strong><p>${old.saved_at?escapeHTML(new Date(old.saved_at).toLocaleString(NMOI18n.locale())):t('Saved locally')}</p></div><button class="button secondary" data-restore-template="${old.version}">Restore as draft ↗</button></div>`).join('')||ui('<p class="template-help">Your first previous version will appear after replacing this template.</p>')}</details>`;
  $('#close-template').addEventListener('click',()=>{editor.classList.add('hidden');state.template=null;state.refreshPreview=null;});
  $('#template-reviewed')?.addEventListener('change',e=>$('#activate-template').disabled=!e.target.checked||!!result.errors.length);
  $('#activate-template')?.addEventListener('click',()=>templateOperation(async()=>{await api('/api/template-activate',{kind:result.kind,draft:result.draft,expected_sha:result.sha256,reviewed:$('#template-reviewed').checked});await refreshBootstrap();renderTemplates();await templateEditor(result.kind);toast(t('The new template is active. Its previous version is saved locally.'));}));
  $('#preview-template').addEventListener('click',()=>templateOperation(async()=>{const task=await api('/api/template-preview',{kind:result.kind,draft:result.draft,expected_sha:result.sha256});const output=await watchTask(task.task);if(!output?.pages||state.template?.sha256!==result.sha256||state.view!=='templates')return;const preview=$('#template-preview');preview.classList.remove('hidden');preview.innerHTML=ui`<div class="template-preview-controls"><button class="button secondary" id="template-prev-page" aria-label="Previous template page">←</button><span id="template-page-number"></span><button class="button secondary" id="template-next-page" aria-label="Next template page">→</button></div><div class="template-preview-page"><img id="template-page-image" alt="Local template page preview"></div>`;let current=1;const render=()=>{$('#template-prev-page').textContent=isArabic()?'→':'←';$('#template-next-page').textContent=isArabic()?'←':'→';$('#template-page-number').textContent=t('Page {page} of {pages}',{page:current,pages:output.pages});$('#template-prev-page').disabled=current===1;$('#template-next-page').disabled=current===output.pages;$('#template-page-image').src='/api/template-page?'+new URLSearchParams({kind:result.kind,...(result.draft?{draft:result.draft}:{}),sha:output.sha256,page:current});};$('#template-prev-page').addEventListener('click',()=>{current--;render();});$('#template-next-page').addEventListener('click',()=>{current++;render();});state.refreshPreview=render;render();}));
  $('#mapping-form').addEventListener('submit',event=>{event.preventDefault();templateOperation(async()=>{const updated=await api('/api/template-save',{kind:result.kind,draft:result.draft,expected_sha:result.sha256,mappings:[{paragraph:$('#map-paragraph').value,before:$('#map-before').value,key:$('#map-key').value}]});showTemplateEditor(updated);$('.template-mapper').open=true;toast(t('Field mapping saved to a draft. Check it before activating.'));});});
  $$('.template-paragraph').forEach(el=>el.addEventListener('mouseup',()=>{const selection=window.getSelection();const selected=selection.toString();if(selected&&el.contains(selection.anchorNode)&&el.contains(selection.focusNode)){$('#map-paragraph').value=el.dataset.paragraph;$('#map-before').value=selected;}}));
  $$('[data-restore-template]').forEach(button=>button.addEventListener('click',()=>templateOperation(async()=>{const updated=await api('/api/template-restore',{kind:result.kind,version:button.dataset.restoreTemplate,expected_sha:state.boot.templates[result.kind]?.sha256||''});showTemplateEditor(updated);toast(t('Previous version opened as a draft. Check it, then activate it.'));})));
}
async function templateOperation(operation){
  if(state.templateBusy){toast(t('Wait for the current template operation to finish.'));return;}state.templateBusy=true;
  const buttons=$$('#templates-view button,#templates-view input,#templates-view select');const disabled=buttons.map(b=>b.disabled);buttons.forEach(b=>b.disabled=true);
  try{await operation();}catch(error){handleError(error);}finally{state.templateBusy=false;buttons.forEach((b,i)=>{if(b.isConnected)b.disabled=disabled[i];});}
}
async function importTemplate(file,kind){
  if(!file.name.toLowerCase().endsWith('.docx'))throw new Error(t('Choose a .docx Word template.'));
  if(file.size>25*1024*1024)throw new Error(t('Choose a Word template up to 25 MB.'));
  await templateOperation(async()=>{const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=reject;reader.readAsDataURL(file);});const result=await api('/api/template-import',{kind,name:file.name,data,expected_sha:state.boot.templates[kind]?.sha256||''});showTemplateEditor(result);$('#template-editor').scrollIntoView({behavior:'smooth',block:'start'});toast(t('Template added as a local draft. Check the fields and pages before using it.'));});
}
function renderSetup(){
  $('#setup-cards').innerHTML=ui`<article class="setup-card"><span class="status-chip">Ready</span><h3>Word contracts</h3><p>Generation fills your approved Word templates. Each export is saved as a separate revision in Completed contracts.</p></article><article class="setup-card"><span class="status-chip">Local storage</span><h3>Your saved work</h3><p>Keep a private backup of this app’s data folder. Word files, editable details, source records and template history are stored there.</p></article><article class="setup-card"><span class="status-chip">Works offline</span><h3>On this computer</h3><p>No AI model or online account is needed. Spreadsheet imports and template controls are available in the small More menu.</p></article>`;
}

function renderCalculations(){
  if(!state.job)return;const values=state.job.calculations||{};const lines=[];
  if(values.weekday_en)lines.push(ui`<div><span>Contract weekday</span><strong><b lang="${isArabic()?'ar':'en'}" dir="${isArabic()?'rtl':'ltr'}">${escapeHTML(values[isArabic()?'weekday_ar':'weekday_en'])}</b><b lang="${isArabic()?'en':'ar'}" dir="${isArabic()?'ltr':'rtl'}">${escapeHTML(values[isArabic()?'weekday_en':'weekday_ar'])}</b></strong></div>`);
  if(values.calendar_days)lines.push(ui`<div><span>Contract period</span><strong>${values.calendar_days} calendar days</strong><small>Includes the start and end dates.</small></div>`);
  if(values.salary_words_en)lines.push(ui`<div><span>Salary in words</span><p lang="${isArabic()?'ar':'en'}" dir="${isArabic()?'rtl':'ltr'}">${escapeHTML(values[isArabic()?'salary_words_ar':'salary_words_en'])}</p><p lang="${isArabic()?'en':'ar'}" dir="${isArabic()?'ltr':'rtl'}">${escapeHTML(values[isArabic()?'salary_words_en':'salary_words_ar'])}</p></div>`);
  $('#calculated-values').innerHTML=ui`<h3>Calculated for you</h3>${lines.join('')||ui('<p>Enter dates and salary to see the weekday, contract period and salary wording.</p>')}`;
}
function chooseSource(role){
  state.role=role;
  $('#file-picker').accept=role==='list'?'.ods,.xlsx,.csv':'.pdf,.docx,.png,.jpg,.jpeg,.txt';
  $('#file-picker').click();
}
function rowSummary(row){return Object.values(row.cells).map(c=>c.value).filter(Boolean).join(' · ').slice(0,160);}
function closeToolMenus(){$$('details.more-menu').forEach(menu=>menu.open=false);}
function paintFieldErrors(){
  if(!state.job)return;
  const errors=(state.job.validation||state.job.findings||[]).filter(item=>item.level==='error');const messages={};
  for(const error of errors){(messages[error.field]||=[]).push(error.message);if(error.field==='issuer_ar'&&error.message.includes('both languages'))(messages.issuer_en||=[]).push(error.message);}
  let shown=0;
  $$('.field-row').forEach(row=>{
    const key=row.dataset.row;const input=$('#field-'+key);const target=$('#error-'+key);if(!input||!target)return;
    const visible=state.validateAll||state.touched.has(key)||!!state.job.fields[key]?.value;
    const text=visible?(messages[key]||[]).map(message).join(' '):'';
    row.classList.toggle('invalid',!!text);target.classList.toggle('hidden',!text);target.textContent=text;
    if(text){input.setAttribute('aria-invalid','true');input.setAttribute('aria-describedby',target.id);shown++;}
    else{input.removeAttribute('aria-invalid');input.removeAttribute('aria-describedby');}
  });
  $('#form-error-summary').classList.toggle('hidden',!shown);
  $('#form-error-summary').innerHTML=shown?ui`<strong>${isArabic()?t('{count} fields need correction.',{count:shown}):`${shown} ${shown===1?'field needs':'fields need'} correction.`}</strong> Check the fields marked in red. <button class="inline-link" id="first-field-error">Go to first error ↓</button>`:'';
  $('#first-field-error')?.addEventListener('click',focusFirstError);
}
function focusFirstError(){
  const input=$('.field-row.invalid .field-input');if(input){input.scrollIntoView({behavior:'smooth',block:'center'});input.focus({preventScroll:true});}
}
function renderCompletedLegacy(){
  const query=($('#completed-search').value||'').trim().toLocaleLowerCase();const kind=$('#completed-kind').value;
  const jobs=(state.boot.completed||[]).filter(job=>(!kind||job.kind===kind)&&(!query||(job.title+' '+(job.latest_word||'')).toLocaleLowerCase().includes(query)));
  $('#completed-count').textContent=isArabic()?t('{count} contracts',{count:jobs.length}):`${jobs.length} ${jobs.length===1?'contract':'contracts'}`;
  $('#completed-list').innerHTML=jobs.length?jobs.map(job=>ui`<article class="completed-card"><div class="completed-icon">▤</div><div class="completed-info"><span class="eyebrow">${escapeHTML(templateNames[job.kind]||job.kind)}</span><h3 dir="auto">${escapeHTML(jobLabel(job))}</h3><p>${isArabic()?t('{count} saved Word revisions',{count:job.word_count}):`${job.word_count} saved Word ${job.word_count===1?'revision':'revisions'}`} ${job.has_changes?t('· Draft changes saved; export to update Word'):''}${job.last_exported?' · '+escapeHTML(dateLabel(job.last_exported)):''}</p><small dir="auto">${escapeHTML(job.latest_label||job.latest_word)}</small></div><div class="completed-actions"><a class="button primary" href="/api/file?job=${job.id}&name=${encodeURIComponent(job.latest_word)}&download=1">Download Word ↓</a><button class="button secondary" data-open-completed="${job.id}">${job.archive_only?t('View saved files'):t('Edit saved details')}</button><button class="inline-link" data-upload-revision="${job.id}">Save edited Word ↥</button></div></article>`).join(''):ui('<div class="empty-state completed-empty"><span>▤</span><h3>No completed contracts here yet</h3><p>Create a Word contract, or add an existing Word file above.</p></div>');
}
function archiveDialog(jobId=null){
  if(typeof archiveState!=='undefined')archiveState.uploadTarget=null;
  $('#archive-edit-help').classList.add('hidden');$('#archive-edit-download').classList.add('hidden');
  state.archiveJob=jobId;state.archiveFile=null;$('#archive-form').reset();$('#archive-error').textContent='';$('#archive-file-name').textContent=t('No file selected');$('#save-archive-word').disabled=true;
  $('#archive-metadata').classList.toggle('hidden',!!jobId);
  $('#archive-dialog-title').textContent=jobId?t('Save a Word revision'):t('Add an existing Word contract');$('#archive-dialog').showModal();
}
function encodedFile(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=reject;reader.readAsDataURL(file);});}
async function openSheet(sourceId,index=0,header=null){
  if(state.task)throw new Error(t('Wait for the current step to finish.'));
  await saveJob();
  const query=new URLSearchParams({job:state.job.id,source:sourceId,sheet:index,...(header?{header}:{})});
  const data=await api('/api/sheet?'+query);
  const previous=state.sheet?.source===sourceId&&state.sheet?.index===index?state.sheet:null;
  const row=data.rows.find(r=>r.number===previous?.row&&r.number!==data.header)||data.rows.find(r=>r.number>data.header)||data.rows.find(r=>r.number!==data.header);
  state.sheet={source:sourceId,index,data,row:row?.number||null,mappings:header||!previous?{...data.suggested_mapping}:{...previous.mappings}};
  renderSheet();if(!$('#sheet-dialog').open)$('#sheet-dialog').showModal();
}
function renderSheet(){
  const sheet=state.sheet;const data=sheet.data;
  $('#sheet-content').innerHTML=ui`<form id="sheet-import-form"><div class="sheet-controls"><label>Worksheet<select id="sheet-name">${data.sheets.map((name,index)=>ui`<option value="${index}" ${index===sheet.index?'selected':''}>${escapeHTML(name)}</option>`).join('')}</select></label><label>Header row<select id="sheet-header">${data.rows.map(row=>ui`<option value="${row.number}" ${row.number===data.header?'selected':''}>${escapeHTML(t('Row {row} · {text}',{row:row.number,text:rowSummary(row).slice(0,65)}))}</option>`).join('')}</select></label></div><label class="sheet-search-label">Find an employee in this sheet<input id="sheet-search" placeholder="Search the row text" autocomplete="off"></label><label>Employee row<select id="sheet-row"></select></label><div class="sheet-table-wrap"><table class="sheet-table"><thead><tr><th>Column</th><th>Heading</th><th>Selected row value</th><th>Use as contract field</th></tr></thead><tbody id="sheet-mappings"></tbody></table></div><label class="acknowledge"><input id="sheet-replace" type="checkbox">Replace fields that already have values. Leave unchecked to keep them.</label><p class="sheet-import-note">Dates must be clear. Ambiguous dates and spreadsheet errors are left for manual entry. Formulas use their saved results and are not recalculated.</p><p id="sheet-message" class="error-text" role="alert"></p><div class="dialog-actions"><button type="button" class="button secondary" id="cancel-sheet">Cancel</button><button class="button primary" type="submit" id="import-sheet-row">Import selected row →</button></div></form>`;
  renderSheetRows();renderSheetMappings();
  $('#sheet-search').addEventListener('input',()=>{renderSheetRows();renderSheetMappings();});
  $('#sheet-row').addEventListener('change',event=>{sheet.row=+event.target.value;renderSheetMappings();});
  $('#sheet-name').addEventListener('change',event=>{const index=+event.target.value;state.sheet=null;openSheet(sheet.source,index).catch(handleError);});
  $('#sheet-header').addEventListener('change',event=>openSheet(sheet.source,sheet.index,+event.target.value).catch(handleError));
  $('#cancel-sheet').addEventListener('click',()=>$('#sheet-dialog').close());
  $('#sheet-import-form').addEventListener('submit',async event=>{
    event.preventDefault();const button=$('#import-sheet-row');button.disabled=true;$('#sheet-message').textContent='';
    try{
      if(!sheet.row||sheet.row===data.header)throw new Error(t('Choose the employee row below the headings.'));
      const result=await api('/api/sheet-import',{job:state.job.id,source:sheet.source,sheet:sheet.index,row:sheet.row,mappings:sheet.mappings,replace_filled:$('#sheet-replace').checked});
      state.job=result.job;state.source=sheet.source;state.page=sheet.index+1;renderJob();$('#sheet-dialog').close();setTab('details');
      toast(t('{count} fields imported. {kept}Check the imported details against the row.',{count:result.imported.length,kept:result.skipped.length?t('{count} existing fields kept. ',{count:result.skipped.length}):''}));
    }catch(error){handleError(error);}finally{if(button.isConnected)button.disabled=false;}
  });
}
function renderSheetRows(){
  const sheet=state.sheet;const query=($('#sheet-search').value||'').trim().toLocaleLowerCase();
  const rows=sheet.data.rows.filter(row=>row.number!==sheet.data.header&&(!query||(String(row.number)+' '+Object.values(row.cells).map(cell=>cell.value).join(' ')).toLocaleLowerCase().includes(query)));
  if(!rows.some(row=>row.number===sheet.row))sheet.row=rows[0]?.number||null;
  $('#sheet-row').innerHTML=rows.map(row=>ui`<option value="${row.number}" ${row.number===sheet.row?'selected':''}>${escapeHTML(t('Row {row} · {text}',{row:row.number,text:rowSummary(row)}))}</option>`).join('');
  $('#import-sheet-row').disabled=!rows.length;
}
function renderSheetMappings(){
  const sheet=state.sheet;const header=sheet.data.rows.find(r=>r.number===sheet.data.header);const row=sheet.data.rows.find(r=>r.number===sheet.row);
  $('#sheet-mappings').innerHTML=sheet.data.columns.map(column=>{const item=row?.cells[column];return ui`<tr><td>${column}</td><td dir="auto">${escapeHTML(header?.cells[column]?.value||'—')}</td><td dir="auto" class="sheet-cell-value">${escapeHTML(item?.value||'—')}${item?.formula?ui('<small>Saved formula result</small>'):''}</td><td><select class="sheet-map" data-column="${column}" aria-label="${t('Contract field for column {column}',{column})}"><option value="">Do not import</option>${state.boot.fields.map(([key,en,ar])=>ui`<option value="${key}" ${sheet.mappings[column]===key?'selected':''}>${escapeHTML(isArabic()?ar:en)}</option>`).join('')}</select></td></tr>`;}).join('');
  $$('.sheet-map').forEach(select=>select.addEventListener('change',()=>sheet.mappings[select.dataset.column]=select.value));
}
function handleError(error){if(error.findings&&state.job){state.job.findings=error.findings;state.job.validation=error.findings;state.validateAll=true;paintFieldErrors();renderFindings();updateCounts();}if($('#identity-dialog').open)$('#identity-type-error').textContent=message(error.message);if($('#archive-dialog').open)$('#archive-error').textContent=message(error.message);if($('#sheet-dialog').open&&$('#sheet-message'))$('#sheet-message').textContent=message(error.message);toast(error.message||t('The action could not finish.'),true);}

document.addEventListener('click',async event=>{
  const nav=event.target.closest('[data-nav]');if(nav){if(state.task){toast(t('Wait for the current step to finish.'));return;}try{if(state.job)await saveJob();await refreshBootstrap();setView(nav.dataset.nav);}catch(error){handleError(error);return;}}
  if(nav)closeToolMenus();
  const start=event.target.closest('[data-new]');if(start){if(state.task){toast(t('Wait for the current step to finish.'));return;}newDialog(start.dataset.new);}
  const tab=event.target.closest('[data-tab]');if(tab&&state.job)setTab(tab.dataset.tab);
  const job=event.target.closest('[data-job]');if(job)openJob(job.dataset.job).catch(handleError);
  const completed=event.target.closest('[data-open-completed]');if(completed&&!completed.dataset.editLatest)openJob(completed.dataset.openCompleted).catch(handleError);
  const revision=event.target.closest('[data-upload-revision]');if(revision)archiveDialog(revision.dataset.uploadRevision);
  const add=event.target.closest('[data-add-role]');if(add){state.role=add.dataset.addRole;chooseSource(state.role);}
  const sheet=event.target.closest('[data-sheet-source]');if(sheet)openSheet(sheet.dataset.sheetSource).catch(handleError);
  const preview=event.target.closest('[data-preview]');if(preview){state.source=preview.dataset.preview;state.page=1;setTab('details');renderViewer();}
  const evidence=event.target.closest('[data-evidence]');if(evidence){const e=state.job.fields[evidence.dataset.evidence].evidence[+evidence.dataset.index];state.source=e.source_id;state.page=e.page;renderViewer(e.quote);}
  const template=event.target.closest('[data-template]');if(template)templateEditor(template.dataset.template).catch(handleError);
  const replaceTemplate=event.target.closest('[data-replace-template]');if(replaceTemplate){state.templateKind=replaceTemplate.dataset.replaceTemplate;$('#template-picker').click();}
  if(event.target.closest('.close-dialog'))event.target.closest('dialog').close();
});
document.addEventListener('input',event=>{
  const key=event.target.dataset.field;
  if(key&&state.job){if(key==='identity_type'&&event.target.value==='__add__')return;state.touched.add(key);state.job.findings=[];delete state.job.checked_at;state.job.fields[key].value=event.target.value;state.job.fields[key].confirmed=false;state.job.fields[key].origin='entered by you';const row=event.target.closest('.field-row');row.classList.remove('confirmed','invalid');event.target.removeAttribute('aria-invalid');$('#error-'+key).classList.add('hidden');const check=$('[data-confirm]',row);check.checked=false;check.disabled=!event.target.value;updateCounts();queueSave();}
});
document.addEventListener('change',event=>{
  const key=event.target.dataset.confirm;
  if(key&&state.job){state.job.fields[key].confirmed=event.target.checked;event.target.closest('.field-row').classList.toggle('confirmed',event.target.checked);updateCounts();queueSave();}
  if(event.target.dataset.field==='identity_type'&&event.target.value==='__add__'){event.target.value=state.job.fields.identity_type.value;$('#identity-form').reset();$('#identity-type-error').textContent='';$('#identity-dialog').showModal();}
  if(event.target.dataset.field==='contract_type'){renderFields();renderCalculations();updateCounts();}
});
$('#new-form').addEventListener('submit',async event=>{event.preventDefault();try{const job=await api('/api/new',{kind:$('#new-kind').value});$('#new-dialog').close();await refreshBootstrap();await openJob(job.id);if(state.mode==='spreadsheet')chooseSource('list');}catch(error){handleError(error);}});
$('#file-picker').addEventListener('change',event=>{const file=event.target.files[0];event.target.value='';if(file)importFile(file,state.role).catch(handleError);});
$('#quick-sheet').addEventListener('click',()=>{chooseSource('list');closeToolMenus();});
$('#more-spreadsheet').addEventListener('click',()=>{closeToolMenus();if(state.view==='job'&&!state.job.archive_only)chooseSource('list');else newDialog('spreadsheet');});
$('#completed-search').addEventListener('input',renderCompleted);
$('#completed-kind').addEventListener('change',renderCompleted);
$('#add-archived-word').addEventListener('click',()=>archiveDialog());
$('#choose-archive-word').addEventListener('click',()=>$('#archive-picker').click());
$('#archive-picker').addEventListener('change',event=>{const file=event.target.files[0];event.target.value='';if(!file)return;if(!file.name.toLowerCase().endsWith('.docx')||file.size>25*1024*1024){$('#archive-error').textContent=t('Choose a Word .docx file up to 25 MB.');return;}state.archiveFile=file;$('#archive-file-name').textContent=file.name;$('#archive-error').textContent='';if(!$('#archive-title').value)$('#archive-title').value=file.name.replace(/\.docx$/i,'');$('#save-archive-word').disabled=false;});
$('#archive-form').addEventListener('submit',async event=>{event.preventDefault();if(!state.archiveFile)return;const button=$('#save-archive-word');button.disabled=true;try{const result=await api('/api/archive-word',{job:state.archiveJob,name:state.archiveFile.name,data:await encodedFile(state.archiveFile),title:$('#archive-title').value,kind:$('#archive-kind').value,...(archiveState.uploadTarget?{replace_name:archiveState.uploadTarget.name,expected_sha:archiveState.uploadTarget.sha256}:{})});if(state.job?.id===result.job.id){state.job=result.job;renderJob();}await refreshArchive();$('#archive-dialog').close();toast(t('Word revision saved in Completed contracts.'));}catch(error){handleError(error);}finally{button.disabled=false;}});
$('#identity-form').addEventListener('submit',async event=>{event.preventDefault();const button=$('#identity-form button[type=submit]');button.disabled=true;try{const result=await api('/api/identity-type',{ar:$('#identity-label-ar').value,en:$('#identity-label-en').value,verb_ar:$('#identity-verb').value,article_en:$('#identity-article').value});state.boot.identity_types=result.identity_types;state.job.fields.identity_type={value:result.identity_type.id,confirmed:false,evidence:[],origin:'chosen by you'};state.touched.add('identity_type');state.job.findings=[];delete state.job.checked_at;renderFields();updateCounts();queueSave();$('#identity-dialog').close();toast(t('Document type saved. It is available for future contracts.'));}catch(error){handleError(error);}finally{button.disabled=false;}});
$('#template-picker').addEventListener('change',event=>{const file=event.target.files[0];event.target.value='';if(file)importTemplate(file,state.templateKind).catch(handleError);});
$('#save-job').addEventListener('click',()=>saveJob(false).catch(handleError));
$('#back-workspace').addEventListener('click',async()=>{if(state.task){toast(t('Wait for the current step to finish.'));return;}try{await saveJob();await refreshBootstrap();setView('workspace');}catch(error){handleError(error);}});
$('#main-action').addEventListener('click',()=>mainAction().catch(handleError));
$('#create-confirmed').addEventListener('click',()=>{$('#warning-dialog').close();mainAction(true).catch(handleError);});
$('#acknowledge-warnings').addEventListener('change',event=>$('#create-confirmed').disabled=!event.target.checked);
$('#confirm-visible').addEventListener('click',()=>{for(const [key,field]of Object.entries(state.job.fields)){if(field.value&&visibleField(key))field.confirmed=true;}renderFields();updateCounts();queueSave();toast(t('Filled fields marked as checked. You can uncheck any field that needs another look.'));});
$('#check-fields').addEventListener('click',()=>checkFields().catch(handleError));
$('#quit-app').addEventListener('click',async()=>{try{if(state.job)await saveJob();await api('/api/shutdown',{});document.body.innerHTML=ui('<main><h1>NMO Contract Maker is closed.</h1><p>Your work is saved on this Mac. You can close this tab and reopen the app whenever you need it.</p></main>');}catch(error){handleError(error);}});
$('#viewer-source').addEventListener('change',event=>{state.source=event.target.value;state.page=1;renderViewer();});
$('#prev-page').addEventListener('click',()=>{state.page--;renderViewer();});
$('#next-page').addEventListener('click',()=>{state.page++;renderViewer();});
$('#cancel-task').addEventListener('click',async()=>{if(state.task){await api('/api/cancel',{task:state.task});$('#task-message').textContent=t('Stopping after the current step; completed files stay saved.');}});
window.addEventListener('beforeunload',event=>{if(state.task||state.unsaved||state.saving){event.preventDefault();event.returnValue='';}});
function refreshLanguage(){
  NMOI18n.applyStatic();
  const button=$('#language-switch');button.textContent=isArabic()?'English':'عربي';button.lang=isArabic()?'en':'ar';button.setAttribute('aria-label',isArabic()?'Switch to English':'التبديل إلى العربية');
  $('#today').textContent=new Date().toLocaleDateString(NMOI18n.locale(),{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  $('#new-mode-label').textContent=t(state.mode==='spreadsheet'?t('START FROM A SPREADSHEET'):t('NEW CONTRACT'));
  $('#archive-dialog-title').textContent=t(state.archiveJob?t('Save a Word revision'):t('Add an existing Word contract'));
  if(!state.archiveFile)$('#archive-file-name').textContent=t('No file selected');else $('#archive-file-name').textContent=state.archiveFile.name;
  $('#prev-page').textContent=isArabic()?'→':'←';$('#next-page').textContent=isArabic()?'←':'→';
  if(!state.boot)return;
  $('#breadcrumb').textContent=t(({workspace:t('My workspace'),job:t('My workspace / Contract details'),completed:t('Completed contracts'),history:t('Contract history'),templates:t('Templates & rules'),setup:t('About & storage')})[state.view]);
  renderJobs();renderCompleted();renderTemplates();renderSetup();
  if(state.job){renderJob();renderViewer(state.viewerQuote||'');}
  if(state.template)showTemplateEditor(state.template);
  if(state.sheet&&$('#sheet-dialog').open)renderSheet();
  if(typeof archiveState!=='undefined'&&archiveState.history)renderHistory();
  if($('#tags-dialog').open)renderTagOptions();
  if(state.task){$('#task-title').textContent=message(state.taskDetails?.label||t('Working locally'));$('#task-message').textContent=message(state.taskDetails?.message||'');}
}
function switchLanguage(){
  const active=document.activeElement?.id;
  const expanded=$$('details[id],.template-mapper,.template-history').map(el=>({id:el.id,selector:el.id?'#'+el.id:'.'+el.className,open:el.open}));
  clearTimeout(toastTimer);$('#toast').classList.add('hidden');
  const snapshot=[...document.querySelectorAll('input[id],select[id]')].map(el=>({id:el.id,value:el.value,checked:el.checked,disabled:el.disabled}));
  const preview=$('#template-preview');const previewRefresh=state.refreshPreview;
  const sheetRow=state.sheet?.row;
  NMOI18n.setLanguage(isArabic()?'en':'ar');refreshLanguage();
  for(const saved of snapshot){const el=document.getElementById(saved.id);if(el&&el.type!=='file'){el.value=saved.value;el.checked=saved.checked;el.disabled=saved.disabled;}}
  if(preview&&state.template){$('#template-preview')?.replaceWith(preview);preview.querySelector('#template-prev-page')?.setAttribute('aria-label',t('Previous template page'));preview.querySelector('#template-next-page')?.setAttribute('aria-label',t('Next template page'));const prev=preview.querySelector('#template-prev-page'),next=preview.querySelector('#template-next-page');if(prev)prev.textContent=isArabic()?'→':'←';if(next)next.textContent=isArabic()?'←':'→';if(preview.querySelector('#template-page-image')){state.refreshPreview=previewRefresh;previewRefresh?.();}}
  if(state.sheet&&$('#sheet-dialog').open){state.sheet.row=sheetRow;renderSheetRows();renderSheetMappings();}
  if($('#warning-dialog').open&&state.job)$('#warning-content').innerHTML=(state.warningFindings||[]).map(f=>ui`<article class="finding warning"><span class="finding-icon">!</span><p>${escapeHTML(message(f.message))}</p></article>`).join('');
  if(state.task)$$('#fields-form input,#fields-form select,#confirm-visible,#save-job').forEach(el=>el.disabled=true);
  expanded.forEach(saved=>{const el=$(saved.selector);if(el)el.open=saved.open;});
  closeToolMenus();document.getElementById(active)?.focus({preventScroll:true});
}
$('#language-switch').addEventListener('click',switchLanguage);
NMOI18n.captureStatic();refreshLanguage();
async function init(){
  if(location.protocol==='file:'){
    document.body.innerHTML=ui('<main class="local-start-help"><h1>Open Contract Maker</h1><p>Open <strong>NMO Contract Maker.app</strong> first, then use the local website below.</p><a class="button primary" href="http://127.0.0.1:8770/">Open Contract Maker →</a></main>');
    return;
  }
  try{await refreshBootstrap();$('#today').textContent=new Date().toLocaleDateString(NMOI18n.locale(),{weekday:'long',day:'numeric',month:'long',year:'numeric'}).toUpperCase();refreshLanguage();}
  catch(error){$('#job-list').innerHTML=ui('<div class="empty-state"><h3>The local app is starting</h3><p>Reload this window in a moment. Your files remain on this computer.</p></div>');handleError(error);}
}
init();

// Saved versions and tags use the local archive APIs; no Word text is inferred.
const archiveState={history:null,selection:null,tagGroup:null,selectedTags:new Set(),deleteTag:null,undo:null,uploadTarget:null};
function dateTimeLabel(value){const date=new Date(value);return Number.isNaN(date.getTime())?t('Creation time unavailable'):date.toLocaleString(NMOI18n.locale(),{year:'numeric',month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});}
function tagPills(ids){return ids.map(id=>(state.boot.tags||[]).find(tag=>tag.id===id)).filter(Boolean).map(tag=>ui`<button class="tag-pill" data-filter-tag="${tag.id}" data-tag-color="${tag.color}" dir="auto">${escapeHTML(tag.name)}</button>`).join('');}
function colorTags(root=document){$$('[data-tag-color]',root).forEach(el=>{const color=el.dataset.tagColor;if(/^#[0-9a-f]{6}$/i.test(color)){el.style.setProperty('--tag-color',color);el.style.setProperty('--tag-tint',color+'20');}});}
function renderCompleted(){
  if(!state.boot?.history_enabled){$('#archive-organization').classList.add('hidden');return renderCompletedLegacy();}
  $('#archive-organization').classList.remove('hidden');
  const oldTag=$('#completed-tag').value;
  $('#completed-tag').innerHTML=ui`<option value="">All tags</option><option value="__none__">Untagged</option>${(state.boot.tags||[]).map(tag=>ui`<option value="${tag.id}">${escapeHTML(tag.name)}</option>`).join('')}`;
  if([...$('#completed-tag').options].some(option=>option.value===oldTag))$('#completed-tag').value=oldTag;
  const query=$('#completed-search').value.trim().toLocaleLowerCase(),kind=$('#completed-kind').value,tag=$('#completed-tag').value,sort=$('#completed-sort').value;
  let jobs=(state.boot.completed||[]).filter(job=>(!kind||job.by_kind?.[kind]||job.kind===kind)&&(!tag||(tag==='__none__'?!job.tag_ids?.length:job.tag_ids?.includes(tag))));
  if(kind)jobs=jobs.map(job=>({...job,...job.by_kind?.[kind]}));
  jobs=jobs.filter(job=>!query||(job.title+' '+job.latest_word+' '+(job.tag_ids||[]).map(id=>state.boot.tags?.find(t=>t.id===id)?.name||'').join(' ')).toLocaleLowerCase().includes(query));
  const collator=new Intl.Collator(NMOI18n.locale(),{numeric:true,sensitivity:'base'});
  const tagName=job=>(job.tag_ids||[]).map(id=>state.boot.tags?.find(t=>t.id===id)?.name||'').sort(collator.compare).join(' ');
  jobs.sort((a,b)=>sort==='az'?collator.compare(a.title,b.title):sort==='za'?collator.compare(b.title,a.title):sort==='tags'?collator.compare(tagName(a),tagName(b))||collator.compare(a.title,b.title):sort==='oldest'?(a.created||'').localeCompare(b.created||''):sort==='newest'?(b.created||'').localeCompare(a.created||''):(b.updated||b.last_exported||'').localeCompare(a.updated||a.last_exported||''));
  $('#completed-count').textContent=isArabic()?t('{count} contracts',{count:jobs.length}):`${jobs.length} ${jobs.length===1?'contract':'contracts'}`;
  $('#completed-list').innerHTML=jobs.length?jobs.map(job=>ui`<article class="completed-card" data-contract-group="${job.group_id}"><button class="completed-icon history-opener" data-history-target="${job.group_id}" aria-label="${t('Click to open version history')}" title="${t('Click to open version history')}">▤</button><div class="completed-info"><span class="eyebrow">${escapeHTML(kindLabel(job.kind))}</span><h3><button class="history-name history-opener" data-history-target="${job.group_id}" dir="auto" title="${t('Click to open version history')}">${escapeHTML(job.title)}</button></h3><p>${isArabic()?t('{count} saved Word revisions',{count:job.word_count}):`${job.word_count} saved Word ${job.word_count===1?'revision':'revisions'}`}${job.has_changes?' · '+t('Draft changes saved'):''}</p><p class="contract-timestamp">${escapeHTML(t('Created: {date}',{date:dateTimeLabel(job.created)}))}</p><div class="tag-list">${tagPills(job.tag_ids||[])}</div><small dir="auto">${escapeHTML(job.latest_label||job.latest_word)}</small></div><div class="completed-actions"><a class="button primary" href="/api/file?job=${job.id}&name=${encodeURIComponent(job.latest_word)}&download=1">Download Word ↓</a><button class="button secondary" data-open-completed="${job.id}" data-edit-latest="${job.group_id}">Edit</button><div class="archive-card-links"><button class="inline-link" data-open-history="${job.group_id}">Versions</button><button class="inline-link" data-copy-latest="${job.group_id}">Duplicate</button><button class="inline-link" data-upload-revision="${job.id}">Save edited Word ↥</button></div></div></article>`).join(''):ui`<div class="empty-state completed-empty"><span>▤</span><h3>No matching contracts</h3><p>Try another name, tag or contract type.</p></div>`;
  const trashed=state.boot.trashed||[];$('#archive-trash').classList.toggle('hidden',!trashed.length);$('#archive-trash-count').textContent=t('Trash ({count})',{count:trashed.reduce((n,g)=>n+g.count,0)});
  $('#archive-trash-list').innerHTML=trashed.map(group=>ui`<button class="trash-group" data-open-history="${group.group_id}"><strong dir="auto">${escapeHTML(group.title)}</strong><span>${t('Trash ({count})',{count:group.count})}</span></button>`).join('');
  colorTags($('#completed-list'));
}
async function openHistory(group){
  if(state.task)throw new Error(t('Wait for the current step to finish.'));
  if(state.job&&(state.unsaved||state.saving))await saveJob();
  archiveState.history=await api('/api/history?group='+encodeURIComponent(group));
  setView('history');renderHistory();
}
function renderHistory(){
  const data=archiveState.history;if(!data)return;
  $('#history-title').textContent=data.title;
  $('#history-created').textContent=t('Created: {date}',{date:dateTimeLabel(data.created)});
  $('#history-tags').innerHTML=tagPills(data.tag_ids||[]);colorTags($('#history-tags'));
  const versions=data.versions.filter(v=>!v.deleted_at),deleted=data.versions.filter(v=>v.deleted_at);
  $('#history-duplicate').disabled=!versions.length;
  const row=(v,trash=false)=>ui`<article class="version-card ${trash?'trashed-version':''}"><div class="version-info"><div class="version-title"><h3>${t('Version {number}',{number:v.version})}</h3>${v.latest?ui`<span class="status-chip">Latest version</span>`:''}<span class="subtle">${escapeHTML(kindLabel(v.kind))}</span></div><p>${escapeHTML(t('Created: {date}',{date:dateTimeLabel(v.created)}))}${v.estimated_time?' · '+t('File creation time'):''}</p>${v.updated?ui`<p>${escapeHTML(t('Edited: {date}',{date:dateTimeLabel(v.updated)}))}</p>`:''}<small dir="auto">${escapeHTML(v.display_name||v.name)}</small>${v.origin==='duplicated'?ui`<span class="copy-label">Copied version</span>`:''}</div><div class="version-actions">${trash?ui`<button class="button secondary" data-version-action="restore" data-version-job="${v.job}" data-version-name="${escapeHTML(v.name)}">Restore</button>`:ui`<a class="button secondary" href="/api/file?job=${v.job}&name=${encodeURIComponent(v.name)}&download=1">Download Word ↓</a><button class="button secondary" data-version-action="edit" data-version-job="${v.job}" data-version-name="${escapeHTML(v.name)}">Edit</button><button class="button secondary" data-version-action="duplicate" data-version-job="${v.job}" data-version-name="${escapeHTML(v.name)}">Duplicate</button><button class="inline-link danger-link" data-version-action="delete" data-version-job="${v.job}" data-version-name="${escapeHTML(v.name)}">Delete</button>`}</div></article>`;
  $('#history-versions').innerHTML=versions.map(v=>row(v)).join('')||ui`<div class="empty-state"><h3>No active versions</h3><p>You can restore versions from Trash below.</p></div>`;
  $('#history-deleted').innerHTML=deleted.map(v=>row(v,true)).join('');$('#history-trash-count').textContent=t('Trash ({count})',{count:deleted.length});$('#history-trash').classList.toggle('hidden',!deleted.length);
  if(archiveState.undo)$('#history-feedback').innerHTML=ui`<div class="history-notice">Version moved to trash. <button class="inline-link" id="undo-version-delete">Undo</button></div>`;else $('#history-feedback').innerHTML='';
}
function latestHistoryVersion(group){return api('/api/history?group='+encodeURIComponent(group)).then(data=>{archiveState.history=data;const version=data.versions.find(v=>v.latest);if(!version)throw new Error(t('No active versions'));return version;});}
function selectVersion(job,name){return archiveState.history?.versions.find(v=>v.job===job&&v.name===name);}
function describeVersion(v){return t('Version {number} · {date}',{number:v.version,date:dateTimeLabel(v.created)});}
function duplicateDialog(version){archiveState.selection=version;$('#duplicate-mode').value='separate';$('#duplicate-description').textContent=describeVersion(version);$('#duplicate-error').textContent='';$('#duplicate-dialog').showModal();}
function recentDuplicate(version){return !!version.duplicated_at&&new Date(version.duplicated_at).toDateString()===new Date().toDateString();}
async function requestVersionEdit(version){
  archiveState.selection=version;
  if(recentDuplicate(version))return beginVersionEdit(version,'replace');
  $('#edit-version-mode').value='copy';$('#edit-version-description').textContent=describeVersion(version);$('#edit-version-error').textContent='';$('#edit-version-dialog').showModal();
}
async function beginVersionEdit(version,mode){
  if(!version.can_edit_fields){
    let target=version;
    if(mode==='copy'){const result=await api('/api/version-duplicate',{job:version.job,name:version.name,mode:'same_person'});target={...version,job:result.job.id,name:result.job.outputs[0]};}
    archiveDialog(target.job);archiveState.uploadTarget=target;$('#archive-dialog-title').textContent=t('Upload the edited Word version');$('#archive-edit-help').classList.remove('hidden');$('#archive-edit-download').classList.remove('hidden');$('#archive-edit-download').href='/api/file?job='+target.job+'&name='+encodeURIComponent(target.name)+'&download=1';
    return;
  }
  const result=await api('/api/version-edit',{job:version.job,name:version.name,mode});await openJob(result.job.id);
}
async function refreshArchive(){await refreshBootstrap();renderCompleted();if(archiveState.history){archiveState.history=await api('/api/history?group='+encodeURIComponent(archiveState.history.group_id));renderHistory();}}
function openTags(group=null){
  archiveState.tagGroup=group;const contract=state.boot.completed?.find(job=>job.group_id===group);
  archiveState.selectedTags=new Set(contract?.tag_ids||(archiveState.history?.group_id===group?archiveState.history.tag_ids:[]));
  resetTagEditor();renderTagOptions();$('#tag-error').textContent='';$('#apply-tags').classList.toggle('hidden',!group);$('#tags-dialog').showModal();
}
function resetTagEditor(){$('#tag-form').reset();$('#tag-id').value='';$('#tag-color').value='#176f78';}
function renderTagOptions(){
  $('#tag-options').innerHTML=(state.boot.tags||[]).map(tag=>ui`<div class="tag-option"><label>${archiveState.tagGroup?ui`<input type="checkbox" data-select-tag="${tag.id}" ${archiveState.selectedTags.has(tag.id)?'checked':''}>`:''}<span class="tag-pill" data-tag-color="${tag.color}" dir="auto">${escapeHTML(tag.name)}</span></label><div><button type="button" class="inline-link" data-edit-tag="${tag.id}">Edit</button><button type="button" class="inline-link danger-link" data-delete-tag="${tag.id}">Delete</button></div></div>`).join('')||ui`<p class="subtle">No tags yet. Create your first tag below.</p>`;
  colorTags($('#tag-options'));
}
async function versionDelete(version){archiveState.selection=version;$('#delete-version-description').textContent=describeVersion(version);$('#delete-version-error').textContent='';$('#delete-version-dialog').showModal();}
async function restoreVersion(version){archiveState.history=await api('/api/version-restore',{job:version.job,name:version.name});archiveState.undo=null;await refreshArchive();toast(t('Version restored.'));}
function downloadLatestWord(){const name=state.job?.outputs?.at(-1);if(!name)return;const anchor=document.createElement('a');anchor.href='/api/file?job='+encodeURIComponent(state.job.id)+'&name='+encodeURIComponent(name)+'&download=1';anchor.download=name;document.body.append(anchor);anchor.click();anchor.remove();}

$('#completed-tag').addEventListener('change',renderCompleted);$('#completed-sort').addEventListener('change',renderCompleted);
$('#manage-tags').addEventListener('click',()=>openTags());$('#history-manage-tags').addEventListener('click',()=>openTags(archiveState.history.group_id));
$('#back-completed').addEventListener('click',()=>refreshBootstrap().then(()=>setView('completed')).catch(handleError));
$('#history-duplicate').addEventListener('click',()=>{const latest=archiveState.history?.versions.find(v=>v.latest);if(latest)duplicateDialog(latest);});
document.addEventListener('click',event=>{
  const history=event.target.closest('[data-open-history]');if(history)openHistory(history.dataset.openHistory).catch(handleError);
  const historyTarget=event.target.closest('[data-history-target]');if(historyTarget)openHistory(historyTarget.dataset.historyTarget).catch(handleError);
  const latestEdit=event.target.closest('[data-edit-latest]');if(latestEdit)latestHistoryVersion(latestEdit.dataset.editLatest).then(requestVersionEdit).catch(handleError);
  const latestCopy=event.target.closest('[data-copy-latest]');if(latestCopy)latestHistoryVersion(latestCopy.dataset.copyLatest).then(duplicateDialog).catch(handleError);
  const action=event.target.closest('[data-version-action]');if(action){const version=selectVersion(action.dataset.versionJob,action.dataset.versionName);if(!version)return;const perform={edit:requestVersionEdit,duplicate:duplicateDialog,delete:versionDelete,restore:restoreVersion}[action.dataset.versionAction];Promise.resolve(perform(version)).catch(handleError);}
  if(event.target.closest('#undo-version-delete')&&archiveState.undo)restoreVersion(archiveState.undo).catch(handleError);
  const tagFilter=event.target.closest('[data-filter-tag]');if(tagFilter){$('#completed-tag').value=tagFilter.dataset.filterTag;setView('completed');}
  const editTag=event.target.closest('[data-edit-tag]');if(editTag){const tag=state.boot.tags.find(t=>t.id===editTag.dataset.editTag);$('#tag-id').value=tag.id;$('#tag-name').value=tag.name;$('#tag-color').value=tag.color;}
  const deleteTag=event.target.closest('[data-delete-tag]');if(deleteTag){archiveState.deleteTag=deleteTag.dataset.deleteTag;$('#delete-tag-name').textContent=state.boot.tags.find(t=>t.id===archiveState.deleteTag).name;$('#delete-tag-dialog').showModal();}
});
document.addEventListener('change',event=>{if(event.target.dataset.selectTag){if(event.target.checked)archiveState.selectedTags.add(event.target.dataset.selectTag);else archiveState.selectedTags.delete(event.target.dataset.selectTag);}});
$('#duplicate-form').addEventListener('submit',async event=>{event.preventDefault();const button=$('#duplicate-form button[type=submit]');button.disabled=true;try{const selected=archiveState.selection;const result=await api('/api/version-duplicate',{job:selected.job,name:selected.name,mode:$('#duplicate-mode').value});$('#duplicate-dialog').close();await refreshBootstrap();const version={...selected,job:result.job.id,name:result.job.outputs[0],duplicated_at:result.job.revisions[0].created};await beginVersionEdit(version,'replace');toast(t('Version duplicated. Review the copied details before saving.'));}catch(error){$('#duplicate-error').textContent=message(error.message);handleError(error);}finally{button.disabled=false;}});
$('#edit-version-form').addEventListener('submit',async event=>{event.preventDefault();const button=$('#edit-version-form button[type=submit]');button.disabled=true;try{await beginVersionEdit(archiveState.selection,$('#edit-version-mode').value);$('#edit-version-dialog').close();}catch(error){$('#edit-version-error').textContent=message(error.message);handleError(error);}finally{button.disabled=false;}});
$('#delete-version-form').addEventListener('submit',async event=>{event.preventDefault();const version=archiveState.selection;try{archiveState.history=await api('/api/version-delete',{job:version.job,name:version.name});archiveState.undo=version;$('#delete-version-dialog').close();await refreshArchive();}catch(error){$('#delete-version-error').textContent=message(error.message);handleError(error);}});
$('#tag-form').addEventListener('submit',async event=>{event.preventDefault();try{const isNew=!$('#tag-id').value,label=$('#tag-name').value.trim();const result=await api('/api/tag-save',{id:$('#tag-id').value||undefined,name:label,color:$('#tag-color').value});state.boot.tags=result.tags;if(isNew&&archiveState.tagGroup){const added=result.tags.find(tag=>tag.name===label);if(added)archiveState.selectedTags.add(added.id);}resetTagEditor();renderTagOptions();renderCompleted();if(archiveState.history)renderHistory();$('#tag-error').textContent='';}catch(error){$('#tag-error').textContent=message(error.message);}});
$('#reset-tag').addEventListener('click',resetTagEditor);
$('#apply-tags').addEventListener('click',async()=>{try{await api('/api/group-tags',{group:archiveState.tagGroup,tags:[...archiveState.selectedTags]});$('#tags-dialog').close();await refreshArchive();}catch(error){$('#tag-error').textContent=message(error.message);}});
$('#delete-tag-form').addEventListener('submit',async event=>{event.preventDefault();try{const result=await api('/api/tag-delete',{id:archiveState.deleteTag});state.boot.tags=result.tags;archiveState.selectedTags.delete(archiveState.deleteTag);$('#delete-tag-dialog').close();renderTagOptions();await refreshArchive();}catch(error){handleError(error);}});
