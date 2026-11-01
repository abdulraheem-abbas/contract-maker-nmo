// Uses only the disposable fictional workspace prepared by tools/check_app.py.
const {chromium}=require('./browser_runtime.cjs');
const fs=require('fs');const path=require('path');const assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
const fixture=JSON.parse(fs.readFileSync(path.join(root,'test-results/browser-config.json'),'utf8'));
assert.equal(new URL(fixture.base).hostname,'127.0.0.1');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CONTRACTS_BROWSER||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{
  const context=await browser.newContext({baseURL:fixture.base,viewport:{width:1440,height:1050}});
  const external=[],errors=[],failed=[];
  await context.route('**/*',route=>{const url=route.request().url();if(!url.startsWith(fixture.base+'/')&&!url.startsWith('data:')){external.push(url);return route.abort();}return route.continue();});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push({status:r.status(),url:r.url()});});
  await page.goto(fixture.base);await page.waitForFunction(()=>document.querySelector('#today').textContent!=='YOUR PRIVATE WORKSPACE');
  assert.equal(await page.locator('[data-new="review"],.read-ai,#engine-pill').count(),0);
  assert.equal(await page.locator('.sidebar').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(52, 58, 61)');
  await page.screenshot({path:path.join(root,'test-results/home.png'),fullPage:true});
  await page.locator('[data-new="create"]').click();await page.locator('#new-form button[type="submit"]').click();await page.locator('#details-panel').waitFor({state:'visible'});
  for(const [key,value] of Object.entries(fixture.fields)){
   const input=page.locator('#field-'+key);if(!await input.count()||!await input.isVisible())continue;
   if(['contract_type','gender','identity_type'].includes(key))await input.selectOption(value);else await input.fill(value);
  }
  assert.equal(await page.locator('#field-name_ar').getAttribute('dir'),'rtl');assert.equal(await page.locator('#field-name_en').getAttribute('dir'),'ltr');
  await page.locator('#confirm-visible').click();await page.locator('#save-job').click();
  await page.waitForFunction(()=>document.querySelector('#calculated-values').textContent.includes('Thursday')&&document.querySelector('#calculated-values').textContent.includes('92 calendar days'));
  await page.screenshot({path:path.join(root,'test-results/employee-details.png'),fullPage:true});
  await page.locator('.tab[data-tab="findings"]').click();await page.locator('#check-fields').click();await page.getByText('No field issues found',{exact:true}).waitFor();
  await page.locator('#main-action').click();await page.locator('#outputs-panel').waitFor({state:'visible',timeout:120000});await page.locator('.output-card').filter({hasText:'.pdf'}).waitFor();
  await page.screenshot({path:path.join(root,'test-results/outputs.png'),fullPage:true});
  const manual=await page.evaluate(async()=>{const b=await (await fetch('/api/bootstrap')).json();const j=await (await fetch('/api/job?id='+b.jobs[0].id)).json();return {id:j.id,outputs:j.outputs,source_count:j.sources.length,verification:j.last_generation};});
  assert.equal(manual.source_count,0);assert.equal(manual.outputs.length,3);assert(manual.verification.template_text_preserved);assert.equal(manual.verification.pdf_error,null);
  const bundle=await context.request.get('/api/bundle?job='+manual.id);assert.equal((await bundle.body()).subarray(0,2).toString(),'PK');
  await page.locator('#back-workspace').click();await page.locator('[data-new="spreadsheet"]').click();await page.locator('#new-form button[type="submit"]').click();await page.locator('#details-panel').waitFor({state:'visible'});
  await page.waitForFunction(()=>document.querySelector('#file-picker').accept==='.ods,.xlsx,.csv');
  await page.locator('#file-picker').setInputFiles(fixture.spreadsheet);await page.locator('#sheet-dialog').waitFor({state:'visible',timeout:120000});
  await page.locator('#sheet-row').selectOption('3');
  await page.screenshot({path:path.join(root,'test-results/spreadsheet-mapping.png'),fullPage:true});
  await page.locator('#import-sheet-row').click();await page.locator('#sheet-dialog').waitFor({state:'hidden'});
  assert.equal(await page.locator('#field-name_en').inputValue(),'Test Second Employee');assert.equal(await page.locator('#field-identity_number').inputValue(),'00009876');
  assert.equal(await page.locator('[data-confirm="identity_number"]').isChecked(),false);
  await page.locator('#confirm-visible').click();await page.locator('#save-job').click();await page.locator('#main-action').click();
  await page.locator('#outputs-panel').waitFor({state:'visible',timeout:120000});await page.locator('.output-card').filter({hasText:'.pdf'}).waitFor();
  const imported=await page.evaluate(async()=>{const b=await (await fetch('/api/bootstrap')).json();const j=await (await fetch('/api/job?id='+b.jobs[0].id)).json();return {outputs:j.outputs,imports:j.last_generation.spreadsheet_imports,number:j.fields.identity_number.value};});
  assert.equal(imported.outputs.length,3);assert.equal(imported.imports[0].row,3);assert.equal(imported.number,'00009876');
  await page.locator('nav [data-nav="templates"]').click();await page.locator('[data-template-card="employment"]').waitFor();assert.equal(await page.locator('[data-template-card]').count(),3);
  await page.screenshot({path:path.join(root,'test-results/templates.png'),fullPage:true});
  const initial=await page.evaluate(async()=> (await (await fetch('/api/bootstrap')).json()).templates.employment.sha256);
  await page.locator('[data-replace-template="employment"]').first().click({noWaitAfter:true});await page.locator('#template-picker').setInputFiles(fixture.replacement);
  await page.locator('#template-editor .eyebrow').filter({hasText:'DRAFT'}).waitFor();assert.equal(await page.locator('.template-check.error').count(),0);
  const stillActive=await page.evaluate(async()=> (await (await fetch('/api/bootstrap')).json()).templates.employment.sha256);assert.equal(initial,stillActive);
  await page.locator('#preview-template').click();await page.locator('#template-page-image').waitFor({timeout:120000});await page.waitForFunction(()=>document.querySelector('#template-page-image')?.naturalWidth>500);
  await page.locator('#template-reviewed').check();await page.locator('#activate-template').click();await page.locator('#template-editor .eyebrow').filter({hasText:'CURRENT TEMPLATE'}).waitFor();
  await page.locator('.template-history summary').click();await page.locator('[data-restore-template]').first().click();await page.locator('#template-reviewed').check();await page.locator('#activate-template').click();await page.locator('#template-editor .eyebrow').filter({hasText:'CURRENT TEMPLATE'}).waitFor();
  const restored=await page.evaluate(async()=> (await (await fetch('/api/bootstrap')).json()).templates.employment);assert.equal(restored.sha256,initial);assert.equal(restored.history_count,2);
  await page.locator('#close-template').click();await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:path.join(root,'test-results/mobile.png'),fullPage:true});
  const width=await page.evaluate(()=>({body:document.documentElement.scrollWidth,viewport:innerWidth}));assert(width.body<=width.viewport);
  await page.locator('nav [data-nav="setup"]').click();await page.getByText('Your own workspace',{exact:true}).waitFor();
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.deepEqual(failed,[]);
  const report={manual_entry:'Word/PDF generated with no source files',spreadsheet_import:'explicit row 3; leading zeros preserved; values unconfirmed until checked',template_changes:'draft, preview, activation and restore passed',arabic_and_english:'RTL/LTR inputs verified',derived_values:'weekday and inclusive period verified',nmo_theme:'verified',mobile_overflow:false,ai_controls:false,browser_errors:errors,external_requests:external};
  fs.writeFileSync(path.join(root,'test-results/browser-check.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
