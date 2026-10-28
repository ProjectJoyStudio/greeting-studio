import asyncio,json,os
from pathlib import Path
from playwright.async_api import async_playwright
ROWS=json.loads(Path(os.environ.get('VIEWER_SHARES_FILE','/tmp/viewer-shares.json')).read_text());BOOKS=[ROWS[-1],ROWS[0]]
OUT=Path('/tmp/browser/viewer-audit');OUT.mkdir(parents=True,exist_ok=True);sem=asyncio.Semaphore(4)
SIZES=[('desktop',1280,1800,False),('laptop',902,772,False),('iphone-small',320,568,True),('iphone-large',430,932,True),('android-small',360,640,True),('android-large',412,915,True),('ipad-small',768,1024,True),('ipad-large',1024,1366,True),('android-tablet',800,1280,True)]
async def visible(page):
 return await page.locator('[data-face-index]').evaluate_all("els=>els.filter(e=>getComputedStyle(e).display!=='none' && e.getBoundingClientRect().width>0 && !e.classList.contains('stf__item--temporary')).map(e=>Number(e.dataset.faceIndex))")
async def run(browser,size,row,bi):
 async with sem:
  name,w,h,touch=size; result={'case':name,'book':bi};errors=[]
  ctx=await browser.new_context(viewport={'width':w,'height':h},is_mobile=touch,has_touch=touch)
  page=await ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
  try:
   await page.goto('http://localhost:8080',wait_until='domcontentloaded');await page.evaluate("localStorage.setItem('pj_lang','en')")
   await page.goto('http://localhost:8080/memory-book/share/'+row['token'],wait_until='domcontentloaded');await page.locator('.stf__parent').wait_for(timeout=120000);await page.wait_for_timeout(1000)
   count=await page.locator('[data-face-index]').count();expected=12 if bi==0 else 32;assert count==expected,(count,expected)
   sequence=[await visible(page)]
   for i in range(count):
    nxt=page.get_by_role('button',name='Next page',exact=True)
    if await nxt.is_disabled():break
    await nxt.click();await page.wait_for_timeout(1000);v=await visible(page);assert v!=sequence[-1],('did not advance',v);sequence.append(v)
   assert count-1 in sequence[-1],sequence
   assert set(range(count)).issubset(set(x for a in sequence for x in a)),sequence
   result['manual_forward']=sequence
   reverse=[]
   for i in range(count):
    prev=page.get_by_role('button',name='Previous page',exact=True)
    if await prev.is_disabled():break
    await prev.click();await page.wait_for_timeout(1000);reverse.append(await visible(page))
   assert 0 in reverse[-1];result['manual_backward']=True
   await page.screenshot(path=str(OUT/f'{name}-{bi}-cover.png'))
   await page.get_by_role('button',name='Auto-turn pages',exact=True).click();await page.wait_for_timeout(4300)
   await page.get_by_role('button',name='Stop auto-turn',exact=True).click();await page.wait_for_timeout(900);stopped=await visible(page);await page.wait_for_timeout(3400);assert stopped==await visible(page)
   await page.set_viewport_size({'width':h,'height':w});await page.wait_for_timeout(1500);rotated=await visible(page);assert set(stopped)&set(rotated),(stopped,rotated)
   await page.get_by_role('button',name='Auto-turn pages',exact=True).click();auto=[await visible(page)]
   for i in range(count):
    await page.wait_for_timeout(3300);v=await visible(page)
    if v!=auto[-1]:auto.append(v)
    if await page.get_by_role('button',name='Next page',exact=True).is_disabled():break
   assert count-1 in auto[-1],auto
   assert await page.get_by_role('button',name='Auto-turn pages',exact=True).is_visible();result['auto_stop_resume_end']=auto
   result['overflow']=await page.evaluate('document.documentElement.scrollWidth>innerWidth');assert not result['overflow']
   rects=await page.locator('.mb-reader-controls button').evaluate_all('es=>es.map(e=>{let r=e.getBoundingClientRect();return {w:r.width,h:r.height,clip:e.scrollWidth>e.clientWidth+1}})');assert all(r['h']>=44 and not r['clip'] for r in rects),rects
   await page.screenshot(path=str(OUT/f'{name}-{bi}-landscape-end.png'))
   result['errors']=errors;assert not errors;result['ok']=True
  except Exception as e:result['ok']=False;result['error']=str(e).split('http')[0][:1000];result['errors']=errors
  finally:await ctx.close()
  print(json.dumps(result),flush=True);return result
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(headless=True);batch=int(os.environ.get('BATCH','0'));sizes=SIZES[batch*3:batch*3+3]
  results=await asyncio.gather(*(run(b,size,row,bi) for size in sizes for bi,row in enumerate(BOOKS)));(OUT/f'matrix-{batch}.json').write_text(json.dumps(results,indent=2));await b.close()
asyncio.run(main())
