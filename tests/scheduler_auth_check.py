"""Scheduler auth check: real HTTP calls against a running server.
Usage: SCHED_BASE=http://localhost:8080 PVG_SECRET=... LC_SECRET=... ANON=... USER_JWT=... python3 tests/scheduler_auth_check.py
Secrets are read from env only and never printed."""
import os, json, concurrent.futures as cf, urllib.request
B=os.environ["SCHED_BASE"]; ANON=os.environ["ANON"]
def post(path, headers):
    r=urllib.request.Request(B+path, data=b"{}", method="POST", headers={"Content-Type":"application/json",**headers})
    try:
        with urllib.request.urlopen(r, timeout=120) as x: return x.status, x.read()[:300].decode()
    except urllib.error.HTTPError as e: return e.code, e.read()[:120].decode()
res=[]
for name,path,sec in [("PVG","/api/public/pvg-reconcile",os.environ["PVG_SECRET"]),("LiveCards","/api/public/live-cards-reconcile",os.environ["LC_SECRET"])]:
    other=os.environ["LC_SECRET"] if name=="PVG" else os.environ["PVG_SECRET"]
    cases=[("valid private",{"Authorization":"Bearer "+sec},200),("missing auth",{},401),
      ("wrong secret",{"Authorization":"Bearer "+"0"*64},401),("public key only",{"apikey":ANON},401),
      ("public key as bearer",{"apikey":ANON,"Authorization":"Bearer "+ANON},401),
      ("logged-in customer JWT",{"apikey":ANON,"Authorization":"Bearer "+os.environ["USER_JWT"]},401),
      ("other scheduler's secret",{"Authorization":"Bearer "+other},401),("repeat valid",{"Authorization":"Bearer "+sec},200)]
    for c,h,exp in cases:
        s,b=post(path,h); res.append((name,c,s==exp,s,b[:120] if s==200 else ""))
    with cf.ThreadPoolExecutor(3) as ex:
        out=list(ex.map(lambda _: post(path,{"Authorization":"Bearer "+sec}),range(3)))
    res.append((name,"3 concurrent valid",all(s==200 for s,_ in out),[s for s,_ in out],[b[:100] for _,b in out]))
for r in res: print("PASS" if r[2] else "FAIL", *[x for i,x in enumerate(r) if i!=2])
