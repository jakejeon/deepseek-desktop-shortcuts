(function() {
if (document.getElementById('ds-fab')) return;

var presets = [];
var selectedIdx = -1;

var style = document.createElement('style');
style.textContent = [
  '#ds-fab{position:fixed;top:8px;right:56px;z-index:99999;width:32px;height:32px;border-radius:6px;border:none;background:#4f6ef7;color:#fff;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.2);opacity:0.85;transition:opacity 0.15s}',
  '#ds-fab:hover{opacity:1}',
  '#ds-overlay{position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,0.35);display:none;align-items:center;justify-content:center}',
  '#ds-overlay.open{display:flex}',
  '#ds-modal{background:#1e1e1e;border-radius:10px;width:520px;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 8px 32px rgba(0,0,0,0.5);color:#e0e0e0;font:13px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
  '#ds-modal .ds-header{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid #333}',
  '#ds-modal .ds-header h3{margin:0;font-size:14px;font-weight:600;color:#e0e0e0}',
  '#ds-modal .ds-close{background:none;border:none;font-size:18px;cursor:pointer;color:#888;padding:0 4px}',
  '#ds-modal .ds-close:hover{color:#fff}',
  '#ds-modal .ds-body{padding:12px 16px;overflow-y:auto;flex:1}',
  '#ds-preset-list{list-style:none;margin:0 0 12px 0;padding:0;max-height:200px;overflow-y:auto;border:1px solid #333;border-radius:6px}',
  '#ds-preset-list li{padding:8px 12px;cursor:pointer;display:flex;align-items:center;gap:4px;border-bottom:1px solid #2a2a2a;transition:background 0.1s;color:#ccc}',
  '#ds-preset-list li:last-child{border-bottom:none}',
  '#ds-preset-list li:hover{background:#2a2a2a}',
  '#ds-preset-list li.selected{background:#2d3258}',
  '#ds-preset-list .ds-num{width:20px;height:20px;border-radius:4px;background:#333;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:#999;flex-shrink:0}',
  '#ds-preset-list li.selected .ds-num{background:#4f6ef7;color:#fff}',
  '#ds-preset-list .ds-name{flex:1;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#ccc}',
  '#ds-preset-list li.selected .ds-name{color:#fff}',
  '#ds-preset-list .ds-preview{color:#666;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:130px}',
  '#ds-preset-list .ds-arrow{background:none;border:none;cursor:pointer;font-size:10px;padding:2px 4px;color:#555;border-radius:3px;flex-shrink:0}',
  '#ds-preset-list .ds-arrow:hover{background:#444;color:#ccc}',
  '#ds-preset-list .ds-arrow:disabled{opacity:0.2;cursor:default}',
  '#ds-preset-list .ds-arrow:disabled:hover{background:none}',
  '#ds-modal .ds-label{font-size:11px;font-weight:600;color:#999;margin-bottom:4px}',
  '#ds-modal input,#ds-modal textarea{width:100%;box-sizing:border-box;border:1px solid #444;border-radius:6px;padding:7px 10px;font:13px/1.5 inherit;outline:none;margin-bottom:8px;background:#2a2a2a;color:#e0e0e0}',
  '#ds-modal input:focus,#ds-modal textarea:focus{border-color:#4f6ef7}',
  '#ds-modal textarea{resize:vertical;min-height:60px}',
  '#ds-modal .ds-actions{display:flex;gap:6px;flex-wrap:wrap}',
  '#ds-modal .ds-actions button{padding:6px 14px;border-radius:6px;border:1px solid #444;background:#2a2a2a;cursor:pointer;font-size:12px;font-weight:500;color:#e0e0e0}',
  '#ds-modal .ds-actions button:hover{background:#3a3a3a}',
  '#ds-modal .ds-actions .ds-btn-primary{background:#4f6ef7;color:#fff;border-color:#4f6ef7}',
  '#ds-modal .ds-actions .ds-btn-primary:hover{background:#3d5ce0}',
  '#ds-modal .ds-actions .ds-btn-danger{color:#e54545;border-color:#e54545}',
  '#ds-modal .ds-actions .ds-btn-danger:hover{background:#3a2020}',
  '.ds-empty{color:#999;text-align:center;padding:24px 0;font-size:12px}'
].join(' ');
document.head.appendChild(style);

var fab = document.createElement('button');
fab.id = 'ds-fab';
fab.textContent = '\u2699';
fab.title = 'Open Presets';
document.body.appendChild(fab);

var overlay = document.createElement('div');
overlay.id = 'ds-overlay';
overlay.innerHTML = '<div id="ds-modal"><div class="ds-header"><h3>Prompt Presets</h3><button class="ds-close">\u2715</button></div><div class="ds-body"><div class="ds-label">Select Preset</div><ul id="ds-preset-list"></ul><div class="ds-label">Content <span style="color:#999;font-weight:400;">(use {clipboard} for clipboard)</span></div><textarea id="ds-content" placeholder="Preset content with {clipboard}..."></textarea><div class="ds-label">Name</div><input id="ds-name" placeholder="Preset name"><div class="ds-actions"><button id="ds-apply" class="ds-btn-primary">Apply</button><button id="ds-update">Update</button><button id="ds-save-new">Save As New</button><button id="ds-delete" class="ds-btn-danger">Delete</button></div></div></div>';
document.body.appendChild(overlay);

var modal = overlay.querySelector('#ds-modal');
var listEl = overlay.querySelector('#ds-preset-list');
var nameInput = overlay.querySelector('#ds-name');
var contentInput = overlay.querySelector('#ds-content');
var applyBtn = overlay.querySelector('#ds-apply');
var updateBtn = overlay.querySelector('#ds-update');
var saveNewBtn = overlay.querySelector('#ds-save-new');
var deleteBtn = overlay.querySelector('#ds-delete');
var closeBtn = overlay.querySelector('.ds-close');

function escapeHtml(s) {
  var d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function renderList() {
  listEl.innerHTML = '';
  if (presets.length === 0) {
    listEl.innerHTML = '<li class="ds-empty">No presets yet. Create one below.</li>';
    return;
  }
  presets.forEach(function(p, i) {
    var li = document.createElement('li');
    li.dataset.idx = i;
    if (i === selectedIdx) li.classList.add('selected');
    var num = i < 9 ? i + 1 : '\u2022';
    var upBtn = '<button class="ds-arrow" data-move="up" data-idx="' + i + '" ' + (i === 0 ? 'disabled' : '') + '>\u25B2</button>';
    var downBtn = '<button class="ds-arrow" data-move="down" data-idx="' + i + '" ' + (i === presets.length - 1 ? 'disabled' : '') + '>\u25BC</button>';
    li.innerHTML = '<span class="ds-num">' + num + '</span><span class="ds-name">' + escapeHtml(p.name) + '</span><span class="ds-preview">' + escapeHtml(p.content.replace('{clipboard}', '\ud83d\udccb')) + '</span>' + upBtn + downBtn;
    li.querySelector('.ds-name').addEventListener('click', function() { selectPreset(i); });
    var upBtnEl = li.querySelector('.ds-arrow[data-move="up"]');
    var downBtnEl = li.querySelector('.ds-arrow[data-move="down"]');
    if (upBtnEl) upBtnEl.addEventListener('click', function(e) { e.stopPropagation(); movePreset(i, -1); });
    if (downBtnEl) downBtnEl.addEventListener('click', function(e) { e.stopPropagation(); movePreset(i, 1); });
    listEl.appendChild(li);
  });
}

function selectPreset(idx) {
  selectedIdx = idx;
  if (idx >= 0 && idx < presets.length) {
    nameInput.value = presets[idx].name;
    contentInput.value = presets[idx].content;
  }
  renderList();
}

async function movePreset(idx, dir) {
  var newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= presets.length) return;
  var tmp = presets[idx];
  presets[idx] = presets[newIdx];
  presets[newIdx] = tmp;
  selectedIdx = newIdx;
  await window.electronAPI.savePresets(presets);
  renderList();
  selectPreset(selectedIdx);
}

async function applyPreset() {
  if (selectedIdx < 0 || selectedIdx >= presets.length) return;
  var preset = presets[selectedIdx];
  var clip = await window.electronAPI.readClipboard();
  var text = preset.content.replace(/{clipboard}/g, clip);
  await window.electronAPI.writeClipboard(text);
  overlay.classList.remove('open');
}

async function loadPresetsFromDisk() {
  presets = await window.electronAPI.loadPresets();
  selectedIdx = -1;
  nameInput.value = '';
  contentInput.value = '';
  renderList();
}

async function updateCurrentPreset() {
  var name = nameInput.value.trim();
  var content = contentInput.value.trim();
  if (!name || !content || selectedIdx < 0 || selectedIdx >= presets.length) return;
  presets[selectedIdx] = { name: name, content: content };
  await window.electronAPI.savePresets(presets);
  renderList();
  selectPreset(selectedIdx);
}

async function saveAsNewPreset() {
  var name = nameInput.value.trim();
  var content = contentInput.value.trim();
  if (!name || !content) return;
  presets.push({ name: name, content: content });
  selectedIdx = presets.length - 1;
  await window.electronAPI.savePresets(presets);
  renderList();
  selectPreset(selectedIdx);
  nameInput.value = '';
  contentInput.value = '';
}

async function deleteCurrentPreset() {
  if (selectedIdx < 0 || selectedIdx >= presets.length) return;
  presets.splice(selectedIdx, 1);
  selectedIdx = presets.length > 0 ? Math.min(selectedIdx, presets.length - 1) : -1;
  await window.electronAPI.savePresets(presets);
  renderList();
  if (selectedIdx >= 0) selectPreset(selectedIdx);
  else { nameInput.value = ''; contentInput.value = ''; }
}

fab.addEventListener('click', function() {
  loadPresetsFromDisk();
  overlay.classList.add('open');
});

closeBtn.addEventListener('click', function() { overlay.classList.remove('open'); });
overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.classList.remove('open'); });
applyBtn.addEventListener('click', applyPreset);
updateBtn.addEventListener('click', updateCurrentPreset);
saveNewBtn.addEventListener('click', saveAsNewPreset);
deleteBtn.addEventListener('click', deleteCurrentPreset);

document.addEventListener('keydown', function(e) {
  if (!overlay.classList.contains('open')) return;
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (e.key === 'Escape') { overlay.classList.remove('open'); return; }
  var num = parseInt(e.key);
  if (num >= 1 && num <= 9 && num <= presets.length) selectPreset(num - 1);
});
})();
