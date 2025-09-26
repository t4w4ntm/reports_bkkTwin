/* Admin Reports — enhanced UI & moderation logic (with Resolved) */

// ---- State ----
let allReports = [];        // raw firestore docs
let filtered = [];          // after search/filter/sort
let selected = new Set();   // selected row ids
let currentDetail = null;   // currently opened report (doc data + id)

// ---- Utils ----
const $  = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

const fmtDate = (ts) => {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
};

const timeAgo = (ts) => {
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60)   return `${Math.floor(diff)}s ago`;
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
    if (diff < 86400)return `${Math.floor(diff/3600)}h ago`;
    return d.toLocaleDateString('th-TH');
  } catch { return '—'; }
};

const pillClass = (status) => {
  switch((status||'pending').toLowerCase()){
    case 'verified': return 'pill pill-verified';
    case 'rejected': return 'pill pill-rejected';
    case 'resolved': return 'pill pill-resolved';
    default: return 'pill pill-pending';
  }
};
const pillText = (status) => (status||'pending').charAt(0).toUpperCase() + (status||'pending').slice(1);

let toastTimer;
function toast(msg='Saved', ms=1600){
  const t = $('#toast'), tx = $('#toastText');
  tx.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.classList.add('hidden'), ms);
}

// ---- Fetch ----
async function loadReports(){
  const btn = $('#btn-refresh');
  btn.disabled = true; btn.classList.add('opacity-50', 'cursor-wait');
  try {
    const snap = await db.collection('reports').orderBy('createdAt', 'desc').get();
    allReports = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e){
    console.error(e);
    toast('Load failed');
  } finally {
    btn.disabled = false; btn.classList.remove('opacity-50', 'cursor-wait');
  }
  applyFilters();
}

// ---- Render ----
function renderTable(){
  const tbody = $('#tableBody');
  tbody.innerHTML = '';
  for (const r of filtered){
    const status = (r.status || 'pending').toLowerCase();
    const title = r.title || r.reportTitle || 'Untitled';
    const desc = r.description || r.details || '';
    const img = r.imageUrl || r.photoURL || r.image || '';
    const lat = r.lat ?? r.latitude ?? (r.location && r.location.lat);
    const lng = r.lng ?? r.longitude ?? (r.location && r.location.lng);
    const reporter = r.name || r.reporter || r.contactName || '';
    const createdAt = r.createdAt || r.created_at || r.timestamp;

    const tr = document.createElement('tr');
    tr.className = 'hover:bg-white/5';
    tr.innerHTML = `
      <td class="px-4 py-3 align-top">
        <input type="checkbox" class="rowcheck w-4 h-4" data-id="${r.id}" ${selected.has(r.id)?'checked':''} aria-label="Select row">
      </td>
      <td class="px-4 py-3">
        <div class="flex gap-3">
          <img src="${img || ''}" alt="" class="w-14 h-14 rounded-lg object-cover ring-1 ring-white/10 bg-white/5" onerror="this.style.display='none'"/>
          <div>
            <div class="font-semibold clamp-1">${escapeHtml(title)}</div>
            <div class="text-xs text-slate-300/85 clamp-2">${escapeHtml(desc)}</div>
            <div class="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
              ${reporter ? `<span>by ${escapeHtml(reporter)}</span>` : ''}
            </div>
          </div>
        </div>
      </td>
      <td class="px-4 py-3">
        <div class="text-xs">
          ${lat!=null && lng!=null ? `<div class="font-medium">${toFix(lat)}, ${toFix(lng)}</div>` : '—'}
          <div class="mt-1 flex gap-2">
            ${lat!=null && lng!=null ? `<a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank" rel="noopener" class="underline/30 hover:underline text-sky-300">Open map</a>` : ''}
            ${lat!=null && lng!=null ? `<button class="copyLoc underline/30 hover:underline text-slate-300" data-lat="${lat}" data-lng="${lng}">Copy</button>` : ''}
          </div>
        </div>
      </td>
      <td class="px-4 py-3"><span class="${pillClass(status)}">${pillText(status)}</span></td>
      <td class="px-4 py-3 text-xs">${fmtDate(createdAt)}<div class="text-[11px] text-slate-400">${timeAgo(createdAt)}</div></td>
      <td class="px-4 py-3">
        <div class="flex flex-nowrap gap-1">
          <button class="btn-view inline-flex items-center gap-1 rounded-lg bg-white/10 hover:bg-white/15 px-2 py-1 text-xs ring-1 ring-white/10 whitespace-nowrap" data-id="${r.id}">View</button>
          ${status==='verified' ? 
            `<button class="btn-resolve inline-flex items-center gap-1 rounded-lg bg-sky-500/90 hover:bg-sky-500 px-2 py-1 text-xs whitespace-nowrap" data-id="${r.id}">Resolve</button>` :
            `<button class="btn-approve inline-flex items-center gap-1 rounded-lg bg-emerald-500/90 hover:bg-emerald-500 px-2 py-1 text-xs whitespace-nowrap" data-id="${r.id}">Approve</button>`
          }
          <button class="btn-reject inline-flex items-center gap-1 rounded-lg bg-rose-500/90 hover:bg-rose-500 px-2 py-1 text-xs whitespace-nowrap" data-id="${r.id}">Reject</button>
          <button class="btn-delete inline-flex items-center gap-1 rounded-lg bg-white/10 hover:bg-white/15 px-2 py-1 text-xs ring-1 ring-white/10 whitespace-nowrap" data-id="${r.id}">Delete</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  }
  $('#resultCount').textContent = `${filtered.length} result${filtered.length===1?'':'s'}`;
  bindRowEvents();
}

function bindRowEvents(){
  // select rows
  $$('.rowcheck').forEach(cb => cb.addEventListener('change', (e)=>{
    const id = e.target.dataset.id;
    if (e.target.checked) selected.add(id); else selected.delete(id);
    updateBulkState();
  }));
  // copy location
  $$('.copyLoc').forEach(btn => btn.addEventListener('click', async (e)=>{
    const {lat, lng} = e.target.dataset;
    try { await navigator.clipboard.writeText(`${lat},${lng}`); toast('Copied location'); } catch {}
  }));
  // view
  $$('.btn-view').forEach(btn => btn.addEventListener('click', ()=> openDetail(btn.dataset.id)));
  // approve/reject/resolve/delete
  $$('.btn-approve').forEach(b => b.addEventListener('click', ()=> updateStatus(b.dataset.id, 'verified')));
  $$('.btn-reject').forEach(b  => b.addEventListener('click', ()=> updateStatus(b.dataset.id, 'rejected')));
  $$('.btn-resolve').forEach(b => b.addEventListener('click', ()=> updateStatus(b.dataset.id, 'resolved')));
  $$('.btn-delete').forEach(b  => b.addEventListener('click', ()=> deleteReport(b.dataset.id)));
}

function updateBulkState(){
  const any = selected.size > 0;
  $('#bulkVerify').disabled = !any;
  $('#bulkReject').disabled = !any;
  const sc = $('#selectionCount');
  if (any){ sc.textContent = `${selected.size} selected`; sc.classList.remove('hidden'); }
  else { sc.classList.add('hidden'); }
  const allCb = $('#selectAll');
  const visibleIds = $$('.rowcheck').map(cb => cb.dataset.id);
  allCb.checked = visibleIds.length>0 && visibleIds.every(id => selected.has(id));
}

// ---- Filtering & sorting ----
function applyFilters(){
  const q = ($('#searchInput').value||'').trim().toLowerCase();
  const status = $('.filter-chip.active')?.dataset.status || 'all';
  const sort = $('#sortSelect').value;

  filtered = allReports.filter(r => {
    const st = (r.status || 'pending').toLowerCase();
    const okStatus = (status==='all') ? true : (st === status);
    if (!okStatus) return false;
    if (!q) return true;
    const hay = [
      r.title, r.reportTitle, r.description, r.details,
      r.name, r.reporter, r.contactName, r.locationName, r.category
    ].map(x=> (x||'').toString().toLowerCase()).join(' | ');
    return hay.includes(q);
  });

  const [key, dir] = sort.split('-');
  filtered.sort((a,b)=>{
    const av = (key==='status') ? (a.status||'pending') : (a.createdAt?.toMillis?.() ?? 0);
    const bv = (key==='status') ? (b.status||'pending') : (b.createdAt?.toMillis?.() ?? 0);
    return dir==='asc' ? (av>bv?1:-1) : (av<bv?1:-1);
  });

  // clear selection of items not in view
  for (const id of Array.from(selected)){
    if (!filtered.some(r=>r.id===id)) selected.delete(id);
  }

  renderTable();
  updateBulkState();
}

// ---- Detail modal ----
function openDetail(id){
  const r = allReports.find(x=>x.id===id); if (!r) return;
  currentDetail = r;

  const title = r.title || r.reportTitle || 'Untitled';
  const desc = r.description || r.details || '';
  const img = r.imageUrl || r.photoURL || r.image || '';
  const lat = r.lat ?? r.latitude ?? (r.location && r.location.lat);
  const lng = r.lng ?? r.longitude ?? (r.location && r.location.lng);
  const createdAt = r.createdAt || r.created_at || r.timestamp;

  $('#modalTitle').textContent = title;
  $('#modalDesc').textContent = desc || '—';
  const im = $('#modalImage');
  if (img) { im.src = img; im.style.display='block'; } else { im.src=''; im.style.display='none'; }
  $('#modalCreatedAt').textContent = fmtDate(createdAt) || '—';

  if (lat!=null && lng!=null){
    $('#modalLocation').textContent = `${lat}, ${lng}`;
    $('#modalMap').src = `https://www.google.com/maps?q=${lat},${lng}&z=16&output=embed`;
  } else {
    $('#modalLocation').textContent = '—';
    $('#modalMap').src = '';
  }

  // show resolve only when verified
  const mr = $('#modalResolve');
  if (mr){
    if ((r.status||'pending').toLowerCase()==='verified') {
      mr.style.display='inline-flex';
    } else {
      mr.style.display='none';
    }
  }
  $('#detailModal').classList.remove('hidden');
}
function closeDetail(){
  $('#detailModal').classList.add('hidden');
  currentDetail = null;
}
$('#closeModal').addEventListener('click', closeDetail);
$('#detailModal').addEventListener('click', (e)=>{ if (e.target.id === 'detailModal') closeDetail(); });
$('#modalApprove').addEventListener('click', ()=> currentDetail && updateStatus(currentDetail.id, 'verified', true));
$('#modalReject').addEventListener('click',  ()=> currentDetail && updateStatus(currentDetail.id, 'rejected', true));
$('#modalResolve').addEventListener('click', ()=> currentDetail && updateStatus(currentDetail.id, 'resolved', true));

// ---- Actions ----
async function updateStatus(id, status, fromModal=false){
  try {
    await db.collection('reports').doc(id).update({
      status,
      [`${status}At`]: firebase.firestore.FieldValue.serverTimestamp()
    });
    const i = allReports.findIndex(x=>x.id===id);
    if (i>=0){ allReports[i].status = status; }
    toast(status==='verified' ? 'Approved' : status==='resolved' ? 'Resolved' : 'Rejected');
    if (fromModal) closeDetail();
    applyFilters();
  } catch (e){
    console.error(e);
    toast('Update failed');
  }
}

async function deleteReport(id){
  if (!confirm('Delete this report?')) return;
  try {
    await db.collection('reports').doc(id).delete();
    allReports = allReports.filter(x=>x.id!==id);
    selected.delete(id);
    toast('Deleted');
    applyFilters();
  } catch (e){
    console.error(e);
    toast('Delete failed');
  }
}

// Bulk actions
$('#bulkVerify').addEventListener('click', async ()=>{
  if (selected.size===0) return;
  const ids = Array.from(selected);
  const batch = db.batch();
  ids.forEach(id => batch.update(db.collection('reports').doc(id), {
    status: 'verified',
    verifiedAt: firebase.firestore.FieldValue.serverTimestamp()
  }));
  try {
    await batch.commit();
    for (const id of ids){ const r = allReports.find(x=>x.id===id); if (r) r.status='verified'; }
    toast('Approved selected');
    selected.clear();
    applyFilters();
  } catch(e){ console.error(e); toast('Bulk update failed'); }
});

$('#bulkReject').addEventListener('click', async ()=>{
  if (selected.size===0) return;
  const ids = Array.from(selected);
  const batch = db.batch();
  ids.forEach(id => batch.update(db.collection('reports').doc(id), {
    status: 'rejected',
    rejectedAt: firebase.firestore.FieldValue.serverTimestamp()
  }));
  try {
    await batch.commit();
    for (const id of ids){ const r = allReports.find(x=>x.id===id); if (r) r.status='rejected'; }
    toast('Rejected selected');
    selected.clear();
    applyFilters();
  } catch(e){ console.error(e); toast('Bulk update failed'); }
});

// Header select all
$('#selectAll').addEventListener('change', (e)=>{
  const ids = $$('.rowcheck').map(cb => cb.dataset.id);
  if (e.target.checked){ ids.forEach(id => selected.add(id)); }
  else { ids.forEach(id => selected.delete(id)); }
  renderTable();
  updateBulkState();
});

// Search / filter / sort
$('#searchInput').addEventListener('input', (e)=>{
  $('#clearSearch').classList.toggle('hidden', e.target.value.trim()==='');
  applyFilters();
});
$('#clearSearch').addEventListener('click', ()=>{
  $('#searchInput').value=''; $('#clearSearch').classList.add('hidden'); applyFilters();
});
$$('.filter-chip').forEach(chip => chip.addEventListener('click', ()=>{
  $$('.filter-chip').forEach(c=>c.classList.remove('active','bg-white/20'));
  chip.classList.add('active','bg-white/20');
  applyFilters();
}));
$('#sortSelect').addEventListener('change', applyFilters);
$('#btn-refresh').addEventListener('click', loadReports);

// Helpers
function escapeHtml(str){
  return (str??'').toString().replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function toFix(v){ return (typeof v === 'number' && v.toFixed) ? v.toFixed(6) : v; }

// Init
window.addEventListener('DOMContentLoaded', () => { loadReports(); });
