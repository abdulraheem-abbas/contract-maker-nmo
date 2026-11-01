// Reliability checks use only check_app.py's temporary fictional workspace.
const assert=require('assert/strict');
module.exports=async function reviewInterface({browser,fixture}){
 const context=await browser.newContext({baseURL:fixture.base,viewport:{width:390,height:844}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.stack||e.message));
 try{
  await page.goto(fixture.base);await page.waitForFunction(()=>state.boot);
  await page.locator('[data-new=create]').click();await page.locator('#new-form button[type=submit]').click();await page.locator('#details-panel').waitFor({state:'visible'});
  const job=await page.evaluate(()=>state.job.id);
  const fail=route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'This action could not finish. Your originals were preserved.'})});
  await page.route('**/api/save',fail);await page.locator('#field-name_en').fill('Unsaved Test Employee');await page.locator('#save-job').click();await page.waitForFunction(()=>state.saveError);
  assert((await page.locator('#saved-status').innerText()).includes('تعذّر حفظ'));
  const preventsUnload=()=>page.evaluate(()=>{const event=new Event('beforeunload',{cancelable:true});window.dispatchEvent(event);return event.defaultPrevented;});
  assert(await preventsUnload());await page.locator('nav [data-nav=completed]').click();assert.equal(await page.evaluate(()=>state.view),'job');assert.equal(await page.locator('#field-name_en').inputValue(),'Unsaved Test Employee');
  await page.locator('#language-switch').click();assert((await page.locator('#saved-status').innerText()).includes('could not be saved'));assert(await preventsUnload());
  await page.unroute('**/api/save',fail);
  let active=0,maxActive=0,completed=0;await page.route('**/api/save',async route=>{active++;maxActive=Math.max(maxActive,active);try{await new Promise(r=>setTimeout(r,250));const response=await route.fetch();await route.fulfill({response});completed++;}finally{active--;}});
  await page.locator('#save-job').click();await page.waitForFunction(()=>state.saving);await page.locator('#field-name_en').fill('Latest Test Employee');await page.locator('#save-job').click();
  await page.waitForFunction(()=>!state.unsaved&&!state.saving&&!state.savePending);assert.equal(maxActive,1);assert(completed>=2);assert.equal(await preventsUnload(),false);
  const stored=await(await context.request.get('/api/job?id='+job)).json();assert.equal(stored.fields.name_en.value,'Latest Test Employee');assert((await page.locator('#saved-status').innerText()).includes('Saved on this computer'));
  await page.reload();await page.locator(`[data-job="${job}"]`).click();assert.equal(await page.locator('#field-name_en').inputValue(),'Latest Test Employee');
  for(const width of [320,390,768]){await page.setViewportSize({width,height:900});for(const lang of ['ar','en']){await page.evaluate(lang=>{if(NMOI18n.language!==lang)switchLanguage();},lang);const boxes=await page.locator('.tab').evaluateAll(tabs=>tabs.map(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,height:r.height};}));assert(boxes.every(b=>b.left>=0&&b.right<=width&&b.height>=44));const heights=await page.locator('.field-input').evaluateAll(fields=>fields.map(el=>el.getBoundingClientRect().height));assert(heights.every(h=>Math.abs(h-46)<.1));}}
  assert.deepEqual(errors,[]);
  return {save_failure:'visible in both languages; navigation preserves unsaved form',unsaved_changes:'reload/close guarded until saved',concurrent_saves:'serialized; latest value remains after reload',mobile_tabs:'all four visible in both languages at 320, 390 and 768 pixels'};
 }finally{await context.close();}
};
