import asyncio,os,json,requests,sys
from pathlib import Path
from urllib.parse import urlparse
from playwright.async_api import async_playwright
ROOT=Path('/tmp/browser/pvg-payment')
state=json.loads((ROOT/'private-test-state.json').read_text())
base=os.environ['SUPABASE_URL'].rstrip('/')
key=os.environ['SUPABASE_SERVICE_ROLE_KEY']
h={'apikey':key,'Authorization':'Bearer '+key,'Content-Type':'application/json','Prefer':'return=representation'}
session=requests.post(base+'/auth/v1/token?grant_type=refresh_token',json={'refresh_token':state['session']['refresh_token']},headers=h,timeout=30).json()
assert 'access_token' in session
state['session']=session;(ROOT/'private-test-state.json').write_text(json.dumps(state))
pid=state['browser_project'];requests.patch(base+'/rest/v1/pvg_projects?id=eq.'+pid,json={'edit_session_id':None,'edit_heartbeat_at':None},headers=h,timeout=30).raise_for_status();loc=json.loads((ROOT/'locales.json').read_text())
storage='sb-'+urlparse(os.environ.get('VITE_SUPABASE_URL',base)).hostname.split('.')[0]+'-auth-token'
results=[]
async def context(browser,lang,viewport):
    return await browser.new_context(viewport={'width':viewport[0],'height':viewport[1]},storage_state={'cookies':[],'origins':[{'origin':'http://localhost:8080','localStorage':[{'name':storage,'value':json.dumps(session)},{'name':'pj_lang','value':lang},{'name':'joy.pvg.edit-session','value':'a0000000-0000-4000-8000-000000000001'}]}]})
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(headless=True)
  for lang in ([] if '--restored-only' in sys.argv else ['en','ru','uk','pl','de','fr']):
   ctx=await context(b,lang,(1280,1800));page=await ctx.new_page()
   await page.goto('http://localhost:8080/video-greeting-setup?project='+pid,wait_until='domcontentloaded')
   panel=page.get_by_text(loc[lang]['pvr_title'],exact=True).locator('..')
   await panel.wait_for(timeout=30000)
   button=panel.get_by_role('button',name=loc[lang]['pvr_create'],exact=True)
   await button.click();await page.get_by_text(loc[lang]['pvr_err_no_scene'],exact=True).wait_for()
   await panel.screenshot(path=str(ROOT/'screenshots'/f'{lang}-payment.png'))
   results.append({'language':lang,'test':'signed-in payment button / localized validation error','status':'PASS','coverage':'Chromium desktop emulation; no payment for invalid scene'})
   await ctx.close()
  # A real durable debit created through the same database RPC; no provider or media calls.
  args={'_user_id':state['users'][0],'_project_id':pid,'_previous_video_id':None,'_snapshot':state['browser_snapshot']}
  bought=requests.post(base+'/rest/v1/rpc/purchase_pvg_final_video',json=args,headers=h,timeout=30).json();assert bought.get('ok')
  vid=bought['video_id']
  requests.patch(base+'/rest/v1/pvg_videos?id=eq.'+vid,json={'submission_state':'uncertain','error_code':'submission_uncertain'},headers=h,timeout=30).raise_for_status()
  for label,size in [('Windows desktop',(1920,1080)),('Windows laptop',(1366,768)),('macOS desktop',(1440,900)),('macOS laptop',(1280,800)),('iPhone portrait',(390,844)),('iPhone landscape',(844,390)),('Android phone portrait',(412,915)),('Android phone landscape',(915,412)),('iPad portrait',(820,1180)),('iPad landscape',(1180,820)),('Android tablet portrait',(800,1280)),('Android tablet landscape',(1280,800))]:
   ctx=await context(b,'ru',size);page=await ctx.new_page()
   await page.goto('http://localhost:8080/video-greeting-setup?project='+pid,wait_until='domcontentloaded')
   panel=page.get_by_text(loc['ru']['pvr_title'],exact=True).locator('..')
   await panel.get_by_text(loc['ru']['pvr_payment_uncertain'],exact=True).wait_for(timeout=30000)
   assert await panel.get_by_role('button',name=loc['ru']['pvr_create'],exact=True).count()==0
   assert await panel.evaluate('(e)=>e.scrollWidth<=e.clientWidth+1')
   await page.reload(wait_until='domcontentloaded')
   await panel.get_by_text(loc['ru']['pvr_payment_uncertain'],exact=True).wait_for(timeout=30000)
   await panel.screenshot(path=str(ROOT/'screenshots'/(label.replace(' ','-')+'.png')))
   global_overflow=await page.evaluate('document.documentElement.scrollWidth>innerWidth+1')
   results.append({'device_category':label,'test':'durable payment restored; no new payment button; panel fits','status':'PASS','page_overflow':global_overflow,'coverage':'Chromium viewport emulation, not physical OS/device'})
   await ctx.close()
  for lang in ['en','ru','uk','pl','de','fr']:
   ctx=await context(b,lang,(1280,1800));page=await ctx.new_page()
   await page.goto('http://localhost:8080/video-greeting-setup?project='+pid,wait_until='domcontentloaded')
   await page.get_by_text(loc[lang]['pvr_payment_uncertain'],exact=True).wait_for(timeout=30000)
   results.append({'language':lang,'test':'localized payment reconciliation message','status':'PASS','coverage':'Chromium'})
   await ctx.close()
  await b.close()
 if '--restored-only' in sys.argv:
  results[:]=json.loads((ROOT/'browser-results.json').read_text())+results
 (ROOT/'browser-results.json').write_text(json.dumps(results,indent=2,ensure_ascii=False))
 print('Browser cases passed:',len(results));print('Whole-page overflow cases:',sum(x.get('page_overflow',False) for x in results))
asyncio.run(main())
