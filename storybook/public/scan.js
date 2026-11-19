// Dev-only checker: load every story in a hidden iframe and record crashes.
// Usage in the browser console on /iframe.html: await import('/scan.js'); await window.__scan(e => e.id.startsWith('flows-'))
window.__scan = async (filterFn, par = 4, wait = 2000) => {
  window.__sbRes = []; window.__sbDone = false;
  const idx = await fetch('/index.json?' + Date.now()).then((r) => r.json());
  const ids = Object.values(idx.entries).filter((e) => e.type === 'story' && (!filterFn || filterFn(e))).map((e) => e.id);
  window.__sbTotal = ids.length;
  const ignore = /Warning:|act\(|defaultProps|findDOMNode|deprecated|useNativeDriver|\[storybook\] click-out|Each child|no fixture for .*\/(analytics|log)/i;
  const one = async (id) => {
    const f = document.createElement('iframe');
    f.style.cssText = 'width:420px;height:860px;position:fixed;left:0;top:0;opacity:0.01';
    f.src = `/iframe.html?id=${id}&viewMode=story`; document.body.appendChild(f);
    const errs = [];
    await new Promise((res) => { f.onload = () => { try { f.contentWindow.addEventListener('error', (e) => errs.push(String(e.message))); const ce = f.contentWindow.console.error; f.contentWindow.console.error = (...a) => { errs.push(a.map(String).join(' ').slice(0, 220)); ce.apply(f.contentWindow.console, a); }; } catch (e) {} res(); }; setTimeout(res, 6000); });
    await new Promise((r) => setTimeout(r, wait));
    let showErr = false, msg = '', empty = true;
    try { const d = f.contentDocument; showErr = d.body.classList.contains('sb-show-errordisplay'); msg = showErr ? (d.querySelector('#error-message')?.textContent || '').slice(0, 220) : ''; empty = d.body.textContent.replace(/\s/g, '').length < 2 && d.querySelectorAll('#storybook-root svg, #storybook-root img').length === 0; } catch (e) { msg = String(e); }
    const hard = errs.filter((e) => !ignore.test(e));
    window.__sbRes.push({ id, ok: !showErr && !hard.length, empty, msg: msg || hard[0] || '' });
    f.remove();
  };
  const q = ids.slice();
  await Promise.all(Array.from({ length: par }, async () => { while (q.length) await one(q.shift()); }));
  window.__sbDone = true;
  return { total: ids.length, failing: window.__sbRes.filter((r) => !r.ok).map((r) => r.id + ' :: ' + r.msg.slice(0, 160)), empty: window.__sbRes.filter((r) => r.ok && r.empty).map((r) => r.id) };
};
