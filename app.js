import { regulationExplanation } from './lib/regulation-explanations.mjs';
import { fieldIssues, alcoholDisplayProof, ageingStartExplanation } from './lib/field-integrity.mjs';
import { displayName, buildCandidates, findCandidates, searchAppellations, upsertFilter, regionBelongs, evaluateWine } from './lib/search.mjs';
import { ratioBasis, evaluateGrapeUse, grapeDutyProof, grapeUsePermissionProved } from './lib/blend.mjs';

const words = {
  ja: { back: '戻る', home: 'ホーム', title: '産地から、品種から。', intro: '公式規定を手がかりに、ワインの呼称と使える品種を探索します。', search: '呼称・地域・品種・条件を探す', country: '国', region: '地域', appellation: '呼称', designation: '地理的名称', grape: '品種', gi: 'EU区分', traditional: '伝統的呼称', type: 'ワインのタイプ', qualifier: '公式の追加表示', countries: '国から探す', regions: '地域から探す', mainRegions: '公開済みの産地', appellations: 'この地域の呼称', include: '含む', exclude: '除外', add: '条件に追加', addExclude: '除外して追加', explore: '探索する', remove: '削除', close: '閉じる', recent: '最近見た', about: 'このアプリについて / Data & Sources', results: '件の呼称', unknown: '規定情報が不足して判定できない対象があります。', noResults: 'すべての条件に一致する呼称がありません。条件を一つ外して、探索を続けられます。', noCandidates: '一致する候補がありません。別の名称や公式原語で検索できます。', noRecent: 'まだ閲覧した呼称はありません。', noData: 'この公開版には掲載済みの呼称がありません。', original: '公式原語', parent: '所属する呼称', geoNames: 'この呼称の地理的名称', matched: '今回の条件に一致', composition: '使えるブドウ品種', alcohol: 'アルコール規定', ageing: '熟成規定', sensory: '公式の色・香り・味わい', production: '生産・栽培の詳細', area: '公式生産区域', sources: '出典 / Sources', sourceLink: '公式資料を開く', agency: '出典機関', retrieved: '取得日', verified: '検証日', published: '資料の更新・公開日', version: '公開データ版', raw: '公式原文', evidence: '出典・公式原文', minimum: '最低', maximum: '最大', total: '合計', permitted: '使えるブドウ品種', includeReason: 'この品種を使用する配合が公式規定上可能', excludeReason: 'この品種なしで公式規定を満たせる', excludeHelp: '品種の除外は、その品種を使わずに造れるタイプを探します。「含む」は使用可能を示し、必須とは限りません。除外・複合条件は同時に成立する根拠がある場合だけ一致します。', changed: '品種の除外条件を「含む」に変更しました。', confirmed: '確認済み', no_obligation: 'この義務がないことを公式に確認しています。', not_applicable: 'このワインには適用されません。', not_found: 'この項目はまだ確認できていません。規定がないことを意味しません。', unverified: 'この項目の確認が完了していません。', retry: '再読み込み', loadFailed: '公開データを読み込めませんでした。', regionSearch: 'この地域を条件に追加', detailInfo: '公式規定を Appellation Explorer が検索・参照用に整理した情報です。', allRules: 'その他の規定', header: '公式規定からワインを探索', sourcesEmpty: '参照できる出典情報がありません。', state: '確認状況', share: '条件をURLで共有できます。', regionContext: '地域の探索経路', aboutText: 'Appellation Explorerは、ワインの公式規定を検索・探索しやすく整理したサービスです。公的機関が運営・保証する公式サービスではありません。', aboutProcess: '公式ウェブページ・登録情報・生産規定等を取得し、項目の抽出、名称・比率・適用条件の整理、検証を行っています。表示名や翻訳と公式原文は区別して保持します。表示と公式資料に違いがある場合は、公式資料を確認してください。', aboutSearch: '品種の検索は規定上使えることを示し、販売中のボトルの配合や生産の実態を保証しません。根拠を確認できた比率や必須条件を詳細に示します。必須性が未確認でも、任意とは断定しません。条件はすべて同じワイン・同じ適用範囲・一つの配合で評価します。', aboutUpdate: '取得・検証・必要な人間判断を経て、明示的に承認された版だけを公開します。取得失敗や確認不足を「規定なし」に置き換えません。各呼称のSourcesから資料・取得日を確認できます。', noRegion: 'この階層に掲載済みの地域がありません。', recentHelp: '閲覧履歴はこの端末にだけ保存されます。', noTranslations: '確認済みの翻訳がない項目は公式原語を表示しています。' },
  en: { back: 'Back', home: 'Home', title: 'Start with a place. Follow a grape.', intro: 'Explore wine appellations and permitted grapes through official regulations.', search: 'Find appellations, regions, grapes or conditions', country: 'Country', region: 'Region', appellation: 'Appellation', designation: 'Geographic designation', grape: 'Grape', gi: 'EU category', traditional: 'Traditional term', type: 'Wine type', qualifier: 'Official additional term', countries: 'Explore by country', regions: 'Explore regions', mainRegions: 'Published wine regions', appellations: 'Appellations in this region', include: 'Include', exclude: 'Exclude', add: 'Add condition', addExclude: 'Exclude', explore: 'Explore', remove: 'Remove', close: 'Close', recent: 'Recently viewed', about: 'About / Data & Sources', results: 'appellations', unknown: 'Some appellations cannot be evaluated because regulation information is incomplete.', noResults: 'No appellation meets every condition. Remove a condition to continue exploring.', noCandidates: 'No matching suggestions. Try another name or an official original name.', noRecent: 'No appellations viewed yet.', noData: 'This data version contains no published appellations.', original: 'Official original name', parent: 'Appellation', geoNames: 'Geographic names within this appellation', matched: 'Matches your conditions', composition: 'Grape composition', alcohol: 'Alcohol requirements', ageing: 'Ageing requirements', sensory: 'Official colour, aroma and taste', production: 'Production and cultivation', area: 'Official production area', sources: 'Sources', sourceLink: 'Open official source', agency: 'Authority', retrieved: 'Retrieved', verified: 'Verified', published: 'Document update / publication', version: 'Published data version', raw: 'Official original text', evidence: 'Evidence and original text', minimum: 'Minimum', maximum: 'Maximum', total: 'Combined', permitted: 'Permitted grapes', includeReason: 'An officially permitted composition can use this grape', excludeReason: 'A compliant composition can omit this grape', excludeHelp: 'Excluding a grape finds wines that can be made without it. Include means permitted, not necessarily required. Exclusion and combined conditions match only when proved simultaneously possible.', changed: 'The grape condition has changed from exclude to include.', confirmed: 'Confirmed', no_obligation: 'Officially confirmed that this obligation does not apply.', not_applicable: 'Not applicable to this wine.', not_found: 'This requirement has not yet been confirmed. This does not establish that no requirement exists.', unverified: 'Verification of this item is incomplete.', retry: 'Reload', loadFailed: 'Unable to load the published data.', detailInfo: 'Official regulations organised by Appellation Explorer for search and reference.', allRules: 'Other requirements', header: 'Explore wine through official regulations', sourcesEmpty: 'No source information is available.', state: 'Verification', share: 'Share these conditions through the URL.', regionContext: 'Geographic exploration path', aboutText: 'Appellation Explorer organises official wine regulations for search and exploration. It is not an official service operated or endorsed by a public authority.', aboutProcess: 'We retrieve official web pages, registration records and product specifications, extract fields, organise names, ratios and applicability, and validate the results. Display names and translations are stored separately from the original text. If the display differs from an official document, consult the official document.', aboutSearch: 'Grape search describes what the regulations permit. It does not guarantee the composition of a bottle or actual production practice. Details show evidenced ratios and obligations. Unconfirmed mandatory use is not treated as optional. All conditions are evaluated for the same wine, scope and single composition.', aboutUpdate: 'A version is published only after retrieval, validation, any necessary human decisions and an explicit release. Retrieval failures and missing information never become “no requirement”. Each appellation’s Sources lists documents and retrieval dates.', noRegion: 'No published regions at this level.', recentHelp: 'Viewing history is stored only on this device.', noTranslations: 'Fields without verified translations use the official original language.' }
};

Object.assign(words.ja, { archiveDocument: 'アーカイブ内文書', documentHash: '文書の SHA-256', archiveHash: 'アーカイブの SHA-256', originalIdentity: '原本を識別する情報' });
Object.assign(words.en, { archiveDocument: 'Document in archive', documentHash: 'Document SHA-256', archiveHash: 'Archive SHA-256', originalIdentity: 'Identify the original document' });
Object.assign(words.ja, { conditionalChanges: '条件付きの変更', ageingLocation: '熟成場所', actDate: '法令の日付', commencement: '開始の基準', applicabilityUnknown: 'この条件の現在の適用状態は未確認です。公示日を基準とする条件を保持しています。', applicabilityActive: 'この条件が適用されることを確認しています。', applicabilityExpired: 'この条件の適用期間が終了したことを確認しています。' });
Object.assign(words.en, { conditionalChanges: 'Conditional amendments', ageingLocation: 'Ageing location', actDate: 'Act date', commencement: 'Commencement', applicabilityUnknown: 'Current applicability of this condition is unverified. Its publication-relative conditions are retained.', applicabilityActive: 'This condition is confirmed to apply.', applicabilityExpired: 'This condition is confirmed to have expired.' });

Object.assign(words.ja, { basis_vineyard: '畑の品種構成（植栽）', basis_grapes: '原料葡萄の構成', basis_must: '果汁・果醪の構成', basis_wine: '完成ワインの構成', basis_mixed: '複数の対象段階を含む規定', basis_unknown: '比率の対象段階は未確認', basisNotice: '畑・原料葡萄・果汁・完成ワインの比率は同じものではありません。この規定では、品種の使用可否を判定できない条件が残っています。', sourceUseNotice: '品種の使用可否は、規定されたブドウの由来から判定します。表示比率を完成ワインの配合へ換算していません。植栽上の必須性だけでは、その品種の使用が必須とは断定しません。', listedGrapes: '規定に記載された品種' });
Object.assign(words.en, { basis_vineyard: 'Vineyard variety composition (planting)', basis_grapes: 'Raw grape composition', basis_must: 'Must composition', basis_wine: 'Finished-wine composition', basis_mixed: 'Rules covering multiple production stages', basis_unknown: 'Ratio basis not yet verified', basisNotice: 'Vineyard, raw grape, must and finished-wine proportions are distinct. Some grape-use conditions remain unresolved under these rules.', sourceUseNotice: 'Grape-use permission follows the stated fruit sources. Displayed ratios are not converted into a finished-wine recipe. Required planting alone does not establish mandatory fruit use.', listedGrapes: 'Grapes listed in the regulation' });

Object.assign(words.ja, { addExclude: '除外条件に追加', changeExclude: '除外条件に変更', not_found: 'この項目はまだ確認できていません。規定がないことを意味しません。', unverified: '内容の確認が未完了です。', noCandidates: '収録範囲に一致する候補がありません。未収録の名称もあります。', missingTarget: 'この対象は現在の収録データに見つかりません。', invalidLink: '共有条件の一部が壊れているか、現在のデータでは対象不明です。条件を確認・削除してください。', reset: '条件をクリアしてやり直す', coverage: '収録範囲', moreCandidates: '候補をさらに表示', grapeSearch: 'この一覧から品種を探す', commonRules: '使えるブドウ品種', commonReference: '使えるブドウ品種・ボトルラベルの条件を見る', cultivation: '栽培・比率の根拠', totalAlcohol: '総アルコール度数', actualAlcohol: '実アルコール度数', naturalAlcohol: '天然アルコール度数', totalAgeing: '総熟成', wood: '木樽での熟成', bottle: '瓶内熟成', included_in_total: '総熟成期間の内数', varietalLabelling: 'ボトルラベルに品種名を記載する場合', unknownNames: '判定できない呼称', archiveDownload: '7zアーカイブをダウンロード', sourceDocument: '公式文書', rawOnly: '詳細は下の根拠・原文で確認できます。' });
Object.assign(words.en, { regionSearch: 'Add this region as a condition', changeExclude: 'Change to exclusion', addExclude: 'Add exclusion condition', not_found: 'This item has not been extracted. This does not mean there is no requirement.', missingTarget: 'This target is not present in the current dataset.', invalidLink: 'Some shared conditions are malformed or refer to unknown targets. Review or remove these conditions.', reset: 'Clear conditions and start again', coverage: 'Coverage', moreCandidates: 'Show more suggestions', grapeSearch: 'Find a grape in this list', commonRules: 'Grape rules shared by these types', commonReference: 'See the shared grape rules above', cultivation: 'Cultivation and ratio evidence', totalAlcohol: 'Total alcohol', actualAlcohol: 'Actual alcohol', naturalAlcohol: 'Natural alcohol', totalAgeing: 'Total ageing', wood: 'Wood ageing', bottle: 'Bottle ageing', included_in_total: 'Included in total ageing', varietalLabelling: 'Varietal label requirements', unknownNames: 'Unresolved appellations', archiveDownload: 'Download 7z archive', sourceDocument: 'Official document', rawOnly: 'Details are retained in the evidence and original text below.' });

const $ = id => document.getElementById(id);
const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const button = (text, action, attributes = '', className = '') => `<button type="button" data-action="${action}" class="${className}" ${attributes}>${escape(text)}</button>`;
const t = key => words[state.lang][key] ?? key;
let data;
let candidates = [];
let state = readURL();
let preferredLanguage = state.lang;
let candidateLimit = 12;
let candidatesHidden = false;
let menuFocusIndex = null;
let depth = history.state?.ae ? history.state.depth : 0;
let snapshot = history.state?.ae ? history.state.snapshot : null;
let overlay = history.state?.ae ? history.state.overlay : null;
let pendingAfterClose = null;
let scrollTimer;
let composingQuery = false;

function readURL() {
  const params = new URLSearchParams(location.hash.slice(1));
  let filters = [], invalidLink = false;
  try { filters = JSON.parse(params.get('f') || '[]'); } catch { invalidLink = true; }
  const rawFilters = filters;
  filters = Array.isArray(filters) ? filters.filter(item => ['country', 'region', 'grape', 'gi', 'traditional', 'type', 'qualifier'].includes(item?.kind) && typeof item.id === 'string' && ['include', 'exclude'].includes(item.mode)) : [];
  invalidLink ||= params.has('invalid') || !Array.isArray(rawFilters) || rawFilters.length !== filters.length;
  return { invalidLink, route: ['home', 'country', 'region', 'appellation', 'designation', 'recent', 'about'].includes(params.get('r')) ? params.get('r') : 'home', id: params.get('id'), query: params.get('q') || '', filters, lang: params.get('lang') === 'en' ? 'en' : 'ja', matchIds: (params.get('w') || '').split(',').filter(Boolean), contextWine: params.get('cw') };
}

function urlFor(next) {
  const params = new URLSearchParams();
  if (next.route !== 'home') params.set('r', next.route);
  if (next.id) params.set('id', next.id);
  if (next.invalidLink) params.set('invalid', '1');
  if (next.filters.length) params.set('f', JSON.stringify(next.filters));
  if (next.query) params.set('q', next.query);
  if (next.lang === 'en') params.set('lang', 'en');
  if (next.matchIds?.length) params.set('w', next.matchIds.join(','));
  if (next.contextWine) params.set('cw', next.contextWine);
  return `${location.pathname}${location.search}${params.size ? `#${params}` : ''}`;
}

function capture() {
  const input = $('query');
  return { scroll: window.scrollY, open: [...document.querySelectorAll('main details[open]')].map(item => item.id).filter(Boolean), focus: input === document.activeElement, selection: input ? [input.selectionStart, input.selectionEnd] : null };
}

function saveEntry() {
  snapshot = capture();
  history.replaceState({ ae: true, depth, state, snapshot, overlay }, '', urlFor(state));
}

function navigate(route, id = null, extra = {}) {
  saveEntry();
  state = { ...state, route, id, matchIds: [], contextWine: null, ...extra };
  depth++;
  overlay = null;
  snapshot = { scroll: 0, open: [] };
  history.pushState({ ae: true, depth, state, snapshot, overlay }, '', urlFor(state));
  closeDialog();
  render();
  window.scrollTo(0, 0);
  $('main').focus({ preventScroll: true });
}

function replace(extra, redraw = true) {
  snapshot = capture();
  state = { ...state, ...extra };
  history.replaceState({ ae: true, depth, state, snapshot, overlay }, '', urlFor(state));
  if (redraw) render();
}

function restoreSnapshot() {
  for (const id of snapshot?.open ?? []) if ($(id)) $(id).open = true;
  requestAnimationFrame(() => {
    window.scrollTo(0, snapshot?.scroll ?? 0);
    if (snapshot?.focus && $('query')) {
      $('query').focus({ preventScroll: true });
      if (snapshot.selection) $('query').setSelectionRange(...snapshot.selection);
    }
  });
}

function find(kind, id) {
  const collection = { country: 'countries', region: 'regions', grape: 'grapes', appellation: 'appellations', designation: 'designations' }[kind];
  return collection ? (data[collection] ?? []).find(item => item.id === id) : candidates.find(item => item.kind === kind && item.id === id) ?? data.candidates?.find(item => item.kind === kind && item.id === id);
}
const coverageHTML = () => `<p class="coverage">${escape(t('coverage'))}: ${data.appellations.length} ${state.lang === 'ja' ? '呼称' : 'appellations'} / ${data.regions.length} ${state.lang === 'ja' ? '地域（限定収録）' : 'regions (limited coverage)'}</p>`;
const invalidFilters = () => state.filters.filter(filter => !find(filter.kind, filter.id));
const activeFilters = () => {
  if (!['country', 'region'].includes(state.route)) return state.filters;
  // Route scope is an additional AND constraint, never a replacement for an
  // explicit exclusion. Reuse an identical inclusion without duplicating it.
  const scope = { kind: state.route, id: state.id, mode: 'include' };
  return state.filters.some(filter => filter.kind === scope.kind && filter.id === scope.id && filter.mode === 'include') ? state.filters : [...state.filters, scope];
};
const name = entity => displayName(entity, state.lang);
const original = entity => typeof entity?.name === 'string' ? entity.name : entity?.name?.original;
const sort = entities => [...entities].sort((a, b) => name(a).localeCompare(name(b), state.lang) || a.id.localeCompare(b.id));

function renderHeader() {
  const left = state.route === 'home' && depth === 0 ? '<span class="brand">Appellation Explorer</span>' : button(t(depth > 0 ? 'back' : 'home'), depth > 0 ? 'back' : 'home', '', 'quiet');
  $('header').innerHTML = `${left}<div class="lang" aria-label="Language">${['ja', 'en'].map(lang => button(lang.toUpperCase(), 'language', `data-language="${lang}" aria-pressed="${state.lang === lang}"`)).join('')}</div>`;
  document.documentElement.lang = state.lang;
}

function row(entity, kind, meta = '') {
  return `<button type="button" class="row" data-action="navigate" data-kind="${kind}" data-id="${escape(entity.id)}"><span class="row-title">${escape(name(entity))}</span><span class="row-meta">${escape(meta)}</span></button>`;
}

function regionNames(app) { return (app.regionIds ?? []).map(id => name(find('region', id))).filter(Boolean).join(' · '); }
function wineNames(app) {
  const names = [...new Set((app.wines ?? []).map(wine => name(wine)).filter(Boolean))];
  return [...names.slice(0, 3), ...(names.length > 3 ? [state.lang === 'ja' ? `ほか${names.length - 3}タイプ` : `+ ${names.length - 3} types`] : [])].join(' · ');
}

function searchUI() {
  return `<section class="search-box" aria-label="${escape(t('search'))}"><label for="query" class="search-label">${escape(state.lang === 'ja' ? '産地・品種・ワインのタイプの候補を探す' : 'Find place, grape and wine-type suggestions')}</label><p id="query-help" class="meta-line">${escape(state.lang === 'ja' ? '入力は候補探しです。選択した条件だけが結果に適用されます。' : 'Typing finds suggestions. Only selected filters apply to results.')}</p><input type="search" id="query" value="${escape(state.query)}" placeholder="${escape(t('search'))}" autocomplete="off" aria-describedby="query-help" aria-controls="candidates" aria-expanded="${Boolean(state.query)}"><section aria-label="${state.lang === 'ja' ? '適用中の条件' : 'Applied filters'}"><h2 class="filters-heading">${state.lang === 'ja' ? '適用中の条件' : 'Applied filters'}</h2><div id="chips" class="chips"></div></section><p id="candidate-status" class="sr-only" role="status"></p><div id="candidates" class="candidates"></div></section>${coverageHTML()}<section id="results" tabindex="-1" aria-live="polite" aria-atomic="false"></section>`;
}

function homeHTML() {
  return `<p class="eyebrow">Appellation Explorer</p><h1>${escape(t('title'))}</h1><p class="intro">${escape(t('intro'))}</p>${searchUI()}<section><h2>${escape(t('countries'))}</h2><div class="country-grid">${sort(data.countries ?? []).map(entity => row(entity, 'country', t('country'))).join('')}</div></section><section><h2>${escape(t('mainRegions'))}</h2><div class="region-grid">${sort((data.regions ?? []).filter(region => !region.parentId && (data.appellations ?? []).some(app => regionBelongs(data, app.regionIds, region.id)))).map(entity => { const apps=sort(data.appellations.filter(a=>regionBelongs(data,a.regionIds,entity.id))); return `<section class="home-region">${row(entity,'region', `${name(find('country',entity.countryId))} · ${apps.length} ${state.lang==='ja'?'収録呼称':'included appellations'}`)}${apps.slice(0,4).map(a=>row(a,'appellation',a.gi)).join('')}${apps.length>4?button(state.lang==='ja'?'この地域の呼称をすべて見る':'View all appellations in this region','navigate',`data-kind="region" data-id="${escape(entity.id)}"`,'quiet'):''}</section>`; }).join('')}</div></section><p>${button(t('recent'), 'navigate', 'data-kind="recent"', 'quiet')}</p>${aboutLink()}`;
}

function regionHTML() {
  const entity = find(state.route, state.id);
  if (!entity) return `<p class="empty">${escape(t('noRegion'))}</p>`;
  const path = [];
  if (state.route === 'region') {
    let current = entity;
    const seen = new Set();
    while (current && !seen.has(current.id)) { path.unshift(current); seen.add(current.id); current = find('region', current.parentId); }
  }
  const country = state.route === 'country' ? entity : find('country', entity.countryId);
  const children = (data.regions ?? []).filter(region => state.route === 'country' ? region.countryId === entity.id && !region.parentId : region.parentId === entity.id);
  const apps = (data.appellations ?? []).filter(app => state.route === 'country' ? app.countryId === entity.id : regionBelongs(data, app.regionIds, entity.id));
  return `<p class="eyebrow">${escape(t(state.route))}</p><h1>${escape(name(entity))}</h1>${original(entity) !== name(entity) ? `<p class="original">${escape(original(entity))}</p>` : ''}<nav class="path" aria-label="${escape(t('regionContext'))}">${country ? button(name(country), 'navigate', `data-kind="country" data-id="${escape(country.id)}"`, 'quiet') : ''}${path.map(item => `<span aria-hidden="true">›</span>${button(name(item), 'navigate', `data-kind="region" data-id="${escape(item.id)}"`, 'quiet')}`).join('')}</nav><p class="muted">${escape(state.lang === 'ja' ? 'この地域・国の範囲内で、選択した条件をすべて満たす呼称を検索します。' : 'Search within this region or country, matching every selected condition.')}</p>${searchUI()}${state.route === 'region' ? button(t('regionSearch'), 'add-filter', `data-kind="region" data-id="${escape(entity.id)}"`, 'quiet') : ''}${children.length ? `<section><h2>${escape(t('regions'))}</h2><div class="region-grid">${sort(children).map(item => row(item, 'region', t('region'))).join('')}</div></section>` : ''}<section><h2>${escape(t('appellations'))}</h2>${sort(apps).map(app => row(app, 'appellation', [regionNames(app), app.gi, ...(app.traditionalTerms ?? []), app.level, wineNames(app)].filter(Boolean).join(' · '))).join('') || `<p class="empty">${escape(t('noData'))}</p>`}</section>${aboutLink()}`;
}

function renderChips() {
  if (!$('chips')) return;
  $('chips').innerHTML = state.filters.map((filter, index) => {
    const label = `${t(filter.mode)}: ${name(find(filter.kind, filter.id)) || filter.id}`;
    return `<span class="chip-pair">${button(label, 'chip-menu', `data-index="${index}" aria-haspopup="dialog"`, `chip ${filter.mode}`)}${button('×', 'remove-filter', `data-index="${index}" aria-label="${escape(label + (state.lang === 'ja' ? 'の条件を外す' : ': remove filter'))}"`, 'chip-remove')}</span>`;
  }).join('') + (state.filters.length ? button(state.lang === 'ja' ? '選択した条件をすべて解除' : 'Clear all selected filters', 'clear-applied', '', 'quiet') : `<p class="meta-line">${state.lang === 'ja' ? '選択した条件はありません。' : 'No selected filters.'}</p>`)
    + (['region','country'].includes(state.route) ? `<p class="meta-line">${escape(state.lang === 'ja' ? `探索範囲：${name(find(state.route,state.id))}（条件を解除してもこの範囲内を表示）` : `Browsing within ${name(find(state.route,state.id))}; clearing filters keeps this scope.`)}</p>` : '');
}

function candidateMeta(candidate) {
  if (candidate.kind === 'designation') return [candidate.qualification, name(find('appellation', candidate.appellationId))].filter(Boolean).join(' · ');
  if (candidate.kind === 'appellation') return [name(find('country', candidate.countryId)), ...(candidate.regionIds ?? []).map(id => name(find('region', id)))].filter(Boolean).join(' · ');
  if (candidate.kind === 'region') return [name(find('country', candidate.countryId)), name(find('region', candidate.parentId))].filter(Boolean).join(' · ');
  return t(candidate.kind);
}

function renderCandidates() {
  if (!$('candidates')) return;
  const all = candidatesHidden ? [] : findCandidates(data, state.query, state.lang);
  const found = all.slice(0, candidateLimit);
  $('candidate-status').textContent = state.query && !candidatesHidden ? `${all.length} ${state.lang === 'ja' ? '候補' : 'suggestions'}` : '';
  const groups = new Map();
  for (const candidate of found) { if (!groups.has(candidate.kind)) groups.set(candidate.kind, []); groups.get(candidate.kind).push(candidate); }
  $('candidates').innerHTML = [...groups].map(([kind, values]) => `<section class="candidate-group"><h3>${escape(t(kind))}</h3>${values.map(candidate => {
    const attributes = `data-kind="${kind}" data-id="${escape(candidate.id)}"`;
    const excludeLabel = state.filters.some(f => f.kind === kind && f.id === candidate.id && f.mode === 'include') ? t('changeExclude') : t('addExclude');
    const isDetail = ['appellation', 'designation'].includes(kind);
    return `<div class="candidate"><button type="button" class="candidate-name" data-action="${isDetail || kind === 'region' ? 'candidate-navigate' : 'add-filter'}" ${attributes}><span>${escape(name(candidate))}</span>${original(candidate) !== name(candidate) ? `<small lang="it">${escape(original(candidate))}</small>` : ''}<small>${escape(candidateMeta(candidate))}</small><small>${escape(isDetail ? state.lang === 'ja' ? '詳細を見る' : 'View details' : kind === 'region' ? t('explore') : state.lang === 'ja' ? '含む条件に追加' : 'Add inclusion filter')} ›</small></button><div class="candidate-actions">${isDetail ? '' : `${kind === 'region' ? button(t('add'), 'add-filter', `${attributes} aria-label="${escape(name(candidate) + ': ' + t('add'))}"`) : ''}${button(excludeLabel, 'add-filter', `${attributes} data-mode="exclude" aria-label="${escape(name(candidate) + ': ' + excludeLabel)}"`)}`}</div></div>`;
  }).join('')}</section>`).join('') || (state.query.trim() && !candidatesHidden ? `<p class="muted">${escape(t('noCandidates'))}</p>` : '');
  if (all.length > candidateLimit) $('candidates').innerHTML += button(t('moreCandidates'), 'more-candidates');
  $('query').setAttribute('aria-expanded', String(Boolean(all.length)));
}

function renderResults() {
  if (!$('results')) return;
  if (state.invalidLink || invalidFilters().length) { $('results').innerHTML = `<p class="notice" role="alert">${escape(t('invalidLink'))}</p>${button(t('reset'), 'reset-filters')}`; return; }
  if (!activeFilters().length) { $('results').innerHTML = ''; return; }
  const { results, unknownCount, unknownAppellations } = searchAppellations(data, activeFilters());
  results.sort((a, b) => name(a.appellation).localeCompare(name(b.appellation), state.lang));
  $('results').innerHTML = `<div class="results-count"><strong>${escape(state.lang === 'ja' ? `収録${data.appellations.length}呼称のうち ${results.length}件が一致` : `${results.length} matches among ${data.appellations.length} included appellations`)}</strong><small>${escape(t('share'))}</small></div>${state.filters.some(filter => filter.kind === 'grape') ? `<p class="muted"><small>${escape(state.lang === 'ja' ? 'この品種を使える呼称を探します。「除外」は使わずに造れるタイプを探します。代表品種や実際のボトルの配合を示す結果ではありません。' : 'Find appellations where use is permitted, not typical blends. Exclusion finds wines that may omit the grape.')}</small></p>` : ''}${unknownCount ? `<p class="notice">${escape(t('unknown'))} (${unknownCount})<br>${unknownAppellations.map(app => escape(name(app))).join(' · ')}</p>` : ''}${results.length ? results.map(result => {
    const app = result.appellation;
    const ownIds = result.matches.filter(match => !match.designation).map(match => match.wine.id);
    const matches = result.matches.map(match => `<div class="result-match">${escape(name({name:{original:match.wine.type}}))}${match.wine.qualifiers?.length ? ` · ${escape(match.wine.qualifiers.map(q=>name({name:{original:q}})).join(' / '))}` : ''}${match.designation ? ` · ${button(name(match.designation), 'open-match', `data-kind="designation" data-id="${escape(match.designation.id)}" data-wines="${escape(match.wine.id)}"`, 'quiet')}` : ''}<span class="sr-only">${escape(name(match.wine))}</span></div>`);
    const labelScoped = result.matches.filter(match => match.wine.grapeRule?.scope === 'senza indicazione del nome dei vitigni');
    const labelScopeNote = labelScoped.length ? `<p class="meta-line result-label-scope">${escape(state.lang === 'ja' ? 'ボトルのラベルに品種名を記載しない場合の規定で一致。' : 'Matches rules for bottles without grape names on the label.')}${labelScoped.length < result.matches.length ? ` ${escape(labelScoped.map(match => name(match.wine)).join(' / '))}` : ''}</p>` : '';
    return `${rowWithMatch(app, ownIds)}${labelScopeNote}<p class="meta-line">${state.lang === 'ja' ? '一致するタイプ' : 'Matching wine types'} (${matches.length})</p>${matches.slice(0,3).join('')}${matches.length>3 ? `<details id="matches-${escape(app.id)}"><summary>${state.lang === 'ja' ? `ほか${matches.length-3}タイプを見る` : `Show ${matches.length-3} more types`}</summary>${matches.slice(3).join('')}</details>` : ''}`;
  }).join('') : `<p class="empty">${escape(t('noResults'))}</p>`}`;
}

function rowWithMatch(app, ids) {
  return `<button type="button" class="row" data-action="open-match" data-kind="appellation" data-id="${escape(app.id)}" data-wines="${escape(ids.join(','))}"><span class="row-title">${escape(name(app))}</span><span class="row-meta">${escape([regionNames(app), app.gi, ...(app.traditionalTerms ?? [])].filter(Boolean).join(' · '))}</span></button>`;
}

function scopeText(scope) { return scope === 'senza indicazione del nome dei vitigni' && state.lang === 'ja' ? 'ボトルのラベルに品種名を記載しない場合の規定' : scope; }

function aboutLink() { return `<p class="footer-link">${button(t('about'), 'navigate', 'data-kind="about"', 'quiet')}</p>`; }

function evidenceHTML(evidence, id) {
  if (!evidence?.length) return '';
  return `<details class="evidence" id="e-${escape(id)}"><summary>${escape(t('evidence'))}</summary>${evidence.map(item => {
    const source = (data.sources ?? []).find(source => source.id === item.sourceId);
    return `<p>${escape(source?.agency ?? '')} · ${escape(source?.title ?? '')} · ${escape(item.locator ?? '')}</p>${item.conditions ? `<p>${escape(item.conditions)}</p>` : ''}<blockquote lang="it">${escape(item.quote ?? '')}</blockquote>${source ? sourceAnchor(source) : ''}`;
  }).join('')}</details>`;
}

function sourceAnchor(source) {
  try { const url = new URL(source.url); if (['https:', 'http:'].includes(url.protocol)) return `<a href="${escape(url.href)}" rel="external">${escape(source.archiveMember ? `${t('archiveDownload')} — ${source.archiveMember}` : `${t('sourceDocument')} — ${source.title || t('sourceLink')}`)}</a>`; } catch { /* Invalid source links are not clickable. */ }
  return '';
}

function grapeLink(id) {
  const grape = find('grape', id);
  return grape ? button(name(grape) === original(grape) ? name(grape) : `${name(grape)}（${original(grape)}）`, 'grape-link', `data-id="${escape(id)}" aria-label="${escape(name(grape) + (state.lang === 'ja' ? '：この品種を使える呼称を探す' : ': find appellations permitting this grape'))}"`, 'grape-link') : escape(id);
}

function ratioHTML(constraint) {
  if (constraint.min === constraint.max && constraint.min != null && !constraint.minExclusive) return `${escape(constraint.min)}%`;
  const minimum = constraint.min != null ? constraint.minExclusive ? `&gt; ${escape(constraint.min)}%` : `${escape(t('minimum'))} ${escape(constraint.min)}%` : '';
  const maximum = constraint.max != null ? `${escape(t('maximum'))} ${escape(constraint.max)}%` : '';
  return [minimum, maximum].filter(Boolean).join(' / ');
}

function grapeHTML(rule, prefix) {
  if (!rule) return `<p class="muted">${escape(t('unverified'))}</p>`;
  const ids = [...new Set(rule.grapeIds || [])];
  const ja = state.lang === 'ja';
  const wording = (rule.evidence?.[0]?.quote || rule.original || '').replace(/\s+/g, ' ');
  const region = wording.match(/idonei alla coltivazione nella regione ([\p{L}]+)[.;]/u)?.[1];
  const regional = ids.length > 6 && region && !rule.alternatives && rule.constraints?.length === 1 && rule.constraints[0].min === 100 && rule.constraints[0].max === 100;
  const oneOrMore = regional && /da uno o più vitigni/i.test(wording);
  const regionName = region ? name({ name: { original: region } }) : '';
  const scoped = rule.scope === 'senza indicazione del nome dei vitigni';
  const scope = scoped ? `<p>${escape(ja ? 'ボトルのラベルに品種名を記載しない場合の規定です。ラベルに品種名を記載する場合には、別の原料・栽培条件があります。' : 'These rules cover wines without a grape name on the label. Varietal labelling has separate conditions.')}</p>` : '';
  const summary = regional ? ja
    ? `${regionName}州で栽培が認められた品種${oneOrMore ? 'から1品種または複数品種を使用できます' : 'で構成される畑から収穫したブドウを使用します'}。規定の付表に載る認可品種を調べる一覧で、特定の代表品種や実際のボトルの配合を示すものではありません。`
    : `Permitted varieties from ${regionName} supply these wines. This is an authorised list, not a list of representative grapes or a bottle recipe.`
    : t('permitted');
  const list = ids.length <= 6 ? `<p>${ids.map(grapeLink).join(' · ')}</p>` : `<details id="grapes-${escape(prefix)}" class="grape-list"><summary>${escape(ja ? '使える品種を調べる' : t('permitted'))} (${ids.length})</summary><p class="meta-line">${escape(ja ? '日本語は参考の読みです。公式原語名を併記し、品種の同一性は原語と出典で区別します。' : 'Japanese readings are editorial aids; original identities are retained.')}</p><label>${escape(t('grapeSearch'))}<input type="search" data-grape-search autocomplete="off"></label><div class="grape-buttons">${ids.map(grapeLink).join('')}</div></details>`;
  // Show only proved usage duties, never a positive planting minimum alone.
  const required = ids.filter(id => evaluateGrapeUse(rule, [id]).status === 'match' && evaluateGrapeUse(rule, [], [id]).status === 'no_match');
  const duties = required.map(id => {
    const proof = grapeDutyProof(rule, id);
    const explanations = ja ? {
      direct: '原料葡萄またはワインへの使用を明記した条件が根拠です。',
      'sole-source': '規定されたブドウの由来がこの1品種に限られるためです。畑の割合をボトルの配合へ換算したものではありません。',
      'remainder-cap': '他の許可品種を合わせても原料葡萄またはワインの全量を満たせない上限があるためです。畑の割合から使用義務を推定していません。',
      combined: '同じ適用範囲の許可品種と制約を合わせると、この品種を使わない構成が成立しないためです。'
    } : {direct:'An explicit raw-grape or wine requirement establishes this duty.', 'sole-source':'The permitted fruit source is limited to this single variety; planting percentages are not converted into a bottle recipe.', 'remainder-cap':'The combined cap on the other permitted varieties cannot supply the entire raw-grape or wine amount.', combined:'The permitted varieties and constraints in this same scope cannot be satisfied without this grape.'};
    return `<p>${escape(name(find('grape', id)))}${ja ? 'は使用が必要です。' : ' must be used. '}</p><details class="duty-proof"><summary>${ja ? '使用が必要な理由・出典' : 'Why required · sources'}</summary><p>${escape(explanations[proof.kind])}</p>${evidenceHTML(proof.evidence, `${prefix}-required-${id}`)}</details>`;
  }).join('');
  const uncertain = ids.some(id => evaluateGrapeUse(rule, [], [id]).status === 'unknown') ? `<p>${escape(ja ? '使えることと、必ず使うことは別です。使用が必須か確認できていない品種は、使わずに造れるとも断定していません。' : 'Permission and mandatory use differ. Unproved mandatory use does not prove a grape can be omitted.')}</p>` : '';
  const constraints = (rule.alternatives ?? [rule]).map(alternative => (alternative.constraints ?? []).filter(c => !required.some(id => c.grapeIds.length === 1 && c.grapeIds[0] === id && c.minExclusive && c.min === 0 && ratioBasis(alternative, c) !== 'vineyard')).map(constraint => {
    if (regional) return `<p>${escape(ja ? '対象の畑は、この認可品種の範囲で構成されます。各品種をすべて植えるという意味ではありません。' : 'The source vineyards use varieties from this permitted list; not every variety must be planted.')}</p>`;
    const label = constraint.grapeIds.length > 6 ? ja ? '認可品種の範囲' : 'Permitted varieties' : constraint.grapeIds.map(id => name(find('grape', id))).join(' / ');
    return `<p><span class="ratio-basis">${escape(t('basis_' + ratioBasis(alternative, constraint)))}</span><br>${escape(label)}${constraint.grapeIds.length > 1 ? ja ? '（合わせて）' : ' (combined)' : ''}: ${ratioHTML(constraint)}</p>`;
  }).join('')).join('<hr>');
  const estate = /(?:nell['’]ambito|in ambito) aziendale/i.test(wording);
  const vineyard = (rule.constraints || []).some(c => ratioBasis(rule, c) === 'vineyard');
  const explanation = vineyard ? ja ? `この呼称に使うブドウの供給元となる、${estate ? '生産者単位の' : ''}対象畑の条件です。ボトルの配合率ではなく、植えられた品種の割合をワインの配合率へ換算していません。` : 'These are conditions on the source vineyards, not a separate kind of grape or the proportions in a bottle.' : t('sourceUseNotice');
  return `${scope}<p>${escape(summary)}</p>${duties}<p class="meta-line">${ja ? '品種名を押すと、この品種を使える呼称を探せます。' : 'Select a grape to find appellations permitting it.'}</p>${list}${uncertain}<details id="ratios-${escape(prefix)}"><summary>${escape(ja ? 'ブドウの供給元となる畑・比率の条件' : t('cultivation'))}</summary><p>${escape(explanation)}</p>${constraints}</details>${rule.original ? `<details id="raw-${escape(prefix)}"><summary>${escape(t('raw'))}</summary><p lang="it">${escape(rule.original)}</p></details>` : ''}${evidenceHTML(rule.evidence, `${prefix}-grapes`)}`;
}

function valueText(value) {
  if (typeof value === 'string') return value;
  if (value?.original) return value.original;
  if (value?.text) return typeof value.text === 'string' ? value.text : value.text[state.lang] || value.text.original || '';
  return '';
}

function conditionText(value) {
  if (!value || state.lang !== 'ja') return value || '';
  const text=value.replace(/\s+/g,' ').trim();
  if (/^sui lieviti$/i.test(text)) return '澱とともに';
  return `追加条件（公式原文）：${text}`;
}
function optionalHTML(field, fieldKey, prefix) {
  const needsReprocessing = fieldIssues(field, fieldKey).length > 0;
  const current = needsReprocessing ? { ...field, state: 'unverified', values: [] } : field ?? { state: 'unverified' };
  const evidence = new Map((current.evidence ?? []).map(item => [JSON.stringify(item), item]));
  const explanation = state.lang === 'ja' && current.state === 'confirmed' ? regulationExplanation(current, fieldKey) : null;
  if (explanation) return `<div class="rule translated-rule"><span class="rule-label">${escape(t(fieldKey))}</span><p>${escape(explanation.ja)}</p><p class="meta-line">${explanation.coverage === 'summary' ? '日本語の要約です。細部・例外を含む条文全体の訳ではありません。' : '公式記述の参考訳'}</p>${current.original && !current.evidence?.some(e => e.quote === current.original) ? `<details><summary>${escape(t('raw'))}</summary><p lang="it">${escape(current.original)}</p></details>` : ''}${evidenceHTML(current.evidence, `${prefix}-${fieldKey}`)}</div>`;

  let body = current.state !== 'confirmed' ? `<p class="muted">${escape(t(current.state ?? 'unverified'))}</p>` : '';
  if (current.values?.length) body += current.values.map(value => {
    let text = valueText(value);
    if (fieldKey === 'alcohol' && value.value != null) {
      const proof = alcoholDisplayProof(current, value);
      text = state.lang === 'ja' ? `${t(value.metric + 'Alcohol')}は${value.value}%${proof.minimum ? '以上' : '（上下限の日本語説明は未確認）'}です。` : `${proof.minimum ? t('minimum') + ' ' : ''}${t(value.metric + 'Alcohol')}: ${value.value} ${value.unit || '% vol'}`;
      const conditions = value.applicability || value.conditions;
      if (conditions) {
        const known = conditions.match(/^\s*\d+(?:[,.]\d+)?\s*%\s*(?:vol\.?)?\s*per\s+(?:la\s+)?tipologia\s+(bianco|rosso|rosato)(\s+(?:novello|frizzante|passito|abboccato|dolce))?\s*$/i);
        text += state.lang === 'ja' ? known ? `適用対象は${name({name:{original:[known[1], known[2]?.trim()].filter(Boolean).join(' ')}})}です。` : '追加の適用条件の日本語説明は未対応です。公式原文の条件を確認してください。' : ` · ${conditions}`;
      }
    }
    if (fieldKey === 'ageing') text = [value.minimum ? t('minimum') : '', value.container === 'total' ? t('totalAgeing') : t(value.container), value.months != null ? `${value.months} ${state.lang === 'ja' ? 'か月' : 'months'}` : '', value.relation ? t(value.relation) : '', value.start && state.lang === 'ja' ? ageingStartExplanation(value.start) || `起算日は公式原文でご確認ください（${value.start}）` : value.start, conditionText(value.conditions)].filter(Boolean).join(' · ');
    for (const item of value.evidence ?? []) evidence.set(JSON.stringify(item), item);
    return text ? `<p>${escape(text)}</p>` : '';
  }).join('');
  if (fieldKey === 'alcohol' && current.values?.length && state.lang === 'ja') {
    if (new Set(current.values.map(v=>v.metric)).size>1) body += '<p class="meta-line">総・実の両方の条件を満たします。</p>';
    body += '<a class="meta-line" href="#alcohol-guide" data-action="section-jump" data-target="alcohol-guide">度数の読み方</a>';
    const translated = current.values.map((value, index) => {
      const proof = alcoholDisplayProof(current, value);
      const sentence = `${t(value.metric + 'Alcohol')}は${value.value}%${proof.minimum ? '以上' : '（上下限は未確認）'}です。`;
      return `<section><p>日本語の説明：${escape(sentence)}</p>${proof.evidence.length ? evidenceHTML(proof.evidence, `${prefix}-alcohol-value-${index}`) : '<p>値に対応する条文は下の公式原文をご確認ください。</p>'}</section>`;
    }).join('');
    body += `<details class="alcohol-translation"><summary>このタイプの度数の出典・公式原文</summary>${translated}</details>`;
    // Keep the full saved source available, but never use sensory/acidity text
    // as the normal alcohol explanation.
    if (current.original) body += `<details><summary>関連条文の公式原文（未翻訳）</summary><p lang="it">${escape(current.original)}</p></details>`;
    return `<div class="rule alcohol-rule"><span class="rule-label">${escape(t(fieldKey))}</span>${body}</div>`;
  }
  if (fieldKey === 'varietalLabelling' && current.state === 'confirmed') body += `<p>${escape(state.lang === 'ja' ? 'ボトルのラベルに品種名を記載する場合には、その品種に対応した別の原料・栽培条件があります。ラベルに品種名を記載しない場合の規定とは区別してください。' : 'Naming grape varieties on the label has separate fruit and cultivation conditions tied to those varieties. These differ from the rules for wines without a varietal name.')}</p>`;
  if (current.state === 'confirmed' && !current.values?.length) body += `<p class="muted">${escape(state.lang === 'ja' ? 'この項目は公式原文でご確認ください。日本語の説明はまだありません。' : 'The source is retained, but a translated explanation is not available.')}</p>`;
  if (current.original && ![...evidence.values()].some(item => item.quote === current.original)) body += `<details id="original-${escape(prefix)}-${fieldKey}"><summary>${escape(t('raw'))}</summary><p lang="it">${escape(current.original)}</p></details>`;
  body += evidenceHTML([...evidence.values()], `${prefix}-${fieldKey}`);
  return `<div class="rule"><span class="rule-label">${escape(t(fieldKey))}</span>${body}</div>`;
}

function wineHTML(wine, matched, common = false, sharedFields = [], sharedGrapes = '') {
  return `<article class="wine ${matched ? 'matched' : ''}" id="wine-${escape(wine.id)}" tabindex="-1" data-wine-id="${escape(wine.id)}">${matched ? `<span class="matched-label">${escape(t('matched'))}</span>` : ''}<h2>${escape(name(wine))}</h2>${name(wine) !== original(wine) ? `<p lang="it" class="meta-line">${escape(original(wine))}</p>` : ''}<p>${escape(name({name:{original:wine.type}}))}</p>${wine.scope && !(wine.scope === 'senza indicazione del nome dei vitigni' && wine.grapeRule?.scope === wine.scope) ? `<p class="meta-line">${escape(scopeText(wine.scope))}</p>` : ''}${optionalHTML(wine.sensory, 'sensory', wine.id)}${sharedGrapes || (common ? `<p><a href="#common-grapes" data-action="common-jump">${escape(t('commonReference'))}</a></p>` : `<div class="rule"><span class="rule-label">${escape(t('composition'))}</span>${grapeHTML(wine.grapeRule, wine.id)}</div>`)}${optionalHTML(wine.ageing, 'ageing', wine.id)}${optionalHTML(wine.alcohol, 'alcohol', wine.id)}<details id="long-${escape(wine.id)}"><summary>${escape(t('allRules'))}</summary>${['varietalLabelling','production','area'].filter(k=>!sharedFields.includes(k) && (k!=='varietalLabelling'||wine[k])).map(k=>optionalHTML(wine[k],k,wine.id)).join('')}${sharedFields.length ? '<p><a href="#shared-regulations" data-action="section-jump" data-target="shared-regulations">'+(state.lang==='ja'?'呼称全体の区域・栽培・ラベル条件':'Appellation-wide area, cultivation and label conditions')+'</a></p>' : ''}${evidenceHTML(wine.evidence, `${wine.id}-identity`)}</details><a class="meta-line" href="#type-index" data-action="section-jump" data-target="type-index">${state.lang==='ja'?'タイプ一覧へ戻る':'Back to wine types'}</a></article>`;
}

function alcoholGuideHTML() {
  return `<details id="alcohol-guide" tabindex="-1"><summary>${state.lang==='ja'?'度数の読み方・定義の出典':'Reading alcohol requirements · definitions'}</summary><p>${state.lang==='ja'?'総アルコール度数は、実際に含まれるアルコール分と、残る糖がすべて発酵した場合に生じ得るアルコール分の合計です。総の数値を、そのままボトルの実際の度数とは読み替えません。総と実の両方が示されるタイプでは、両方の条件を満たす必要があります。':'Total alcohol is actual plus potential alcohol from complete fermentation of remaining sugar. It is not the actual alcohol in a bottle. Both requirements apply where both are stated.'}</p><p>${state.lang==='ja'?'実アルコール度数は20℃での製品100体積に含まれる純アルコールの体積、潜在アルコール度数は同じ条件で残る糖の完全発酵から生じ得る純アルコールの体積です。':'Actual alcohol is the volume of pure alcohol per 100 volumes of product at 20°C. Potential alcohol is the corresponding volume from complete fermentation of remaining sugar.'}</p><a href="https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=celex%3A32013R1308" rel="external">EU規則1308/2013 附属書II 第IV部</a></details>`;
}

function sourcesHTML(entity) {
  const sourceIds = new Set();
  const collect = item => {
    if (!item || typeof item !== 'object') return;
    if (item.sourceId) sourceIds.add(item.sourceId);
    for (const id of item.sourceIds ?? []) sourceIds.add(id);
    for (const child of Object.values(item)) if (child && typeof child === 'object') Array.isArray(child) ? child.forEach(collect) : collect(child);
  };
  collect(entity);
  const sources = (data.sources ?? []).filter(item => sourceIds.has(item.id));
  return `<section id="sources"><h2>${escape(t('sources'))}</h2><p>${escape(state.lang === 'ja' ? '取得日は資料を保存した日、検証日は記録を確認した日です。施行日や、今日現在も改正がないことの保証ではありません。' : 'Retrieval and verification dates are not effective dates or a guarantee of no subsequent amendments.')}</p>${sources.map(source => `<article class="source"><strong>${escape(source.title)}</strong><dl><dt>${escape(t('agency'))}</dt><dd>${escape(source.agency)}</dd>${source.archiveMember ? `<dt>${escape(t('archiveDocument'))}</dt><dd>${escape(source.archiveMember)}</dd>` : ''}<dt>${escape(t('published'))}</dt><dd>${escape(source.publishedAt || (state.lang === 'ja' ? 'この記録では未確認' : 'Not recorded'))}</dd><dt>${state.lang === 'ja' ? '施行日' : 'Effective from'}</dt><dd>${escape(source.effectiveFrom || (state.lang === 'ja' ? 'この記録では未確認' : 'Not recorded'))}</dd><dt>${escape(t('retrieved'))}</dt><dd>${escape(source.retrievedAt ?? '')}</dd>${source.verifiedAt ? `<dt>${escape(t('verified'))}</dt><dd>${escape(source.verifiedAt)}</dd>` : ''}</dl>${sourceAnchor(source)}${sourceIdentityHTML(source)}</article>`).join('') || `<p class="muted">${escape(t('sourcesEmpty'))}</p>`}${evidenceHTML(entity.evidence, `${entity.id}-sources`)}</section>`;
}

function sourceIdentityHTML(source) {
  return `<details id="source-identity-${escape(source.id)}"><summary>${escape(t('originalIdentity'))}</summary><dl><dt>${escape(t('documentHash'))}</dt><dd>${escape(source.sha256)}</dd>${source.archiveHash ? `<dt>${escape(t('archiveHash'))}</dt><dd>${escape(source.archiveHash)}</dd>` : ''}</dl></details>`;
}

function conditionalAmendmentsHTML(entity) {
  if (!entity.conditionalAmendments?.length) return '';
  return `<section class="conditional-amendments"><h2>${escape(t('conditionalChanges'))}</h2>${entity.conditionalAmendments.map((amendment, index) => {
    const applicability = typeof amendment.applicability === 'object' ? amendment.applicability.state : amendment.applicability;
    const stateLabel = applicability === 'active' ? 'applicabilityActive' : applicability === 'expired' ? 'applicabilityExpired' : 'applicabilityUnknown';
    const duration = amendment.conditions?.maximumDuration;
    const durationText = duration?.years != null && duration.reference === 'publication of this decree' ? state.lang === 'ja' ? `この法令の公示から最大${duration.years}年` : `At most ${duration.years} year${duration.years === 1 ? '' : 's'} from publication of this decree` : duration?.original || '';
    const articleText = amendment.article != null ? state.lang === 'ja' ? `第${amendment.article}条${amendment.afterParagraph ? `・第${amendment.afterParagraph}段落の後` : ''}` : `Article ${amendment.article}${amendment.afterParagraph ? `, after paragraph ${amendment.afterParagraph}` : ''}` : '';
    return `<article class="rule"><h3>${escape(amendment.affectedField === 'ageing.location' ? t('ageingLocation') : t('conditionalChanges'))}</h3>${articleText ? `<p class="meta-line">${escape(articleText)}</p>` : ''}<p class="notice">${escape(t(stateLabel))}</p>${amendment.actDate ? `<p>${escape(t('actDate'))}: ${escape(amendment.actDate)}</p>` : ''}${amendment.conditions?.commencement ? `<p>${escape(t('commencement'))}: ${escape(amendment.conditions.commencement)}</p>` : ''}${durationText ? `<p>${escape(durationText)}</p>` : ''}<details id="conditional-${escape(entity.id)}-${index}"><summary>${escape(t('raw'))}</summary><p>${escape(amendment.original)}</p>${amendment.conditions?.original ? `<p>${escape(amendment.conditions.original)}</p>` : ''}${amendment.contextOriginal ? `<p>${escape(amendment.contextOriginal)}</p>` : ''}</details>${evidenceHTML(amendment.evidence, `${entity.id}-conditional-${index}`)}</article>`;
  }).join('')}</section>`;
}

function detailsHTML() {
  const entity = find(state.route, state.id);
  if (!entity) return `<h1>${escape(t('missingTarget'))}</h1>${button(t('home'), 'home')}`;
  const parent = state.route === 'designation' ? find('appellation', entity.appellationId) : entity;
  recordRecent(state.route, entity.id);
  state.matchIds = state.filters.length && !state.invalidLink && !invalidFilters().length ? (entity.wines ?? []).filter(wine => evaluateWine(data, parent, wine, state.filters).status === 'match').map(wine => wine.id) : [];
  const wines = [...(entity.wines ?? [])].sort((a, b) => Number(state.matchIds.includes(b.id)) - Number(state.matchIds.includes(a.id)));
  const common = wines.length > 1 && wines.every(wine => JSON.stringify(wine.grapeRule) === JSON.stringify(wines[0].grapeRule));
  const sharedFields = ['production','area','varietalLabelling'].filter(k=>wines.length>1 && wines[0][k] && wines.every(w=>JSON.stringify(w[k])===JSON.stringify(wines[0][k])));
  const sharedGrapes = common ? `<section id="common-grapes" tabindex="-1"><h3>${escape(t('commonRules'))}</h3>${grapeHTML(wines[0].grapeRule, entity.id)}</section>` : '';
  const typeIndex = `<nav id="type-index" tabindex="-1" aria-label="${state.lang==='ja'?'ワインのタイプ':'Wine types'}"><h2>${state.lang==='ja'?'どんな種類がある？':'Explore the wine types'}</h2><div class="type-links">${wines.map(w=>`<a href="#wine-${escape(w.id)}" data-action="section-jump" data-target="wine-${escape(w.id)}">${escape(name(w))}</a>`).join('')}</div></nav><p class="meta-line">${state.lang==='ja'?'以下は公式規定の色・香り・味わいです。個々のボトルの味を保証するものではありません。':'These are official sensory descriptions, not a guarantee of every bottle’s taste.'}</p>`;
  return `<p class="eyebrow">${escape(t(state.route))}${entity.qualification ? ` · ${escape(entity.qualification)}` : ''}</p><h1>${escape(name(entity))}</h1>${original(entity) !== name(entity) ? `<p class="original">${escape(original(entity))}</p>` : ''}<p class="meta-line">${escape([name(find('country', parent?.countryId)), regionNames(parent ?? {}), state.route === 'appellation' ? parent?.gi : '', ...(state.route === 'appellation' ? parent?.traditionalTerms ?? [] : []), entity.level].filter(Boolean).join(' · '))}</p>${state.route === 'designation' && parent ? `<p>${escape(t('parent'))}: ${button(name(parent), 'navigate', `data-kind="appellation" data-id="${escape(parent.id)}"`, 'quiet')}</p>` : ''}<p class="notice">${escape(t('detailInfo'))} <a href="#sources" data-action="sources-jump">${escape(t('sources'))}</a></p>${typeIndex}<div class="wines">${wines.map((wine,index) => wineHTML(wine, state.matchIds.includes(wine.id), common, sharedFields, index===0?sharedGrapes:'')).join('')}</div>${sharedFields.length ? `<details id="shared-regulations" tabindex="-1"><summary>${state.lang==='ja'?'呼称全体の区域・栽培・ラベル条件':'Appellation-wide conditions'}</summary><p>${state.lang==='ja'?'タイプごとの適用条件も含む条文をまとめています。ここに書かれた条件がすべてのタイプへ一律に適用されるとは限りません。':'These shared paragraphs can contain conditions for specific wine types; not every condition applies to every type.'}</p>${sharedFields.map(k=>optionalHTML(wines[0][k],k,entity.id)).join('')}</details>` : ''}${alcoholGuideHTML()}${conditionalAmendmentsHTML(entity)}${state.route === 'appellation' ? designationList(entity) : ''}${sourcesHTML(entity)}${aboutLink()}`;
}

function designationList(entity) {
  const entries = (data.designations ?? []).filter(item => item.appellationId === entity.id);
  return entries.length ? `<section><h2>${escape(t('geoNames'))}</h2>${sort(entries).map(item => row(item, 'designation', [t('designation'), item.qualification].filter(Boolean).join(' · '))).join('')}</section>` : '';
}

function getRecent() {
  try { return JSON.parse(localStorage.getItem('ae-recent-v1') ?? '[]').filter(item => item && Date.now() - item.at < 30 * 86400000 && find(item.kind, item.id)); } catch { return []; }
}
function recordRecent(kind, id) {
  try { localStorage.setItem('ae-recent-v1', JSON.stringify([{ kind, id, at: Date.now() }, ...getRecent().filter(item => item.id !== id || item.kind !== kind)].slice(0, 20))); } catch { /* Private browsing can disable storage without disabling the app. */ }
}

function recentHTML() {
  const recent = getRecent();
  return `<h1>${escape(t('recent'))}</h1><p class="muted">${escape(t('recentHelp'))}</p>${recent.length ? button(state.lang === 'ja' ? 'この端末の閲覧履歴を消去' : 'Clear history on this device', 'clear-recent', '', 'quiet') : ''}${recent.map(item => { const entity = find(item.kind, item.id); return row(entity, item.kind, [t(item.kind), item.kind === 'designation' ? name(find('appellation', entity.appellationId)) : regionNames(entity)].filter(Boolean).join(' · ')); }).join('') || `<p class="empty">${escape(t('noRecent'))}</p>`}`;
}

function aboutHTML() {
  return `<div class="about"><p class="eyebrow">Data & Sources</p><h1>${escape(t('about'))}</h1><p>${escape(t('aboutText'))}</p><p>${escape(t('aboutProcess'))}</p><p>${escape(t('aboutSearch'))}</p><p>${escape(t('aboutUpdate'))}</p><p class="notice">${escape(state.lang === 'ja' ? '日本語の読みは検索・表示のための編集表記です。公式な日本語名や法的同義名の認定ではありません。読みの外部根拠が未確認の品種もあり、原語名を併記します。日本語の説明がない項目は未対応と明示します。' : t('noTranslations'))}</p><dl><dt>${escape(t('version'))}</dt><dd>${escape(data.version)}</dd></dl><h2>${escape(t('sources'))}</h2>${(data.sources ?? []).map(source => `<article class="source"><p>${escape(source.agency)} · ${escape(source.title)}<br>${sourceAnchor(source)}</p>${source.archiveMember ? `<dl><dt>${escape(t('archiveDocument'))}</dt><dd>${escape(source.archiveMember)}</dd></dl>` : ''}${sourceIdentityHTML(source)}</article>`).join('')}</div>`;
}

function render() {
  if (!data) return;
  renderHeader();
  $('main').innerHTML = state.route === 'home' ? homeHTML() : ['country', 'region'].includes(state.route) ? regionHTML() : ['appellation', 'designation'].includes(state.route) ? detailsHTML() : state.route === 'recent' ? recentHTML() : aboutHTML();
  if (!$('results') && (state.invalidLink || invalidFilters().length)) $('main').insertAdjacentHTML('afterbegin', `<p class="notice" role="alert">${escape(t('invalidLink'))}</p>${button(t('reset'), 'reset-filters')}`);
  document.title = `${['appellation', 'designation', 'region', 'country'].includes(state.route) ? name(find(state.route, state.id)) + ' · ' : ''}Appellation Explorer`;
  renderChips(); renderCandidates(); renderResults(); restoreSnapshot();
  if (overlay) renderOverlay();
}

function openMenu(index) {
  menuFocusIndex = index;
  saveEntry();
  overlay = { type: 'chip', index };
  depth++;
  history.pushState({ ae: true, depth, state, snapshot, overlay }, '', urlFor(state));
  renderOverlay();
}

function renderOverlay() {
  if (overlay?.type !== 'chip') return;
  const filter = state.filters[overlay.index];
  if (!filter) { closeDialog(); return; }
  $('sheet').innerHTML = `<div class="sheet-head"><strong>${escape(name(find(filter.kind, filter.id)))}</strong>${button(t('close'), 'close-overlay')}</div><div class="sheet-body">${filter.kind === 'grape' ? `<p>${escape(t('excludeHelp'))}</p>` : ''}<div class="menu-options">${button(t('include'), 'change-filter', 'data-mode="include"')}${button(t('exclude'), 'change-filter', 'data-mode="exclude"')}${button(t('remove'), 'change-filter', 'data-mode="remove"')}</div></div>`;
  if (!$('sheet').open) $('sheet').showModal();
  document.body.style.overflow = 'hidden';
}

function closeDialog() {
  if ($('sheet').open) $('sheet').close();
  document.body.style.overflow = '';
}

function toast(text) {
  $('toast').textContent = text;
  setTimeout(() => { $('toast').textContent = ''; }, 4000);
}

function addFilter(kind, id, mode = 'include') {
  const candidate = find(kind, id) ?? { kind, id };
  candidatesHidden = true;
  replace({ query: '', filters: upsertFilter(state.filters, { ...candidate, kind, id }, mode) }, false);
  if ($('query')) $('query').value = '';
  renderChips(); renderCandidates(); renderResults();
  if (matchMedia('(pointer: coarse)').matches) { $('results')?.focus({ preventScroll: true }); $('results')?.scrollIntoView({block:'nearest'}); }
  else $('query')?.focus({ preventScroll: true });
  saveEntry();
}

document.addEventListener('click', event => {
  if (event.target.closest('.skip-link')) { event.preventDefault(); $('main').focus(); return; }
  const target = event.target.closest('[data-action]');
  if (!target || !data) return;
  const { action, id, kind } = target.dataset;
  if (action === 'back') history.back();
  else if (action === 'home') navigate('home');
  else if (action === 'navigate' || action === 'candidate-navigate') {
    if (action === 'candidate-navigate') { replace({query:''},false); if ($('query')) $('query').value=''; candidatesHidden=true; }
    navigate(kind, id || null);
  }
  else if (action === 'open-match') navigate(kind, id, { filters: activeFilters(), matchIds: (target.dataset.wines || '').split(',').filter(Boolean) });
  else if (action === 'language') { preferredLanguage = target.dataset.language; replace({ lang: preferredLanguage }); }
  else if (action === 'clear-recent') { try { localStorage.removeItem('ae-recent-v1'); render(); $('main').focus(); toast(state.lang === 'ja' ? '閲覧履歴を消去しました。検索条件は保持しています。' : 'History cleared. Search filters are retained.'); } catch { toast(state.lang === 'ja' ? 'この端末では履歴を消去できませんでした。' : 'Could not clear local history.'); } }
  else if (action === 'more-candidates') { candidateLimit += 12; renderCandidates(); }
  else if (action === 'reset-filters') { replace({ filters: [], invalidLink: false }); }
  else if (action === 'add-filter') addFilter(kind, id, target.dataset.mode || 'include');
  else if (action === 'remove-filter' || action === 'clear-applied') {
    replace({filters: action === 'clear-applied' ? [] : state.filters.filter((_,index)=>index!==Number(target.dataset.index))},false);
    renderChips(); renderResults(); $('query')?.focus({preventScroll:true}); saveEntry();
  }
  else if (action === 'chip-menu') openMenu(Number(target.dataset.index));
  else if (action === 'close-overlay') history.back();
  else if (action === 'change-filter') {
    const index = overlay.index;
    const mode = target.dataset.mode;
    pendingAfterClose = () => {
      const filters = mode === 'remove' ? state.filters.filter((_, i) => i !== index) : state.filters.map((filter, i) => i === index ? { ...filter, mode } : filter);
      replace({ filters }, false); renderChips(); renderResults();
      const chips = document.querySelectorAll('[data-action=chip-menu]');
      (chips[Math.min(index, chips.length - 1)] || $('query'))?.focus({ preventScroll: true });
    };
    history.back();
  } else if (action === 'grape-link') {
    const wasExclude = state.filters.some(item => item.kind === 'grape' && item.id === id && item.mode === 'exclude');
    navigate('home', null, { query: '', filters: upsertFilter(state.filters, { kind: 'grape', id }, 'include') });
    if (wasExclude) toast(t('changed'));
  } else if (action === 'section-jump') {
    event.preventDefault(); const destination=$(target.dataset.target);
    if (destination) { if (destination.tagName==='DETAILS') destination.open=true; destination.focus({preventScroll:true}); destination.scrollIntoView({block:'start'}); saveEntry(); }
  } else if (action === 'common-jump') { event.preventDefault(); $('common-grapes')?.focus(); saveEntry();
  } else if (action === 'sources-jump') {
    event.preventDefault(); $('sources')?.scrollIntoView(); saveEntry();
  }
});

// Preserve the existing native buttons and Tab order; arrows are a shortcut,
// not a fake combobox with inaccessible secondary actions.
document.addEventListener('keydown', event => {
  const query = $('query');
  if (event.isComposing || composingQuery || event.keyCode === 229) { if (event.key === 'Enter' && event.target.closest('#candidates')) event.preventDefault(); return; }
  const buttons = [...document.querySelectorAll('#candidates button:not([hidden])')];
  if (!query || !buttons.length || !(event.target === query || buttons.includes(event.target))) return;
  if (event.key === 'Escape') { event.preventDefault(); query.focus(); return; }
  if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
  event.preventDefault();
  const index = buttons.indexOf(event.target);
  const next = event.key === 'ArrowDown' ? index + 1 : index - 1;
  if (next < 0) query.focus(); else buttons[Math.min(next, buttons.length - 1)].focus();
});

document.addEventListener('compositionstart', event => { if (event.target.id === 'query') composingQuery = true; });
document.addEventListener('compositionend', event => { if (event.target.id === 'query') composingQuery = false; });

document.addEventListener('input', event => {
  if (event.target.matches('[data-grape-search]')) { const q = event.target.value; const found = new Set(findCandidates(data, q, state.lang).filter(c => c.kind === 'grape').map(c => c.id)); event.target.closest('.grape-list').querySelectorAll('.grape-link').forEach(button => { button.hidden = Boolean(q) && !found.has(button.dataset.id); }); return; }
  if (event.target.id !== 'query') return;
  candidateLimit = 12; candidatesHidden = false;
  replace({ query: event.target.value }, false);
  renderCandidates();
});

document.addEventListener('toggle', event => {
  if (event.target.tagName === 'DETAILS' && !overlay) saveEntry();
}, true);

$('sheet').addEventListener('cancel', event => { event.preventDefault(); history.back(); });
window.addEventListener('scroll', () => { clearTimeout(scrollTimer); scrollTimer = setTimeout(() => { if (!overlay) saveEntry(); }, 100); }, { passive: true });
window.addEventListener('popstate', event => {
  if (event.state?.ae) {
    state = { ...event.state.state, lang: preferredLanguage }; depth = event.state.depth; snapshot = event.state.snapshot; overlay = event.state.overlay;
  } else { state = readURL(); preferredLanguage = state.lang; depth = 0; snapshot = null; overlay = null; }
  closeDialog(); render();
  if (menuFocusIndex !== null && !overlay) { document.querySelector(`[data-action=chip-menu][data-index="${menuFocusIndex}"]`)?.focus({ preventScroll: true }); menuFocusIndex = null; }
  if (pendingAfterClose) { const callback = pendingAfterClose; pendingAfterClose = null; callback(); }
});
window.addEventListener('pagehide', saveEntry);

async function start() {
  try {
    const response = await fetch('./data.json', { cache: 'no-cache', signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    data = await response.json();
    if (data.schemaVersion !== 1 || !Array.isArray(data.appellations)) throw new Error('Unsupported data schema');
    candidates = buildCandidates(data, { facets: true });
    render();
    history.replaceState({ ae: true, depth, state, snapshot: snapshot || capture(), overlay }, '', urlFor(state));
  } catch (error) {
    renderHeader();
    $('main').innerHTML = `<h1>${escape(t('loadFailed'))}</h1><p>${state.lang === 'ja' ? '通信またはデータの読み込みに失敗しました。再試行してください。' : 'The connection or data could not be read. Please retry.'}</p>${button(t('retry'), 'reload')}`;
    document.querySelector('[data-action=reload]').addEventListener('click', () => location.reload());
  }
}

start();
