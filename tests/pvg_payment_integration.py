"""Opt-in live isolated database regression: PVG_TEST_WRITE=yes python3 tests/pvg_payment_integration.py.
Uses only disposable accounts/projects. No provider calls or storage writes. Browser fixture in /tmp only.
"""
import os, json, uuid, secrets, sys
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import requests

ROOT = Path('/tmp/browser/pvg-payment')
ROOT.mkdir(parents=True, exist_ok=True)
STATE = ROOT / 'private-test-state.json'
BASE = os.environ['SUPABASE_URL'].rstrip('/')
KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']
HEAD = {'apikey': KEY, 'Authorization': 'Bearer '+KEY, 'Content-Type': 'application/json', 'Prefer': 'return=representation'}
results = []

def req(method, path, body=None, headers=None, allow=False):
    r = requests.request(method, BASE+path, json=body, headers=headers or HEAD, timeout=40)
    if not allow and not r.ok: raise AssertionError(f'isolated request failed: {method} {path.split("?")[0]} ({r.status_code})')
    return r

def rows(table, query=''):
    return req('GET', '/rest/v1/'+table+'?'+query).json()
def rpc(name, args):
    return req('POST', '/rest/v1/rpc/'+name, args).json()
def check(name, test):
    assert test, name
    results.append({'test':name,'status':'PASS','coverage':'real isolated database'})
    print('PASS:',name)

def cleanup(state):
    for uid in state['users']:
        # Parent removal permits FK cascade; direct removal of a paid job stays forbidden.
        req('DELETE','/rest/v1/pvg_projects?user_id=eq.'+uid)
        req('DELETE','/rest/v1/credit_transactions?user_id=eq.'+uid)
        req('DELETE','/rest/v1/credit_wallets?user_id=eq.'+uid)
        req('DELETE','/auth/v1/admin/users/'+uid)
    STATE.unlink(missing_ok=True)

if '--cleanup' in sys.argv:
    cleanup(json.loads(STATE.read_text())); print('Disposable accounts and records removed.'); sys.exit()
if os.environ.get('PVG_TEST_WRITE') != 'yes': raise SystemExit('Explicit opt-in required: PVG_TEST_WRITE=yes')
state={'users':[]}
try:
    for _ in range(2):
        email='pvg-atomic-'+str(uuid.uuid4())+'@example.invalid'; password=secrets.token_urlsafe(32)
        u=req('POST','/auth/v1/admin/users',{'email':email,'password':password,'email_confirm':True}).json()
        uid=u['id']; state['users'].append(uid)
        if len(state['users'])==1:
            token=req('POST','/auth/v1/token?grant_type=password',{'email':email,'password':password}).json()
            state['session']={k:token[k] for k in ('access_token','refresh_token')}
        STATE.write_text(json.dumps(state)); STATE.chmod(0o600)
    owner,other=state['users']; cust={**HEAD,'Authorization':'Bearer '+state['session']['access_token']}
    if not rows('credit_wallets','user_id=eq.'+owner):
        req('POST','/rest/v1/credit_wallets',{'user_id':owner,'balance':100,'is_test':True})
    req('PATCH','/rest/v1/credit_wallets?user_id=eq.'+owner,{'balance':100,'is_test':True})
    projects=[]
    def fixture(duration=15):
        pid=str(uuid.uuid4()); sid=str(uuid.uuid4()); person=str(uuid.uuid4())
        req('POST','/rest/v1/pvg_projects',{'id':pid,'user_id':owner,'recipient_name':'Isolated PVG payment test','occasion':'Birthday','scene_description':'Test scene','action_description':'Smile','video_duration_seconds':duration,'scene_packs':4,'generations_used':5,'status':'scene_selected'})
        req('POST','/rest/v1/pvg_people',{'id':person,'project_id':pid,'user_id':owner,'position':0,'name':'Test','role':'speaker'})
        req('POST','/rest/v1/pvg_scenes',{'id':sid,'project_id':pid,'user_id':owner,'variation_index':1,'status':'ready'})
        req('PATCH','/rest/v1/pvg_projects?id=eq.'+pid,{'selected_scene_id':sid,'single_speaker_person_id':person})
        snap={'prompt':'Smile','imageUrl':'https://example.invalid/scene','audioUrl':'https://example.invalid/voice','audioSeconds':duration,'seed':123,'duration':duration,'scene_id':sid,'speaker_id':person}
        projects.append(pid)
        return pid,snap
    def buy(pid,snap,prev=None,uid=None):
        return rpc('purchase_pvg_final_video',{'_user_id':uid or owner,'_project_id':pid,'_previous_video_id':prev,'_snapshot':snap})
    def balance(): return rows('credit_wallets','user_id=eq.'+owner)[0]['balance']
    def video(vid): return rows('pvg_videos','id=eq.'+vid)[0]
    def fail(vid): req('PATCH','/rest/v1/pvg_videos?id=eq.'+vid,{'status':'failed','submission_state':'rejected','error_code':'engine_error'})
    pid,snap=fixture(); r=buy(pid,snap)
    assert r.get('ok'), 'test purchase rejected: '+str(r)
    vid=r['video_id']
    check('successful atomic purchase / correct price / balance',r['created'] and balance()==85 and video(vid)['credits_charged']==15)
    ledger=rows('credit_transactions','user_id=eq.'+owner)
    check('job, debit and ledger linked',len(ledger)==1 and ledger[0]['id']==video(vid)['charge_txn_id'] and ledger[0]['amount']==-15 and ledger[0]['balance_before']==100 and ledger[0]['balance_after']==85)
    check('double click and response-loss replay',buy(pid,snap)['video_id']==vid and balance()==85)
    check('foreign owner rejected',buy(pid,snap,uid=other)['error']=='unauthorized')
    forbidden=req('POST','/rest/v1/rpc/purchase_pvg_final_video',{'_user_id':owner,'_project_id':pid,'_previous_video_id':None,'_snapshot':{**snap,'price':0}},cust,True)
    check('customer fake price / privileged purchase denied',not forbidden.ok)
    for name,args in [('refund_pvg_video_credits',{'_video_id':vid,'_reason':'fake'}),('claim_pvg_video_submission',{'_video_id':vid}),('claim_pvg_video_reconcile',{'_video_id':vid,'_token':str(uuid.uuid4())})]:
        check('customer denied '+name,not req('POST','/rest/v1/rpc/'+name,args,cust,True).ok)
    for table,body in [('pvg_videos',{'status':'failed','credits_charged':0}),('credit_wallets',{'balance':999})]:
        filt=('id=eq.'+vid) if table=='pvg_videos' else ('user_id=eq.'+owner)
        req('PATCH','/rest/v1/'+table+'?'+filt,body,cust,True)
    check('customer cannot alter statuses or balances',video(vid)['status']=='pending' and balance()==85)
    fake=req('POST','/rest/v1/credit_transactions',{'wallet_id':ledger[0]['wallet_id'],'user_id':owner,'txn_type':'refund','amount':999,'balance_after':999},cust,True)
    check('customer cannot create fake ledger',not fake.ok)
    check('unverified pending job cannot refund',rpc('refund_pvg_video_credits',{'_video_id':vid,'_reason':'fabricated'})==0 and balance()==85)
    fail(vid)
    with ThreadPoolExecutor(max_workers=8) as pool:
        refunds=list(pool.map(lambda _:rpc('refund_pvg_video_credits',{'_video_id':vid,'_reason':'verified mock rejection'}),range(8)))
    check('concurrent refund and duplicate callback exactly once',sum(refunds)==15 and refunds.count(15)==1 and balance()==100)
    check('refund never exceeds debit and history is exact',len(rows('credit_transactions','user_id=eq.'+owner))==2 and video(vid)['refund_txn_id'] is not None)
    check('terminal operation replay never charges again',buy(pid,snap)['video_id']==vid and balance()==100)
    p2,s2=fixture()
    with ThreadPoolExecutor(max_workers=8) as pool: purchases=list(pool.map(lambda _:buy(p2,s2),range(8)))
    v2=purchases[0]['video_id']
    check('eight real concurrent purchases one debit',len({x['video_id'] for x in purchases})==1 and sum(bool(x.get('created')) for x in purchases)==1 and balance()==85)
    check('submission claimed once',rpc('claim_pvg_video_submission',{'_video_id':v2}) and not rpc('claim_pvg_video_submission',{'_video_id':v2}))
    req('PATCH','/rest/v1/pvg_videos?id=eq.'+v2,{'status':'ready','submission_state':'accepted'})
    check('successful generation has no refund',rpc('refund_pvg_video_credits',{'_video_id':v2,'_reason':'fake failure'})==0 and balance()==85)
    nextbuy=buy(p2,s2,v2); v3=nextbuy['video_id']
    check('existing additional film price is five',video(v3)['credits_charged']==5 and balance()==80)
    fail(v3);rpc('refund_pvg_video_credits',{'_video_id':v3,'_reason':'mock rejected'})
    p3,s3=fixture(); before=balance(); n=len(rows('credit_transactions','user_id=eq.'+owner))
    broken=req('POST','/rest/v1/rpc/purchase_pvg_final_video',{'_user_id':owner,'_project_id':p3,'_previous_video_id':None,'_snapshot':{**s3,'seed':'invalid-bigint'}},allow=True)
    check('job insert failure rolls back debit and ledger',not broken.ok and balance()==before and len(rows('credit_transactions','user_id=eq.'+owner))==n and not rows('pvg_videos','project_id=eq.'+p3))
    req('PATCH','/rest/v1/credit_wallets?user_id=eq.'+owner,{'balance':0})
    check('insufficient credits without partial records',buy(p3,s3)['error']=='insufficient_credits' and balance()==0 and not rows('pvg_videos','project_id=eq.'+p3))
    req('PATCH','/rest/v1/credit_wallets?user_id=eq.'+owner,{'balance':15})
    p4,s4=fixture();p5,s5=fixture()
    with ThreadPoolExecutor(max_workers=2) as pool: cross=list(pool.map(lambda pair:buy(*pair),[(p4,s4),(p5,s5)]))
    check('concurrent different projects cannot overdraw one wallet',sum(bool(x['ok']) for x in cross)==1 and balance()==0)
    check('purchased scene attempts preserved',all(x['scene_packs']==4 and x['generations_used']==5 for x in rows('pvg_projects','user_id=eq.'+owner)))
    # Keep a new untouched fixture for signed-in browser checks. No media objects are created.
    req('PATCH','/rest/v1/credit_wallets?user_id=eq.'+owner,{'balance':30})
    ui,sui=fixture(10);state['browser_project']=ui;state['browser_snapshot']=sui
    STATE.write_text(json.dumps(state));STATE.chmod(0o600)
    (ROOT/'integration-results.json').write_text(json.dumps(results,indent=2))
    if '--keep-for-browser' not in sys.argv: cleanup(state)
    print('Integration checks completed:',len(results))
except Exception:
    (ROOT/'integration-results.json').write_text(json.dumps(results,indent=2))
    cleanup(state)
    raise
