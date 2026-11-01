'use strict';
const $ = (selector, root=document) => root.querySelector(selector);
const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
const state = {boot:null,job:null,tab:'documents',view:'workspace',mode:'create',source:null,page:1,task:null,role:'offer',saving:false,template:null,templateKind:null,templateBusy:false,sheet:null,touched:new Set(),validateAll:false,archiveJob:null,archiveFile:null};
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let toastTimer,saveTimer;

async function api(path,body){
  const options={credentials:'same-origin',headers:{}};
  if(body!==undefined){options.method='POST';options.headers={'Content-Type':'application/json','X-Private-CSRF':state.boot.csrf};options.body=JSON.stringify(body);}
  const response=await fetch(path,options);
  const data=await response.json();
  if(!response.ok){const error=new Error(data.error||'This action could not finish.');error.findings=data.findings;throw error;}
  return data;
}
function toast(message,error=false){clearTimeout(toastTimer);const el=$('#toast');el.textContent=message;el.classList.remove('hidden');el.classList.toggle('error',error);toastTimer=setTimeout(()=>el.classList.add('hidden'),6500);}
function setView(view){
  state.view=view;
  for(const name of ['workspace','job','completed','templates','setup'])$(`#${name}-view`).classList.toggle('hidden',name!==view);
  $$('.nav').forEach(n=>n.classList.toggle('active',n.dataset.nav===(view==='job'?'workspace':view)));
  $('#breadcrumb').textContent=({workspace:'My workspace',job:'My workspace / Contract details',completed:'Completed contracts',templates:'Templates & rules',setup:'About & storage'})[view];
  if(view==='workspace')renderJobs();
  if(view==='completed')renderCompleted();
  if(view==='templates')renderTemplates();
  if(view==='setup')renderSetup();
  window.scrollTo({top:0,behavior:'instant'});
}
function dateLabel(value){try{return new Date(value).toLocaleDateString('en-GB',{day:'numeric',month:'short'});}catch{return '';}}
function renderJobs(){
  const jobs=state.boot.jobs.filter(job=>!job.word_count||job.has_changes);
  $('#work-count').textContent=jobs.length?`${jobs.length} saved ${jobs.length===1?'workspace':'workspaces'}`:'Saved on this computer';
  if(!jobs.length){$('#job-list').innerHTML='<div class="empty-state"><span>▤</span><h3>No unfinished drafts</h3><p>Start a new contract, or open Completed contracts to edit saved work.</p></div>';return;}
  $('#job-list').innerHTML=jobs.map(job=>`<button class="job-row" data-job="${job.id}"><span class="row-icon">▤</span><span class="row-title"><strong dir="auto">${escapeHTML(job.title)}</strong><small>Saved locally</small></span><span class="status-chip">Continue work</span><span class="row-date">${dateLabel(job.updated)}</span><span>↗</span></button>`).join('');
}
async function refreshBootstrap(){const csrf=state.boot?.csrf;state.boot=await api('/api/bootstrap');if(csrf&&csrf!==state.boot.csrf)toast('The local app restarted. Your saved work is safe.');}
function newDialog(mode){state.mode=mode;$('#new-mode-label').textContent=mode==='spreadsheet'?'START FROM A SPREADSHEET':'NEW CONTRACT';$('#new-dialog').showModal();}
async function openJob(id){
  if(state.task)throw new Error('Wait for the current step to finish.');
  clearTimeout(saveTimer);await refreshBootstrap();state.touched=new Set();state.validateAll=false;state.job=await api('/api/job?id='+encodeURIComponent(id));state.source=state.job.sources[0]||null;state.page=1;
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
  return [...new Set([...required,...(state.boot.templates[kind]?.required_fields||[])])];
}
function updateCounts(){
  if(!state.job)return;
  const required=requiredFields();const confirmed=required.filter(k=>state.job.fields[k].confirmed&&state.job.fields[k].value).length;
  $('#source-count').textContent=state.job.sources.length;$('#confirmed-count').textContent=`${confirmed}/${required.length}`;
  $('#finding-count').textContent=state.job.findings.filter(f=>f.level!=='pass').length;$('#output-count').textContent=state.job.outputs.length;
}
function renderJob(){
  const kind=fieldValue('contract_type');$('#job-kind').textContent=`${kind.toUpperCase()} CONTRACT`;
  $('#job-title').textContent=state.job.title;
  $('#main-action').innerHTML='Create Word <span>↗</span>';
  $('#main-action').classList.toggle('hidden',!!state.job.archive_only);$('#save-job').classList.toggle('hidden',!!state.job.archive_only);
  $$('.tab').forEach(tab=>tab.classList.toggle('hidden',!!state.job.archive_only&&tab.dataset.tab!=='outputs'));
  $('#saved-status').textContent=state.job.archive_only?'Word file saved as uploaded.':state.job.last_word_origin==='uploaded_word'?'Latest Word file was uploaded. These form details have not been updated from that file.':'Changes are saved locally.';
  renderSources();renderFields();renderFindings();renderOutputs();renderCalculations();updateCounts();
}
function renderSources(){
  const cards=[['offer','▤','Job offer','Open the offer and enter its dates, role and salary.'],['identity','◫','ID or passport','Inspect the full name, number and issuing details.'],['list','▦','Employee spreadsheet','Choose a row and map the columns you want to import.']];
  $('#source-cards').innerHTML=cards.map(([role,icon,title,description])=>{
    const sources=state.job.source_details.filter(s=>s.role===role);
    return `<article class="source-card ${sources.length?'has-file':''}" data-drop-role="${role}"><span class="source-symbol">${icon}</span><h3>${title}</h3><p>${description}</p>${sources.map(s=>`<button class="source-file" data-preview="${s.id}">${escapeHTML(s.name)}<small>${s.pages.length} ${s.pages.length===1?'page':'pages'} · local copy</small></button>${/\.(ods|xlsx|csv)$/i.test(s.name)?`<button class="inline-link sheet-source-link" data-sheet-source="${s.id}">Import employee row ↗</button>`:''}`).join('')}<button class="button secondary" data-add-role="${role}">${sources.length?'Add another file':'Choose file'} ＋</button></article>`;
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
  if(state.boot.templates[kind]?.required_fields?.includes(key))return true;
  if(key==='original_contract_date'&&kind!=='extension')return false;
  if(kind==='extension'&&!requiredFields().includes(key)&&!['issuer_ar','issuer_en','identity_expiry_date'].includes(key))return false;
  if(kind==='employment'&&['manager_name_ar','manager_name_en','manager_base_ar','manager_base_en','project_ar','project_en'].includes(key))return false;
  if(kind==='service'&&key.startsWith('grade_'))return false;
  return true;
}
function renderFields(){
  const specs=Object.fromEntries(state.boot.fields.map(s=>[s[0],s]));const required=requiredFields();
  $('#fields-form').innerHTML=fieldGroups.map(([label,keys])=>`<section class="field-group"><h3>${label}</h3>${keys.filter(visibleField).map(key=>{
    const [_,english,arabic,type]=specs[key];const field=state.job.fields[key];
    let input;
    if(type==='select'){
      const options=key==='contract_type'?[['employment','Employment contract · عقد عمل'],['service','Service contract · عقد خدمة'],['extension','Extension letter · خطاب تمديد']]:key==='gender'?[['','Not supplied'],['male','Male · ذكر'],['female','Female · أنثى']]:[['','Choose document type'],...(state.boot.identity_types||[]).map(d=>[d.id,d.en+' · '+d.ar]),['__add__','＋ Add my own document type…']];
      input=`<select class="field-input" id="field-${key}" data-field="${key}">${options.map(([v,l])=>`<option value="${v}" ${field.value===v?'selected':''}>${escapeHTML(l)}</option>`).join('')}</select>`;
    }else input=`<input class="field-input" id="field-${key}" data-field="${key}" type="${type==='date'?'date':'text'}" dir="${key.endsWith('_ar')?'rtl':'ltr'}" value="${escapeHTML(field.value)}" autocomplete="off" ${key==='salary_usd'?'inputmode="decimal"':''}>`;
    const evidence=(field.evidence||[]).map((e,i)=>`<button class="evidence-link" data-evidence="${key}" data-index="${i}">↗ ${escapeHTML(e.source_name)} · p${e.page}${e.text_match===false?' · inspect image':''}</button>`).join('');
    const alternatives='';
    return `<div class="field-row ${field.confirmed?'confirmed':''}" data-row="${key}"><div class="field-label"><label for="field-${key}"><span>${english}${required.includes(key)?'<b class="required-star">*</b>':''}</span><br><small lang="ar" dir="rtl">${arabic}</small></label><label class="confirm-label"><input type="checkbox" data-confirm="${key}" ${field.confirmed?'checked':''} ${!field.value?'disabled':''}>Checked</label></div>${input}<p class="field-error hidden" id="error-${key}" role="alert"></p><div class="field-evidence">${evidence}${alternatives}<span class="field-origin">${escapeHTML(field.note||field.origin||'Enter or read from a source')}</span></div></div>`;
  }).join('')}</section>`).join('');
  paintFieldErrors();
}
function savePayload(){return {job:state.job.id,fields:state.job.fields};}
async function saveJob(silent=true){
  if(!state.job||state.task)return;clearTimeout(saveTimer);
  const saved=await api('/api/save',savePayload());state.job.title=saved.title;$('#job-title').textContent=saved.title;$('#saved-status').textContent='Saved on this computer';state.job.calculations=saved.calculations;state.job.validation=saved.validation;paintFieldErrors();renderCalculations();
  if(!silent)toast('Your work is saved locally.');
}
function queueSave(){if(state.task)return;clearTimeout(saveTimer);$('#saved-status').textContent='Saving locally…';saveTimer=setTimeout(()=>saveJob().catch(handleError),800);}
async function importFile(file,role){
  if(state.task)throw new Error('Wait for the current task to finish first.');
  if(file.size>25*1024*1024)throw new Error('Choose a file up to 25 MB.');
  await saveJob();
  const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=reject;reader.readAsDataURL(file);});
  const result=await api('/api/import',{job:state.job.id,role,name:file.name,data});
  const completed=await watchTask(result.task);
  toast('Document added to this local workspace.');
  if(role==='list'&&/\.(ods|xlsx|csv)$/i.test(file.name)&&completed?.source)await openSheet(completed.source);
}
async function watchTask(taskId){
  state.task=taskId;clearTimeout(saveTimer);$('#task-banner').classList.remove('hidden');$('#main-action').disabled=true;$$('#fields-form input,#fields-form select,#confirm-visible,#save-job').forEach(b=>b.disabled=true);
  try{
    while(true){
      const task=await api('/api/task?id='+taskId);$('#task-title').textContent=task.label;$('#task-message').textContent=task.message;
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
  if(!state.job)return;
  const sources=state.job.source_details;
  if(!state.source&&sources.length)state.source=sources[0].id;
  $('#viewer-source').innerHTML=sources.map(s=>`<option value="${s.id}" ${s.id===state.source?'selected':''}>${escapeHTML(s.name)}</option>`).join('');
  const source=selectedSource();const target=$('#viewer-content');
  $('#open-source').classList.toggle('hidden',!source);if(source)$('#open-source').href='/api/source-file?job='+state.job.id+'&source='+source.id;
  if(!source){$('#prev-page').disabled=true;$('#next-page').disabled=true;$('#page-number').textContent='No reference file';target.innerHTML='<div class="viewer-empty">Reference files are optional.<br>Add one in Documents to inspect it here.</div>';return;}
  state.page=Math.min(Math.max(state.page,1),source.pages.length);const page=source.pages[state.page-1];
  $('#page-number').textContent=`Page ${state.page} of ${source.pages.length}`;
  $('#prev-page').disabled=state.page<=1;$('#next-page').disabled=state.page>=source.pages.length;
  $('#evidence-quote').classList.toggle('hidden',!quote);$('#evidence-quote').textContent=quote?'Quoted evidence: '+quote:'';
  if(page.image)target.innerHTML=`<img src="/api/page?source=${source.id}&page=${state.page}" alt="Source document page ${state.page}" loading="eager">`;
  else target.innerHTML=`<pre dir="auto">${escapeHTML(page.text)}</pre>`;
}
function renderFindings(){
  const findings=state.job.findings;const counts={error:0,warning:0,pass:0};findings.forEach(f=>counts[f.level]=(counts[f.level]||0)+1);
  $('#findings-summary').innerHTML=findings.length?Object.entries(counts).map(([level,n])=>`<div class="summary-item"><strong>${n}</strong><span>${{error:'Needs correction',warning:'Needs your review',pass:'Matching checks'}[level]}</span></div>`).join(''):'';
  const labels=Object.fromEntries(state.boot.fields.map(s=>[s[0],s[1]]));
  $('#findings-list').innerHTML=findings.length?[...findings].sort((a,b)=>['error','warning','pass'].indexOf(a.level)-['error','warning','pass'].indexOf(b.level)).map(f=>`<article class="finding ${f.level}"><span class="finding-icon">${{error:'!',warning:'!',pass:'✓'}[f.level]}</span><div><h3>${escapeHTML(labels[f.field]||f.field||'Document')}</h3><p>${escapeHTML(f.message)}</p>${f.expected?`<p dir="auto">Expected: ${escapeHTML(f.expected)}</p>`:''}</div><small>${f.page?'Page '+f.page:'Check field'}</small></article>`).join(''):`<div class="empty-state"><span>✓</span><h3>${state.job.checked_at?'No field issues found':'No checks run yet'}</h3><p>${state.job.checked_at?'Check and confirm the details, then create the Word file and check its pages.':'Complete the employee details, then run the field checks.'}</p></div>`;
}
function renderOutputs(){
  const outputs=state.job.outputs.filter(name=>name.toLowerCase().endsWith('.docx'));
  $('#visual-review-note').classList.toggle('hidden',!outputs.length);
  $('#outputs-list').innerHTML=outputs.length?[...outputs].reverse().map((name,index)=>{const url='/api/file?job='+state.job.id+'&name='+encodeURIComponent(name)+'&download=1';return `<article class="output-card"><span class="file-type">WORD</span><div class="output-info"><strong dir="auto">${escapeHTML(name)}</strong><p>${index===0?'Latest Word revision':'Previous Word revision · kept locally'}</p></div><a class="button primary" href="${url}">Download Word ↓</a></article>`;}).join(''):'<div class="empty-state"><span>▤</span><h3>Your Word contract will appear here</h3><p>Check the details, then choose Create Word.</p></div>';
}

async function checkFields(){
  const result=await api('/api/check',savePayload());state.job.findings=result.findings;state.job.validation=result.findings;state.validateAll=true;paintFieldErrors();state.job.checked_at=result.checked_at;state.job.calculations=result.calculations;renderCalculations();renderFindings();updateCounts();setTab('findings');return result.findings;
}
async function mainAction(acknowledge=false){
  clearTimeout(saveTimer);
  const issues=await api('/api/check',savePayload());const errors=issues.findings.filter(f=>f.level==='error');
  if(errors.length){state.job.findings=issues.findings;state.job.validation=issues.findings;state.validateAll=true;renderFields();renderFindings();updateCounts();setTab('details');focusFirstError();throw new Error('Complete the missing or invalid fields first.');}
  const unconfirmed=Object.keys(state.job.fields).filter(k=>visibleField(k)&&state.job.fields[k].value&&!state.job.fields[k].confirmed);
  if(unconfirmed.length){setTab('details');throw new Error(`Check and confirm the ${unconfirmed.length} remaining filled fields first.`);}
  const warnings=issues.findings.filter(f=>f.level==='warning');
  if(warnings.length&&!acknowledge){$('#warning-content').innerHTML=warnings.map(f=>`<article class="finding warning"><span class="finding-icon">!</span><p>${escapeHTML(f.message)}</p></article>`).join('');$('#acknowledge-warnings').checked=false;$('#create-confirmed').disabled=true;$('#warning-dialog').showModal();return;}
  const result=await api('/api/generate',{...savePayload(),template_sha:state.boot.templates[fieldValue('contract_type')]?.sha256,acknowledge_warnings:acknowledge});await watchTask(result.task);setTab('outputs');toast('Your Word contract is ready. It is also saved in Completed contracts.');await refreshBootstrap();
}
const templateNames={employment:'Employment contract',service:'Service contract',extension:'Extension letter'};
function templateURL(template,format='docx'){return '/api/template-file?'+new URLSearchParams({kind:template.kind,...(template.draft?{draft:template.draft}:{}),...(template.sha256?{sha:template.sha256}:{}),format});}
function renderTemplates(){
  $('#templates-list').innerHTML=Object.entries(templateNames).map(([kind,label])=>{const template=state.boot.templates[kind];return `<article class="template-card" data-template-card="${kind}"><span class="source-symbol">▤</span><h3>${label}</h3><p lang="ar" dir="rtl">${{employment:'عقد عمل',service:'عقد خدمة',extension:'خطاب تمديد'}[kind]}</p><span class="status-chip">${template?.placeholders?.length?`${template.placeholders.length} fields · Active locally`:'Choose your Word template'}</span>${template?.source_name?`<p class="template-filename">${escapeHTML(template.source_name)}</p>`:''}<div class="template-actions">${template?`<a class="button secondary" href="${templateURL({kind})}">Download to edit ↓</a>`:''}<button class="button primary" data-replace-template="${kind}">${template?'Replace template':'Choose template'} ＋</button>${template?`<button class="inline-link" data-template="${kind}">Fields, preview &amp; previous versions ↗</button>`:''}</div></article>`;}).join('');
  $('#override-list').innerHTML=(state.boot.rules.job_title_overrides||[]).map(r=>`<div class="override-row"><strong dir="rtl">${escapeHTML(r.name_ar)}</strong><span>${escapeHTML(r.job_title_en)}</span></div>`).join('')||'<p>No individual overrides saved.</p>';
}
async function templateEditor(kind,draft=null){
  const result=await api('/api/template-editor?'+new URLSearchParams({kind,...(draft?{draft}:{})}));showTemplateEditor(result);$('#template-editor').scrollIntoView({behavior:'smooth',block:'start'});
}
function tokenLabel(token){return state.boot.fields.find(f=>f[0]===token)?.[1]||({execution_ar:'Contract date · Arabic',execution_en:'Contract date · English',start_ar:'Start date · Arabic',start_en:'Start date · English',end_ar:'End date · Arabic',end_en:'End date · English',identity_details_ar:'ID / passport details · Arabic',identity_details_en:'ID / passport details · English',salary_words_ar:'Salary in words · Arabic',salary_words_en:'Salary in words · English',weekday_ar:'Contract weekday · Arabic',weekday_en:'Contract weekday · English',original_ar:'Original contract date · Arabic',original_en:'Original contract date · English'}[token])||token.replaceAll('_',' ');}
function showTemplateEditor(result){
  state.template=result;const editor=$('#template-editor');editor.classList.remove('hidden');
  const isDraft=!!result.draft;
  editor.innerHTML=`<div class="panel-heading"><div><span class="eyebrow">${isDraft?'NEW VERSION · DRAFT':'CURRENT TEMPLATE'}</span><h2>${templateNames[result.kind]}</h2><p class="template-filename">${escapeHTML(result.name)}</p></div><button class="button secondary" id="close-template">Close</button></div><p class="template-help">${isDraft?'Your active template stays in use until you activate this draft.':'Download this Word file to change wording or layout. Keep tags such as {{name_ar}} and {{name_en}}, or use the mapper below to mark changing text.'}</p><div class="heading-buttons template-toolbar"><a class="button secondary" href="${templateURL(result)}">Download ${isDraft?'draft':'to edit'} ↓</a><button class="button secondary" id="preview-template">Preview pages</button><button class="button secondary" data-replace-template="${result.kind}">Choose another Word file ＋</button></div><div id="template-preview" class="hidden"></div><div class="template-checks">${result.errors.map(message=>`<p class="template-check error">! ${escapeHTML(message)}</p>`).join('')}${result.warnings.map(message=>`<p class="template-check">${escapeHTML(message)}</p>`).join('')}<p><strong>${result.placeholders.length} field types found</strong></p><div class="token-list">${result.placeholders.map(t=>`<span>{{${escapeHTML(t)}}}</span>`).join('')}</div></div>${isDraft?`<div class="template-activation"><label class="acknowledge"><input id="template-reviewed" type="checkbox">I checked the wording, Arabic and English layout, and all changing fields, including repeated names, dates and signature details.</label><button class="button primary" id="activate-template" disabled>Use this template →</button><p>Previous versions are kept locally. Existing contract files remain saved.</p></div>`:''}<details class="template-mapper" ${result.errors.length?'open':''}><summary>Map the text that should change for each employee</summary><p class="template-help">Select text in a paragraph below, then choose the field it represents. Map each repeated occurrence separately. Fixed wording and formatting are retained.</p><form class="mapping-form" id="mapping-form"><label>Paragraph<input id="map-paragraph" type="number" min="0" required></label><label>Exact text to replace<input id="map-before" dir="auto" required></label><label>Fill with field<select id="map-key">${result.tokens.map(t=>`<option value="${t}">${escapeHTML(tokenLabel(t))} · {{${t}}}</option>`).join('')}</select></label><button class="button primary" type="submit">Save to draft</button></form><div class="template-paragraphs">${result.paragraphs.map(p=>`<div class="template-paragraph" data-paragraph="${p.index}" dir="auto"><small class="subtle">Paragraph ${p.index}</small><br><span>${escapeHTML(p.text)}</span></div>`).join('')}</div></details><details class="template-history"><summary>Previous versions (${result.history.length})</summary><p class="template-help">Restore opens a draft for you to check before using it.</p>${result.history.map(old=>`<div class="template-version"><div><strong>${escapeHTML(old.source_name||'Previous template')}</strong><p>${old.saved_at?escapeHTML(new Date(old.saved_at).toLocaleString()):'Saved locally'}</p></div><button class="button secondary" data-restore-template="${old.version}">Restore as draft ↗</button></div>`).join('')||'<p class="template-help">Your first previous version will appear after replacing this template.</p>'}</details>`;
  $('#close-template').addEventListener('click',()=>{editor.classList.add('hidden');state.template=null;});
  $('#template-reviewed')?.addEventListener('change',e=>$('#activate-template').disabled=!e.target.checked||!!result.errors.length);
  $('#activate-template')?.addEventListener('click',()=>templateOperation(async()=>{await api('/api/template-activate',{kind:result.kind,draft:result.draft,expected_sha:result.sha256,reviewed:$('#template-reviewed').checked});await refreshBootstrap();renderTemplates();await templateEditor(result.kind);toast('The new template is active. Its previous version is saved locally.');}));
  $('#preview-template').addEventListener('click',()=>templateOperation(async()=>{const task=await api('/api/template-preview',{kind:result.kind,draft:result.draft,expected_sha:result.sha256});const output=await watchTask(task.task);if(!output?.pages||state.template?.sha256!==result.sha256||state.view!=='templates')return;const preview=$('#template-preview');preview.classList.remove('hidden');preview.innerHTML=`<div class="template-preview-controls"><button class="button secondary" id="template-prev-page" aria-label="Previous template page">←</button><span id="template-page-number"></span><button class="button secondary" id="template-next-page" aria-label="Next template page">→</button></div><div class="template-preview-page"><img id="template-page-image" alt="Local template page preview"></div>`;let current=1;const render=()=>{$('#template-page-number').textContent=`Page ${current} of ${output.pages}`;$('#template-prev-page').disabled=current===1;$('#template-next-page').disabled=current===output.pages;$('#template-page-image').src='/api/template-page?'+new URLSearchParams({kind:result.kind,...(result.draft?{draft:result.draft}:{}),sha:output.sha256,page:current});};$('#template-prev-page').addEventListener('click',()=>{current--;render();});$('#template-next-page').addEventListener('click',()=>{current++;render();});render();}));
  $('#mapping-form').addEventListener('submit',event=>{event.preventDefault();templateOperation(async()=>{const updated=await api('/api/template-save',{kind:result.kind,draft:result.draft,expected_sha:result.sha256,mappings:[{paragraph:$('#map-paragraph').value,before:$('#map-before').value,key:$('#map-key').value}]});showTemplateEditor(updated);$('.template-mapper').open=true;toast('Field mapping saved to a draft. Check it before activating.');});});
  $$('.template-paragraph').forEach(el=>el.addEventListener('mouseup',()=>{const selection=window.getSelection();const selected=selection.toString();if(selected&&el.contains(selection.anchorNode)&&el.contains(selection.focusNode)){$('#map-paragraph').value=el.dataset.paragraph;$('#map-before').value=selected;}}));
  $$('[data-restore-template]').forEach(button=>button.addEventListener('click',()=>templateOperation(async()=>{const updated=await api('/api/template-restore',{kind:result.kind,version:button.dataset.restoreTemplate,expected_sha:state.boot.templates[result.kind]?.sha256||''});showTemplateEditor(updated);toast('Previous version opened as a draft. Check it, then activate it.');})));
}
async function templateOperation(operation){
  if(state.templateBusy){toast('Wait for the current template operation to finish.');return;}state.templateBusy=true;
  const buttons=$$('#templates-view button,#templates-view input,#templates-view select');const disabled=buttons.map(b=>b.disabled);buttons.forEach(b=>b.disabled=true);
  try{await operation();}catch(error){handleError(error);}finally{state.templateBusy=false;buttons.forEach((b,i)=>{if(b.isConnected)b.disabled=disabled[i];});}
}
async function importTemplate(file,kind){
  if(!file.name.toLowerCase().endsWith('.docx'))throw new Error('Choose a .docx Word template.');
  if(file.size>25*1024*1024)throw new Error('Choose a Word template up to 25 MB.');
  await templateOperation(async()=>{const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=reject;reader.readAsDataURL(file);});const result=await api('/api/template-import',{kind,name:file.name,data,expected_sha:state.boot.templates[kind]?.sha256||''});showTemplateEditor(result);$('#template-editor').scrollIntoView({behavior:'smooth',block:'start'});toast('Template added as a local draft. Check the fields and pages before using it.');});
}
function renderSetup(){
  $('#setup-cards').innerHTML=`<article class="setup-card"><span class="status-chip">Ready</span><h3>Word contracts</h3><p>Generation fills your approved Word templates. Each export is saved as a separate revision in Completed contracts.</p></article><article class="setup-card"><span class="status-chip">Local storage</span><h3>Your saved work</h3><p>Keep a private backup of this app’s data folder. Word files, editable details, source records and template history are stored there.</p></article><article class="setup-card"><span class="status-chip">Works offline</span><h3>On this computer</h3><p>No AI model or online account is needed. Spreadsheet imports and template controls are available in the small More menu.</p></article>`;
}

function renderCalculations(){
  if(!state.job)return;const values=state.job.calculations||{};const lines=[];
  if(values.weekday_en)lines.push(`<div><span>Contract weekday</span><strong>${escapeHTML(values.weekday_en)} <b lang="ar" dir="rtl">${escapeHTML(values.weekday_ar)}</b></strong></div>`);
  if(values.calendar_days)lines.push(`<div><span>Contract period</span><strong>${values.calendar_days} calendar days</strong><small>Includes the start and end dates.</small></div>`);
  if(values.salary_words_en)lines.push(`<div><span>Salary in words</span><p>${escapeHTML(values.salary_words_en)}</p><p lang="ar" dir="rtl">${escapeHTML(values.salary_words_ar)}</p></div>`);
  $('#calculated-values').innerHTML=`<h3>Calculated for you</h3>${lines.join('')||'<p>Enter dates and salary to see the weekday, contract period and salary wording.</p>'}`;
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
    const text=visible?(messages[key]||[]).join(' '):'';
    row.classList.toggle('invalid',!!text);target.classList.toggle('hidden',!text);target.textContent=text;
    if(text){input.setAttribute('aria-invalid','true');input.setAttribute('aria-describedby',target.id);shown++;}
    else{input.removeAttribute('aria-invalid');input.removeAttribute('aria-describedby');}
  });
  $('#form-error-summary').classList.toggle('hidden',!shown);
  $('#form-error-summary').innerHTML=shown?`<strong>${shown} ${shown===1?'field needs':'fields need'} correction.</strong> Check the fields marked in red. <button class="inline-link" id="first-field-error">Go to first error ↓</button>`:'';
  $('#first-field-error')?.addEventListener('click',focusFirstError);
}
function focusFirstError(){
  const input=$('.field-row.invalid .field-input');if(input){input.scrollIntoView({behavior:'smooth',block:'center'});input.focus({preventScroll:true});}
}
function renderCompleted(){
  const query=($('#completed-search').value||'').trim().toLocaleLowerCase();const kind=$('#completed-kind').value;
  const jobs=(state.boot.completed||[]).filter(job=>(!kind||job.kind===kind)&&(!query||(job.title+' '+(job.latest_word||'')).toLocaleLowerCase().includes(query)));
  $('#completed-count').textContent=`${jobs.length} ${jobs.length===1?'contract':'contracts'}`;
  $('#completed-list').innerHTML=jobs.length?jobs.map(job=>`<article class="completed-card"><div class="completed-icon">▤</div><div class="completed-info"><span class="eyebrow">${escapeHTML(templateNames[job.kind]||job.kind)}</span><h3 dir="auto">${escapeHTML(job.title)}</h3><p>${job.word_count} saved Word ${job.word_count===1?'revision':'revisions'}${job.has_changes?' · Draft changes saved; export to update Word':''}${job.last_exported?' · '+escapeHTML(dateLabel(job.last_exported)):''}</p><small dir="auto">${escapeHTML(job.latest_word)}</small></div><div class="completed-actions"><a class="button primary" href="/api/file?job=${job.id}&name=${encodeURIComponent(job.latest_word)}&download=1">Download Word ↓</a><button class="button secondary" data-open-completed="${job.id}">${job.archive_only?'View saved files':'Edit saved details'}</button><button class="inline-link" data-upload-revision="${job.id}">Save edited Word ↥</button></div></article>`).join(''):'<div class="empty-state completed-empty"><span>▤</span><h3>No completed contracts here yet</h3><p>Create a Word contract, or add an existing Word file above.</p></div>';
}
function archiveDialog(jobId=null){
  state.archiveJob=jobId;state.archiveFile=null;$('#archive-form').reset();$('#archive-error').textContent='';$('#archive-file-name').textContent='No file selected';$('#save-archive-word').disabled=true;
  $('#archive-metadata').classList.toggle('hidden',!!jobId);
  $('#archive-dialog-title').textContent=jobId?'Save a Word revision':'Add an existing Word contract';$('#archive-dialog').showModal();
}
function encodedFile(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=reject;reader.readAsDataURL(file);});}
async function openSheet(sourceId,index=0,header=null){
  if(state.task)throw new Error('Wait for the current step to finish.');
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
  $('#sheet-content').innerHTML=`<form id="sheet-import-form"><div class="sheet-controls"><label>Worksheet<select id="sheet-name">${data.sheets.map((name,index)=>`<option value="${index}" ${index===sheet.index?'selected':''}>${escapeHTML(name)}</option>`).join('')}</select></label><label>Header row<select id="sheet-header">${data.rows.map(row=>`<option value="${row.number}" ${row.number===data.header?'selected':''}>Row ${row.number} · ${escapeHTML(rowSummary(row).slice(0,65))}</option>`).join('')}</select></label></div><label class="sheet-search-label">Find an employee in this sheet<input id="sheet-search" placeholder="Search the row text" autocomplete="off"></label><label>Employee row<select id="sheet-row"></select></label><div class="sheet-table-wrap"><table class="sheet-table"><thead><tr><th>Column</th><th>Heading</th><th>Selected row value</th><th>Use as contract field</th></tr></thead><tbody id="sheet-mappings"></tbody></table></div><label class="acknowledge"><input id="sheet-replace" type="checkbox">Replace fields that already have values. Leave unchecked to keep them.</label><p class="sheet-import-note">Dates must be clear. Ambiguous dates and spreadsheet errors are left for manual entry. Formulas use their saved results and are not recalculated.</p><p id="sheet-message" class="error-text" role="alert"></p><div class="dialog-actions"><button type="button" class="button secondary" id="cancel-sheet">Cancel</button><button class="button primary" type="submit" id="import-sheet-row">Import selected row →</button></div></form>`;
  renderSheetRows();renderSheetMappings();
  $('#sheet-search').addEventListener('input',()=>{renderSheetRows();renderSheetMappings();});
  $('#sheet-row').addEventListener('change',event=>{sheet.row=+event.target.value;renderSheetMappings();});
  $('#sheet-name').addEventListener('change',event=>{const index=+event.target.value;state.sheet=null;openSheet(sheet.source,index).catch(handleError);});
  $('#sheet-header').addEventListener('change',event=>openSheet(sheet.source,sheet.index,+event.target.value).catch(handleError));
  $('#cancel-sheet').addEventListener('click',()=>$('#sheet-dialog').close());
  $('#sheet-import-form').addEventListener('submit',async event=>{
    event.preventDefault();const button=$('#import-sheet-row');button.disabled=true;$('#sheet-message').textContent='';
    try{
      if(!sheet.row||sheet.row===data.header)throw new Error('Choose the employee row below the headings.');
      const result=await api('/api/sheet-import',{job:state.job.id,source:sheet.source,sheet:sheet.index,row:sheet.row,mappings:sheet.mappings,replace_filled:$('#sheet-replace').checked});
      state.job=result.job;state.source=sheet.source;state.page=sheet.index+1;renderJob();$('#sheet-dialog').close();setTab('details');
      toast(`${result.imported.length} fields imported. ${result.skipped.length?result.skipped.length+' existing fields kept. ':''}Check the imported details against the row.`);
    }catch(error){handleError(error);}finally{if(button.isConnected)button.disabled=false;}
  });
}
function renderSheetRows(){
  const sheet=state.sheet;const query=($('#sheet-search').value||'').trim().toLocaleLowerCase();
  const rows=sheet.data.rows.filter(row=>row.number!==sheet.data.header&&(!query||(String(row.number)+' '+Object.values(row.cells).map(cell=>cell.value).join(' ')).toLocaleLowerCase().includes(query)));
  if(!rows.some(row=>row.number===sheet.row))sheet.row=rows[0]?.number||null;
  $('#sheet-row').innerHTML=rows.map(row=>`<option value="${row.number}" ${row.number===sheet.row?'selected':''}>Row ${row.number} · ${escapeHTML(rowSummary(row))}</option>`).join('');
  $('#import-sheet-row').disabled=!rows.length;
}
function renderSheetMappings(){
  const sheet=state.sheet;const header=sheet.data.rows.find(r=>r.number===sheet.data.header);const row=sheet.data.rows.find(r=>r.number===sheet.row);
  $('#sheet-mappings').innerHTML=sheet.data.columns.map(column=>{const item=row?.cells[column];return `<tr><td>${column}</td><td dir="auto">${escapeHTML(header?.cells[column]?.value||'—')}</td><td dir="auto" class="sheet-cell-value">${escapeHTML(item?.value||'—')}${item?.formula?'<small>Saved formula result</small>':''}</td><td><select class="sheet-map" data-column="${column}" aria-label="Contract field for column ${column}"><option value="">Do not import</option>${state.boot.fields.map(([key,en,ar])=>`<option value="${key}" ${sheet.mappings[column]===key?'selected':''}>${escapeHTML(en)} · ${escapeHTML(ar)}</option>`).join('')}</select></td></tr>`;}).join('');
  $$('.sheet-map').forEach(select=>select.addEventListener('change',()=>sheet.mappings[select.dataset.column]=select.value));
}
function handleError(error){if(error.findings&&state.job){state.job.findings=error.findings;state.job.validation=error.findings;state.validateAll=true;paintFieldErrors();renderFindings();updateCounts();}if($('#identity-dialog').open)$('#identity-type-error').textContent=error.message;if($('#archive-dialog').open)$('#archive-error').textContent=error.message;if($('#sheet-dialog').open&&$('#sheet-message'))$('#sheet-message').textContent=error.message;toast(error.message||'The action could not finish.',true);}

document.addEventListener('click',async event=>{
  const nav=event.target.closest('[data-nav]');if(nav){if(state.task){toast('Wait for the current step to finish.');return;}if(state.job)await saveJob().catch(handleError);await refreshBootstrap().catch(handleError);setView(nav.dataset.nav);}
  if(nav)closeToolMenus();
  const start=event.target.closest('[data-new]');if(start){if(state.task){toast('Wait for the current step to finish.');return;}newDialog(start.dataset.new);}
  const tab=event.target.closest('[data-tab]');if(tab&&state.job)setTab(tab.dataset.tab);
  const job=event.target.closest('[data-job]');if(job)openJob(job.dataset.job).catch(handleError);
  const completed=event.target.closest('[data-open-completed]');if(completed)openJob(completed.dataset.openCompleted).catch(handleError);
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
$('#archive-picker').addEventListener('change',event=>{const file=event.target.files[0];event.target.value='';if(!file)return;if(!file.name.toLowerCase().endsWith('.docx')||file.size>25*1024*1024){$('#archive-error').textContent='Choose a Word .docx file up to 25 MB.';return;}state.archiveFile=file;$('#archive-file-name').textContent=file.name;$('#archive-error').textContent='';if(!$('#archive-title').value)$('#archive-title').value=file.name.replace(/\.docx$/i,'');$('#save-archive-word').disabled=false;});
$('#archive-form').addEventListener('submit',async event=>{event.preventDefault();if(!state.archiveFile)return;const button=$('#save-archive-word');button.disabled=true;try{const result=await api('/api/archive-word',{job:state.archiveJob,name:state.archiveFile.name,data:await encodedFile(state.archiveFile),title:$('#archive-title').value,kind:$('#archive-kind').value});if(state.job?.id===result.job.id)state.job=result.job;await refreshBootstrap();renderCompleted();$('#archive-dialog').close();toast('Word revision saved in Completed contracts.');}catch(error){handleError(error);}finally{button.disabled=false;}});
$('#identity-form').addEventListener('submit',async event=>{event.preventDefault();const button=$('#identity-form button[type=submit]');button.disabled=true;try{const result=await api('/api/identity-type',{ar:$('#identity-label-ar').value,en:$('#identity-label-en').value,verb_ar:$('#identity-verb').value,article_en:$('#identity-article').value});state.boot.identity_types=result.identity_types;state.job.fields.identity_type={value:result.identity_type.id,confirmed:false,evidence:[],origin:'chosen by you'};state.touched.add('identity_type');state.job.findings=[];delete state.job.checked_at;renderFields();updateCounts();queueSave();$('#identity-dialog').close();toast('Document type saved. It is available for future contracts.');}catch(error){handleError(error);}finally{button.disabled=false;}});
$('#template-picker').addEventListener('change',event=>{const file=event.target.files[0];event.target.value='';if(file)importTemplate(file,state.templateKind).catch(handleError);});
$('#save-job').addEventListener('click',()=>saveJob(false).catch(handleError));
$('#back-workspace').addEventListener('click',async()=>{if(state.task){toast('Wait for the current step to finish.');return;}await saveJob().catch(handleError);await refreshBootstrap();setView('workspace');});
$('#main-action').addEventListener('click',()=>mainAction().catch(handleError));
$('#create-confirmed').addEventListener('click',()=>{$('#warning-dialog').close();mainAction(true).catch(handleError);});
$('#acknowledge-warnings').addEventListener('change',event=>$('#create-confirmed').disabled=!event.target.checked);
$('#confirm-visible').addEventListener('click',()=>{for(const [key,field]of Object.entries(state.job.fields)){if(field.value&&visibleField(key))field.confirmed=true;}renderFields();updateCounts();queueSave();toast('Filled fields marked as checked. You can uncheck any field that needs another look.');});
$('#check-fields').addEventListener('click',()=>checkFields().catch(handleError));
$('#quit-app').addEventListener('click',async()=>{try{if(state.job)await saveJob();await api('/api/shutdown',{});document.body.innerHTML='<main><h1>NMO Contract Maker is closed.</h1><p>Your work is saved on this Mac. You can close this tab and reopen the app whenever you need it.</p></main>';}catch(error){handleError(error);}});
$('#viewer-source').addEventListener('change',event=>{state.source=event.target.value;state.page=1;renderViewer();});
$('#prev-page').addEventListener('click',()=>{state.page--;renderViewer();});
$('#next-page').addEventListener('click',()=>{state.page++;renderViewer();});
$('#cancel-task').addEventListener('click',async()=>{if(state.task){await api('/api/cancel',{task:state.task});$('#task-message').textContent='Stopping after the current step; completed files stay saved.';}});
window.addEventListener('beforeunload',event=>{if(state.task){event.preventDefault();event.returnValue='A local operation is still running.';}});
async function init(){
  try{await refreshBootstrap();$('#today').textContent=new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).toUpperCase();renderJobs();}
  catch(error){$('#job-list').innerHTML='<div class="empty-state"><h3>The local app is starting</h3><p>Reload this window in a moment. Your files remain on this computer.</p></div>';handleError(error);}
}
init();
