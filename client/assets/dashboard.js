/* UI consumes only the authenticated, account-scoped ATLAS dashboard feed. */
'use strict';
const $=id=>document.getElementById(id), E=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>v==null?'—':Number(v).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});
const num=v=>v==null?'—':Number(v).toLocaleString('en-US',{maximumFractionDigits:0});
const pct=v=>v==null?'—':(Number(v)*100).toFixed(1)+'%';
const dec=v=>v==null?'—':Number(v).toFixed(2);
const date=s=>new Date(s+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
const format=(key,v)=>v==null?'—':['unit_price','cost_per_visit'].includes(key)?'$'+Number(v).toFixed(2):['sales','spend','ad_sales'].includes(key)?money(v):['acos','tacos','unit_conversion','selling_instock'].includes(key)?pct(v):key==='roas'?dec(v)+'×':num(v);
let D,mode='overview',preview=null,busy=false,boardAll=false;
const metrics=[['sales','Total sales'],['units','Units ordered'],['traffic','Traffic'],['spend','Ad spend'],['ad_sales','Paid sales'],['clicks','Paid clicks'],['acos','ACoS'],['roas','ROAS'],['tacos','TACoS'],['cost_per_visit','Cost per visit'],['unit_conversion','Unit conversion'],['unit_price','Average unit price'],['selling_instock','Selling inventory in stock']];
function current(ch){return D.channels[ch].windows[mode==='week'?'week':ch==='amazon'?'fourweek':'month'];}
function delta(a,b){return a==null||b==null||b===0?'—':((a-b)/Math.abs(b)>=0?'+':'')+pct((a-b)/Math.abs(b));}
function inventoryNote(v){
  if(!v?.inventory_snapshot_date)return 'No matching inventory snapshot';
  return 'Observed '+date(v.inventory_snapshot_date)+(v.selling_items!=null?' · quantities known for '+num(v.inventory_observed_selling_items)+' of '+num(v.selling_items)+' selling items':'');
}
function metricCell(k,v,prior=null){
  const basisDiff=prior&&['ad_sales','acos','roas'].includes(k)&&v?.[k]!=null&&prior?.[k]!=null&&(!v.paid_sales_basis_comparable||!prior.paid_sales_basis_comparable);
  return format(k,v?.[k])+(prior?'<small>'+(basisDiff?'Attribution differs':delta(prior?.[k],v?.[k]))+'</small>':'')+(k==='selling_instock'?'<small>'+E(inventoryNote(v))+'</small>':'');
}
function summary(){
  $('scorecards').innerHTML=['amazon','walmart'].map(ch=>{const c=D.channels[ch],w=current(ch),v=w.current;return ['sales','traffic','spend','clicks'].map(k=>`<article class="scorecard ${ch}"><i></i><div class="label">${c.name} ${k==='traffic'?c.traffic_label:metrics.find(m=>m[0]===k)[1]}</div><div class="value">${format(k,v[k])}</div>${mode==='week'?'<div class="muted">Last completed 7 days</div>':`<div class="muted">${delta(v[k],w.prior?.[k])} vs prior · ${delta(v[k],w.ly?.[k])} YoY</div>`}</article>`).join('');}).join('')+`<article class="scorecard inbound"><div class="label">Units inbound</div><div class="value">${num(D.channels.amazon.inventory.inbound!=null&&D.channels.walmart.inventory.inbound!=null?Number(D.channels.amazon.inventory.inbound)+Number(D.channels.walmart.inventory.inbound):null)}</div>${['amazon','walmart'].map(ch=>`<div class="inbound-row"><span>${D.channels[ch].name}</span><b>${num(D.channels[ch].inventory.inbound)}</b></div>`).join('')}<p class="muted">Inbound is separate from available stock. Snapshot dates are shown below.</p></article>`;
  $('periods').innerHTML=['amazon','walmart'].map(ch=>{const v=current(ch).current;return `<span class="chip ${ch}">${D.channels[ch].name} · ${date(v.start)} to ${date(v.end)}</span>`;}).join('');
  $('summary').innerHTML=['amazon','walmart'].map(ch=>{
    const c=D.channels[ch],w=current(ch),v=w.current;
    const cards='';
    const rows=metrics.map(([k,label])=>`<tr><td>${E(k==='traffic'?c.traffic_label:label)}</td><td>${metricCell(k,v)}</td>${mode==='week'?'':`<td>${metricCell(k,w.prior,v)}</td><td>${metricCell(k,w.ly,v)}</td>`}</tr>`).join('');
    return `<article class="panel ${ch}"><h3>${c.name}</h3><div class="period">${date(v.start)} – ${date(v.end)} · ${v.days} days</div>${!v.complete_sales?'<p class="alert">Sales coverage is incomplete for this period. Upload the missing sales report to populate totals and brand share.</p>':''}${v.missing_ad_dates.length?`<p class="alert">Ad coverage is incomplete on ${v.missing_ad_dates.length} day(s); period ad totals stay unavailable.</p>`:''}<div class="metrics">${cards}</div><div class="scroll-summary"><table><thead><tr><th>Measure</th><th>Current</th>${mode==='week'?'':'<th>Prior period<br>Change</th><th>Last year<br>Change</th>'}</tr></thead><tbody>${rows}</tbody></table></div><p class="period">${E(v.basis)} · ${E(v.ads_attribution_label||c.ads_label)}</p>${mode!=='week'&&w.ly?.ads_source_note?`<p class="period">Last-year ads: ${E(w.ly.ads_attribution_label)}. ${E(w.ly.ads_source_note)} Paid-sales change percentages are shown only for matching attribution.</p>`:''}</article>`;
  }).join('');
  $('period-note').textContent=mode==='week'?'The latest completed Sunday–Saturday week. This view has no previous-week comparison.':'Amazon: 28 days against the prior 28 and the same dates last year. Walmart: 30 days against the prior 30 and the same dates last year.';
}
function brands(){
  $('brands').innerHTML=['amazon','walmart'].map(ch=>{
    const c=D.channels[ch],v=current(ch).current;
    return `<article class="panel ${ch}"><h3>${c.name}</h3><p class="period">${date(v.start)} – ${date(v.end)} · all marketplace sales: ${money(v.sales)}</p>${v.complete_sales?`<table><thead><tr><th>Brand / licensed line</th><th>Sales</th><th>Share</th><th>Units</th></tr></thead><tbody>${v.brands.map(b=>`<tr><td>${E(b.name)}<span class="bar-track"><i style="width:${Math.max(0,Math.min(100,(b.share||0)*100))}%"></i></span></td><td>${money(b.sales)}</td><td>${pct(b.share)}</td><td>${num(b.units)}</td></tr>`).join('')}</tbody></table>`:'<p class="alert">A complete marketplace sales period is needed before shares can be calculated.</p>'}</article>`;
  }).join('');
}
function inventory(){
  $('inventory').innerHTML=['amazon','walmart'].map(ch=>{
    const c=D.channels[ch],v=current(ch).current,stock=D.items.filter(i=>i.marketplace===ch);
    const lookup=new Map(stock.map(i=>[(i.item_id||'')+'|'+(i.sku||''),i]));
    const groups={'In stock':0,'Under 14 days':0,'Out of stock':0,'No inventory record':0,'Inventory quantity unavailable':0};
    for(const r of v.items){let i=lookup.get(r.item_id+'|'+(r.sku||''));if(ch==='amazon')i=stock.find(i=>i.item_id===r.item_id);groups[i?.status||'No inventory record']+=Number(r.sales||0);}
    return `<article class="panel ${ch}"><h3>${c.name} stock</h3><p class="period">Observed ${c.inventory.date?date(c.inventory.date):'date unavailable'}${c.inventory.age_days!=null?' · '+c.inventory.age_days+' day'+(c.inventory.age_days===1?'':'s')+' old':''}</p>${c.inventory.age_days>7?'<p class="alert">This inventory snapshot is more than seven days old.</p>':''}<div class="metrics"><div class="metric"><div class="label">Observed available units</div><div class="metric-value">${num(c.inventory.available)}</div></div><div class="metric"><div class="label">Inbound units</div><div class="metric-value">${num(c.inventory.inbound)}</div></div></div>${c.inventory.items_with_unknown_available?`<p class="period">${num(c.inventory.items_with_unknown_available)} item quantities are unavailable and excluded from the observed available total.</p>`:''}<table><thead><tr><th>Current stock status</th><th>Sales in selected period</th><th>Sales share</th></tr></thead><tbody>${Object.entries(groups).map(([k,x])=>`<tr><td>${k}</td><td>${money(v.complete_sales?x:null)}</td><td>${pct(v.complete_sales&&v.sales>0?x/v.sales:null)}</td></tr>`).join('')}</tbody></table></article>`;
  }).join('');
}
function trends(){
  const key=$('measure').value;
  $('trend-note').textContent=mode==='week'?'This year · gaps remain blank':'Solid: this year · outline: same dates last year · gaps remain blank';
  $('trends').innerHTML=['amazon','walmart'].map(ch=>{
    const c=D.channels[ch],rows=c.weekly,ly=mode!=='week';
    const nativeBasis=key==='ad_sales'&&ly?[...new Set(rows.filter(r=>r.ad_sales_ly!=null&&!r.paid_sales_basis_comparable_ly).map(r=>r.ads_attribution_label_ly))]:[];
    const values=rows.flatMap(r=>[r[key],...(ly?[r[key+'_ly']]:[])]).filter(v=>v!=null);
    const max=Math.max(1,...values),color=ch==='amazon'?'#3BC6FF':'#C4E163';
    const bars=rows.map((r,i)=>{
      const x=20+i*67,a=r[key],b=r[key+'_ly'],h=a==null?0:Number(a)/max*125,j=b==null?0:Number(b)/max*125;
      return `<g><title>${E(date(r.end))}: ${E(format(key,a))}${ly?' · LY '+E(format(key,b)):''}</title>${a==null?`<text x="${x+10}" y="157">—</text>`:`<rect x="${x}" y="${155-h}" width="22" height="${Math.max(.8,h)}" fill="${color}"/>`}${ly?(b==null?`<text x="${x+29}" y="157">—</text>`:`<rect x="${x+26}" y="${155-j}" width="22" height="${Math.max(.8,j)}" fill="none" stroke="${color}"/>`):''}<text x="${x}" y="176">${r.end.slice(5)}</text><text x="${x}" y="194">${a==null?'N/A':key==='selling_instock'?pct(a):key==='sales'||key==='spend'||key==='ad_sales'?'$'+Math.round(a/1000)+'k':num(a)}</text></g>`;
    }).join('');
    return `<article class="panel ${ch}"><h3>${c.name}</h3><svg class="trend" viewBox="0 0 565 210" role="img" aria-label="${E(c.name+' eight-week '+$('measure').selectedOptions[0].text)}"><line x1="12" y1="155" x2="555" y2="155" stroke="#4a4a55"/>${bars}</svg>${nativeBasis.length?`<p class="period">Last-year paid sales: ${E(nativeBasis.join('; '))}. Source attribution differs from this year.</p>`:''}<details><summary>View exact weekly values</summary><table><thead><tr><th>Week ending</th><th>This year</th>${ly?'<th>Last year</th>':''}</tr></thead><tbody>${rows.map(r=>`<tr><td>${date(r.end)}</td><td>${format(key,r[key])}${key==='selling_instock'?'<small>'+E(inventoryNote(r))+'</small>':''}</td>${ly?`<td>${format(key,r[key+'_ly'])}${key==='selling_instock'?'<small>'+E(inventoryNote({inventory_snapshot_date:r.inventory_snapshot_date_ly,selling_items:r.selling_items_ly,inventory_observed_selling_items:r.inventory_observed_selling_items_ly}))+'</small>':''}</td>`:''}</tr>`).join('')}</tbody></table></details></article>`;
  }).join('');
}
function board(){
  const q=$('search').value.toLowerCase(),ch=$('market').value,status=$('stock').value;
  const rows=D.items.filter(i=>(ch==='all'||i.marketplace===ch)&&(status==='all'||i.status===status)&&[i.title,i.brand,i.item_id,i.sku].join(' ').toLowerCase().includes(q));
  const visible=boardAll?rows:rows.slice(0,50);
  $('board').innerHTML=`<table><thead><tr><th>Item / identifiers</th><th>Marketplace</th><th aria-sort="descending">4-week sales ↓</th><th>4-week units</th><th>Available</th><th>Inbound</th><th>Days cover</th><th>Stock status</th><th>Snapshot</th></tr></thead><tbody>${visible.map(i=>`<tr><td>${E(i.title)}<small>${E(i.brand)} · ${E(i.item_id)}${i.sku?' · '+E(i.sku):''}</small></td><td>${E(D.channels[i.marketplace].name)}</td><td>${money(i.sales_4w)}</td><td>${num(i.units_4w)}</td><td>${num(i.available)}</td><td>${num(i.inbound)}</td><td>${num(i.days_cover)}</td><td class="stock-tag ${i.status==='Out of stock'?'bad':i.status==='In stock'?'good':''}">${E(i.status)}</td><td>${i.snapshot_date?E(date(i.snapshot_date)):'—'}</td></tr>`).join('')}</tbody></table>`;
  $('count').textContent=visible.length+' of '+rows.length+' matching marketplace item rows · PDF export includes the complete board.';
  $('board-more').hidden=rows.length<=50;$('board-more').textContent=boardAll?'Show first 50':'Show all '+rows.length;
}
function render(){summary();brands();inventory();trends();board();$('pdf').href='/dashboard/epic-drops/export.pdf?end='+D.cycle_end+'&mode='+mode;}
async function load(end=''){
  $('status').textContent='Loading ATLAS data…';
  try{
    const res=await fetch('/dashboard/epic-drops/data'+(end?'?end='+end:''),{credentials:'same-origin'});
    if(res.status===401){location.assign('/login');return;}
    if(!res.ok)throw Error((await res.json()).detail||'The ATLAS feed is unavailable.');
    D=await res.json();$('freshness').textContent='Cycle ending '+date(D.cycle_end);$('source-note').textContent=D.source_note;
    if(!$('cycle').options.length){const stop=new Date(D.cycle_end+'T12:00:00');for(let i=0;i<8;i++){const d=new Date(stop);d.setDate(d.getDate()-i*7);const s=d.toISOString().slice(0,10);$('cycle').add(new Option(date(s),s));}}
    $('cycle').value=D.cycle_end;$('uploads').hidden=!D.can_upload;$('logout').elements.csrf.value=D.csrf;
    $('status').textContent='Connected to ATLAS · '+date(D.today);$('content').hidden=false;render();
  }catch(e){$('status').textContent=e.message;$('content').hidden=true;}
}
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;document.querySelectorAll('[data-mode]').forEach(x=>x.setAttribute('aria-pressed',x===b));render();});
$('cycle').onchange=()=>load($('cycle').value);$('measure').onchange=trends;
for(const id of ['market','stock','search'])$(id).addEventListener(id==='search'?'input':'change',()=>{boardAll=false;board();});
$('board-more').onclick=()=>{boardAll=!boardAll;board();};
const form=$('upload-form');
function invalidate(){preview=null;$('confirm-upload').disabled=true;}
form.addEventListener('input',invalidate);form.addEventListener('change',()=>{invalidate();$('seller-fields').hidden=!form.elements.kind.value.startsWith('walmart');});
$('uploads').onclick=()=>{const end=D.cycle_end,start=new Date(end+'T12:00:00');start.setDate(start.getDate()-6);form.elements.start.value=start.toISOString().slice(0,10);form.elements.end.value=end;form.elements.seller_id.value=D.seller_id||'';$('upload-dialog').showModal();};
$('close-upload').onclick=()=>$('upload-dialog').close();
function pack(){const fields=Object.fromEntries(new FormData(form));const meta={};for(const k of ['kind','start','end','period','captured','evidence','seller_id'])meta[k]=fields[k];meta.captured=new Date(fields.captured).toISOString();meta.identity_confirmed=form.elements.identity_confirmed.checked;const fd=new FormData();fd.set('file',form.elements.file.files[0]);fd.set('metadata',JSON.stringify(meta));if(preview)fd.set('token',preview);return fd;}
async function upload(action){
  if(busy||!form.reportValidity())return;busy=true;$('confirm-upload').disabled=true;$('preview').textContent=action==='preview'?'Checking report…':'Saving report…';
  try{const r=await fetch('/dashboard/epic-drops/upload/'+action,{method:'POST',headers:{'X-CSRF-Token':D.csrf},body:pack()});const j=await r.json();if(!r.ok)throw Error(j.detail||j.error?.message||'Report could not be accepted.');
    if(action==='preview'){preview=j.token;$('preview').textContent='Preview only — nothing saved.\n'+j.rows+' rows · '+j.from+' to '+j.to+'\nSource time: '+new Date(j.source_downloaded_at).toLocaleString()+'\n\nSample items:\n'+j.sample.map(r=>{const m=r.metrics||r;return [r.title||r.product_name||r.extra?.title,r.item_id||r.asin,r.sku,m.sales!=null?'Sales '+money(m.sales):m.gmv!=null?'Sales '+money(m.gmv):'',m.available!=null?'Available '+num(m.available):''].filter(Boolean).join(' · ');}).join('\n');$('confirm-upload').disabled=false;}
    else{invalidate();$('preview').textContent='Report accepted. '+(j.duplicate?'This source was already stored.':num(j.rows_written??j.rows??0)+' rows saved.')+(j.rows_preserved?' '+num(j.rows_preserved)+' older rows retained without replacing fresher data.':'')+(j.rows_held?' '+num(j.rows_held)+' conflicting inventory rows held for review.':'');await load(D.cycle_end);}
  }catch(e){invalidate();$('preview').textContent=e.message;}finally{busy=false;}
}
form.onsubmit=e=>{e.preventDefault();upload('preview');};$('confirm-upload').onclick=()=>upload('confirm');
load();
