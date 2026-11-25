"""Opt-in isolated PVG reliability regression: PVG_TEST_WRITE=yes python3 tests/pvg_reliability_integration.py
Disposable accounts/projects only. Provider calls: read-only Replicate lookups of a non-existent prediction,
never a paid generation. Scheduler is executed for real through the local server endpoint.
"""
import os, json, uuid, secrets, time, subprocess
from concurrent.futures import ThreadPoolExecutor
import requests

BASE = os.environ['SUPABASE_URL'].rstrip('/'); KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']
APP = os.environ.get('PVG_APP_URL', 'http://localhost:8080')
HEAD = {'apikey': KEY, 'Authorization': 'Bearer '+KEY, 'Content-Type': 'application/json', 'Prefer': 'return=representation'}
results = []
def req(m, p, b=None, h=None, allow=False):
    r = requests.request(m, BASE+p, json=b, headers=h or HEAD, timeout=60)
    if not allow and not r.ok: raise AssertionError(f'{m} {p.split("?")[0]} {r.status_code} {r.text[:200]}')
    return r
rows = lambda t, q='': req('GET', '/rest/v1/'+t+'?'+q).json()
rpc = lambda n, a, h=None: req('POST', '/rest/v1/rpc/'+n, a, h).json()
def check(name, ok, coverage='real isolated database'):
    results.append((name, 'PASS' if ok else 'FAIL', coverage)); print('PASS' if ok else 'FAIL', '-', name, f'[{coverage}]')

def secret():
    return rows('pvg_dispatch_config', 'select=secret&id=eq.true')[0]['secret']

users = []; admin_role = None
try:
    sessions = {}
    for label in ('owner', 'admin', 'stranger'):
        email = f'pvg-rel-{label}-{uuid.uuid4()}@example.invalid'; pw = secrets.token_urlsafe(24)
        u = req('POST', '/auth/v1/admin/users', {'email': email, 'password': pw, 'email_confirm': True}).json(); users.append(u['id'])
        sessions[label] = {**HEAD, 'Authorization': 'Bearer '+req('POST', '/auth/v1/token?grant_type=password', {'email': email, 'password': pw}).json()['access_token']}
    owner, admin, stranger = users
    if not rows('credit_wallets', 'user_id=eq.'+owner): req('POST', '/rest/v1/credit_wallets', {'user_id': owner, 'balance': 0, 'is_test': True})
    req('PATCH', '/rest/v1/credit_wallets?user_id=eq.'+owner, {'balance': 100, 'is_test': True})
    bal = lambda: rows('credit_wallets', 'user_id=eq.'+owner)[0]['balance']
    def fixture(role):
        pid, sid, person = str(uuid.uuid4()), str(uuid.uuid4()), str(uuid.uuid4())
        req('POST', '/rest/v1/pvg_projects', {'id': pid, 'user_id': owner, 'recipient_name': 'Isolated reliability test', 'occasion': 'Birthday', 'scene_description': 'Test', 'action_description': 'Calm', 'video_duration_seconds': 10, 'scene_packs': 4, 'generations_used': 5, 'status': 'scene_selected'})
        req('POST', '/rest/v1/pvg_people', {'id': person, 'project_id': pid, 'user_id': owner, 'position': 0, 'name': 'T', 'role': role})
        req('POST', '/rest/v1/pvg_scenes', {'id': sid, 'project_id': pid, 'user_id': owner, 'variation_index': 1, 'status': 'ready'})
        req('PATCH', '/rest/v1/pvg_projects?id=eq.'+pid, {'selected_scene_id': sid, 'single_speaker_person_id': person})
        base = {'prompt': 'x', 'imageUrl': 'https://example.invalid/s', 'audioUrl': 'https://example.invalid/v', 'audioSeconds': 10, 'seed': 1, 'duration': 10, 'scene_id': sid}
        return pid, person, base
    buy = lambda pid, snap: rpc('purchase_pvg_final_video', {'_user_id': owner, '_project_id': pid, '_previous_video_id': None, '_snapshot': snap})

    # --- no-speaker authorization
    np, narrator, nbase = fixture('narrator')
    r = buy(np, {**nbase, 'speaker_id': None, 'route': 'scene'})
    nv = r.get('video_id')
    check('no-speaker (narrator) purchase authorised at 10 credits', r.get('ok') and r.get('created') and bal() == 90)
    v = rows('pvg_videos', 'id=eq.'+str(nv))[0] if nv else {}
    check('no-speaker job stores route scene and no speaker', v.get('speech_route') == 'scene' and v.get('speaker_person_id') is None)
    sp, speaker, sbase = fixture('speaker')
    check('speaking-person order cannot be bought as no-speaker', buy(sp, {**sbase, 'speaker_id': None, 'route': 'scene'}).get('error') == 'invalid_operation' and bal() == 90)
    r2 = buy(sp, {**sbase, 'speaker_id': speaker})
    check('standard single-speaker purchase still authorised', r2.get('ok') and r2.get('created') and bal() == 80)
    check('duplicate request replays without second debit', buy(sp, {**sbase, 'speaker_id': speaker}).get('video_id') == r2['video_id'] and bal() == 80)
    p3, sp3, b3 = fixture('speaker')
    with ThreadPoolExecutor(8) as pool: cc = list(pool.map(lambda _: buy(p3, {**b3, 'speaker_id': sp3}), range(8)))
    check('8 concurrent purchases -> one debit', len({x.get('video_id') for x in cc}) == 1 and sum(bool(x.get('created')) for x in cc) == 1 and bal() == 70)

    # --- scheduler: real endpoint execution with service-only credential
    sec = secret()
    bad = requests.post(APP+'/api/public/pvg-reconcile', headers={'Authorization': 'Bearer wrong'}, timeout=30)
    pub = requests.post(APP+'/api/public/pvg-reconcile', headers={'apikey': os.environ.get('SUPABASE_PUBLISHABLE_KEY', 'x')}, timeout=30)
    check('scheduler rejects wrong/public credentials', bad.status_code == 401 and pub.status_code == 401, 'real local server')
    # Ambiguous: dispatched > 45 min ago, no job ID (Replicate engine), fingerprint present.
    old = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(time.time() - 50*60))
    amb = cc[0]['video_id']
    req('PATCH', '/rest/v1/pvg_videos?id=eq.'+amb, {'submission_state': 'uncertain', 'video_generator_key': 'kling_avatar_v2', 'dispatch_fingerprint': 'f'*64, 'dispatched_at': old})
    # Lost provider job: stored prediction id that Replicate does not know -> review, not refund.
    lost = r2['video_id']
    req('PATCH', '/rest/v1/pvg_videos?id=eq.'+lost, {'submission_state': 'accepted', 'status': 'processing', 'video_generator_key': 'kling_avatar_v2', 'video_prediction_id': 'pjtestnonexistent0000000000', 'prediction_id': 'pjtestnonexistent0000000000'})
    # Never-dispatched paid job older than 10 minutes -> verified not sent -> one refund.
    req('PATCH', '/rest/v1/pvg_videos?id=eq.'+nv, {'created_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(time.time() - 15*60))})
    runs = []
    with ThreadPoolExecutor(3) as pool:
        runs = list(pool.map(lambda _: requests.post(APP+'/api/public/pvg-reconcile', headers={'Authorization': 'Bearer '+sec}, timeout=120), range(3)))
    check('scheduler executes with service credential (3 parallel workers)', all(x.status_code == 200 for x in runs), 'real local server')
    a, l, n = (rows('pvg_videos', 'id=eq.'+i)[0] for i in (amb, lost, nv))
    check('ambiguous Replicate submission flagged for admin, not refunded', a['needs_review'] and a['review_reason'] == 'submission_outcome_unknown' and a['credits_charged'] == 10 and a['status'] == 'pending', 'real scheduler + real Replicate list read')
    check('provider job not found -> review, no refund', l['needs_review'] and l['credits_charged'] == 10 and l['status'] == 'processing', 'real scheduler + real Replicate read')
    check('never-dispatched job refunded exactly once despite parallel workers', n['status'] == 'failed' and n['credits_charged'] == 0 and n['refund_txn_id'] is not None and bal() == 80, 'real scheduler')
    again = requests.post(APP+'/api/public/pvg-reconcile', headers={'Authorization': 'Bearer '+sec}, timeout=120)
    check('scheduler rerun: no duplicate refund, no new debit', again.ok and bal() == 80 and len(rows('credit_transactions', 'user_id=eq.'+owner+'&txn_type=eq.refund')) == 1, 'real scheduler')

    # --- callbacks
    body = json.dumps({'id': 'pjtestnonexistent0000000000', 'status': 'failed'})
    forged = requests.post(APP+'/api/public/pvg-provider-callback?op='+lost, data=body, headers={'webhook-id': 'msg_x', 'webhook-timestamp': str(int(time.time())), 'webhook-signature': 'v1,'+'A'*44, 'Content-Type': 'application/json'}, timeout=30)
    l2 = rows('pvg_videos', 'id=eq.'+lost)[0]
    check('forged callback rejected, no completion/refund', forged.status_code in (401, 503) and l2['status'] == 'processing' and l2['credits_charged'] == 10 and bal() == 80, 'real local server')

    # --- admin recovery
    denied = rpc('admin_resolve_pvg_video', {'_video_id': lost, '_action': 'confirm_failed', '_note': 't'}, sessions['stranger'])
    check('non-admin cannot resolve operation', denied.get('error') == 'forbidden' and bal() == 80)
    admin_role = req('POST', '/rest/v1/user_roles', {'user_id': admin, 'role': 'admin'}).json()[0]['id']
    with ThreadPoolExecutor(4) as pool:
        res = list(pool.map(lambda _: rpc('admin_resolve_pvg_video', {'_video_id': lost, '_action': 'confirm_failed', '_note': 'isolated test'}, sessions['admin']), range(4)))
    check('admin confirm failure refunds exactly once (4 parallel clicks)', sum(x.get('refunded', 0) for x in res) == 10 and bal() == 90)
    ok = rpc('admin_resolve_pvg_video', {'_video_id': amb, '_action': 'recheck'}, sessions['admin'])
    a2 = rows('pvg_videos', 'id=eq.'+amb)[0]
    check('admin recheck re-queues without charge or refund', ok.get('ok') and not a2['needs_review'] and a2['credits_charged'] == 10 and bal() == 90)
    tx = rows('credit_transactions', 'user_id=eq.'+owner+'&order=created_at')
    check('transaction history: 3 debits, 2 refunds, final balance 90', sum(1 for t in tx if t['amount'] < 0) == 3 and sum(1 for t in tx if t['amount'] > 0) == 2 and 100 + sum(t['amount'] for t in tx) == 90)
    check('purchased scene attempts preserved', all(x['scene_packs'] == 4 and x['generations_used'] == 5 for x in rows('pvg_projects', 'user_id=eq.'+owner)))
finally:
    if admin_role: req('DELETE', '/rest/v1/user_roles?id=eq.'+admin_role, allow=True)
    for uid in users:
        req('DELETE', '/rest/v1/pvg_projects?user_id=eq.'+uid, allow=True)
        req('DELETE', '/rest/v1/credit_transactions?user_id=eq.'+uid, allow=True)
        req('DELETE', '/rest/v1/credit_wallets?user_id=eq.'+uid, allow=True)
        req('DELETE', '/auth/v1/admin/users/'+uid, allow=True)
    print('cleanup done;', sum(1 for r in results if r[1] == 'PASS'), 'PASS /', len(results))
