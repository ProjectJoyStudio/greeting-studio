import asyncio,os,json,uuid,requests
from pathlib import Path
from urllib.parse import urlparse
from playwright.async_api import async_playwright
ROOT=Path('/tmp/browser/pvg-payment')
s=json.loads((ROOT/'private-test-state.json').read_text());base=os.environ['SUPABASE_URL'].rstrip('/');key=os.environ['SUPABASE_SERVICE_ROLE_KEY']
h={'apikey':key,'Authorization':'Bearer '+key,'Content-Type':'application/json','Prefer':'return=representation'}
def request(method,path,data=None):
 r=requests.request(method,base+'/rest/v1/'+path,json=data,headers=h,timeout=30)
 assert r.ok, 'isolated database request failed'
 return r.json() if r.content else None
pid=str(uuid.uuid4());scene=str(uuid.uuid4());person=str(uuid.uuid4());uid=s['users'][0]
request('POST','pvg_projects',{'id':pid,'user_id':uid,'recipient_name':'Isolated interrupted payment','video_duration_seconds':10,'action_description':'Smile','status':'scene_selected'})
request('POST','pvg_scenes',{'id':scene,'user_id':uid,'project_id':pid,'variation_index':1,'status':'ready'})
request('POST','pvg_people',{'id':person,'user_id':uid,'project_id':pid,'position':0,'role':'speaker','name':'Test'})
request('PATCH','pvg_projects?id=eq.'+pid,{'selected_scene_id':scene,'single_speaker_person_id':person})
snap={**s['browser_snapshot'],'scene_id':scene,'speaker_id':person}
before=request('GET','credit_wallets?user_id=eq.'+uid)[0]['balance']
r=request('POST','rpc/purchase_pvg_final_video',{'_user_id':uid,'_project_id':pid,'_previous_video_id':None,'_snapshot':snap});assert r['ok'];vid=r['video_id']
request('PATCH','pvg_videos?id=eq.'+vid,{'created_at':'2026-11-24T18:00:00Z'})
loc=json.loads((ROOT/'locales.json').read_text());storage='sb-'+urlparse(os.environ.get('VITE_SUPABASE_URL',base)).hostname.split('.')[0]+'-auth-token'
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(headless=True)
  ctx=await b.new_context(storage_state={'cookies':[],'origins':[{'origin':'http://localhost:8080','localStorage':[{'name':storage,'value':json.dumps(s['session'])},{'name':'pj_lang','value':'ru'},{'name':'joy.pvg.edit-session','value':'a0000000-0000-4000-8000-000000000001'}]}]})
  page=await ctx.new_page();await page.goto('http://localhost:8080/video-greeting-setup?project='+pid,wait_until='domcontentloaded')
  await page.get_by_text(loc['ru']['pvr_status_failed_refunded'],exact=True).wait_for(timeout=30000)
  panel=page.get_by_text(loc['ru']['pvr_title'],exact=True).locator('..')
  await panel.screenshot(path=str(ROOT/'screenshots'/'real-orphan-refund.png'))
  restored=request('GET','credit_wallets?user_id=eq.'+uid)[0]['balance']
  v=request('GET','pvg_videos?id=eq.'+vid)[0]
  assert restored==before and v['credits_charged']==0 and v['refund_txn_id'] is not None
  credit_row=page.get_by_text('Остаток баланса',exact=True).locator('..').locator('dd')
  await credit_row.wait_for()
  assert before==20 and (await credit_row.inner_text()).split()[0]=='20', 'refunded balance not visible in credit summary'
  await page.reload(wait_until='domcontentloaded');await panel.get_by_text(loc['ru']['pvr_status_failed_refunded'],exact=True).wait_for(timeout=30000)
  assert request('GET','credit_wallets?user_id=eq.'+uid)[0]['balance']==before
  result={'test':'real interrupted paid-job reconciliation through signed-in UI, linked refund once, refresh','status':'PASS','debit':10,'refund':10,'provider_called':False}
  (ROOT/'orphan-result.json').write_text(json.dumps(result,indent=2));print('PASS: unpaid-submission orphan recovered through real server and signed-in UI; refund exactly 10 once.')
  await b.close()
asyncio.run(main())
