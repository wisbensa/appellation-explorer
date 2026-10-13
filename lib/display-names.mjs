// Editorial display readings only. These never resolve official grape identity,
// change stable IDs, or establish legal synonyms. Original names remain visible.
const entries = `
Italia|イタリア
Italy|イタリア
Piemonte|ピエモンテ
Toscana|トスカーナ
Albugnano|アルブニャーノ
Erbaluce di Caluso|エルバルーチェ・ディ・カルーゾ
Barbera del Monferrato Superiore|バルベーラ・デル・モンフェッラート・スペリオーレ
Dolcetto di Ovada Superiore|ドルチェット・ディ・オヴァーダ・スペリオーレ
Ansonica Costa dell'Argentario|アンソニカ・コスタ・デッラルジェンターリオ
Costa Toscana|コスタ・トスカーナ
Alta Valle della Greve|アルタ・ヴァッレ・デッラ・グレーヴェ
Toscano|トスカーノ
Abrusco|アブルスコ
Albana|アルバーナ
Albarola|アルバローラ
Aleatico|アレアティコ
Alicante|アリカンテ
Alicante Bouschet|アリカンテ・ブーシェ
Ancellotta|アンチェロッタ
Ansonica|アンソニカ
Barbera|バルベーラ
Barsaglina|バルサリーナ
Biancone|ビアンコーネ
Bonamico|ボナミコ
Bonarda|ボナルダ
Bracciola Nera|ブラッチョーラ・ネーラ
Cabernet Franc|カベルネ・フラン
Cabernet Sauvignon|カベルネ・ソーヴィニヨン
Calabrese|カラブレーゼ
Caloria|カローリア
Canaiolo Bianco|カナイオーロ・ビアンコ
Canaiolo Nero|カナイオーロ・ネーロ
Canina Nera|カニーナ・ネーラ
Carignano|カリニャーノ
Carmenere|カルメネール
Cesanese D’Affile|チェザネーゼ・ダッフィーレ
Chardonnay|シャルドネ
Ciliegiolo|チリエジョーロ
Clairette|クレレット
Colombana Nera|コロンバーナ・ネーラ
Colorino|コロリーノ
Dolcetto|ドルチェット
Durella|ドゥレッラ
Erbaluce|エルバルーチェ
Fiano|フィアーノ
Foglia Tonda|フォリア・トンダ
Freisa|フレイザ
Gamay|ガメイ
Grechetto|グレケット
Greco|グレーコ
Grignolino|グリニョリーノ
Groppello Gentile|グロッペッロ・ジェンティーレ
Groppello di Santo Stefano|グロッペッロ・ディ・サント・ステーファノ
Incrocio Bruni 54|インクローチョ・ブルーニ54
Lambrusco Maestri|ランブルスコ・マエストリ
Livornese Bianca|リヴォルネーゼ・ビアンカ
Malbech|マルベック
Malvasia|マルヴァジア
Malvasia Bianca di Candia|マルヴァジア・ビアンカ・ディ・カンディア
Malvasia Bianca lunga|マルヴァジア・ビアンカ・ルンガ
Malvasia Istriana|マルヴァジア・イストリアーナ
Malvasia Nera di Brindisi|マルヴァジア・ネーラ・ディ・ブリンディジ
Malvasia Nera di Lecce|マルヴァジア・ネーラ・ディ・レッチェ
Mammolo|マンモロ
Manzoni Bianco|マンゾーニ・ビアンコ
Marsanne|マルサンヌ
Mazzese|マッツェーゼ
Merlot|メルロー
Mondeuse|モンドゥーズ
Montepulciano|モンテプルチャーノ
Moscato Bianco|モスカート・ビアンコ
Muller Thurgau|ミュラー・トゥルガウ
Nebbiolo|ネッビオーロ
Orpicchio|オルピッキオ
Petit manseng|プティ・マンサン
Petit verdot|プティ・ヴェルド
Pinot Bianco|ピノ・ビアンコ
Pinot Grigio|ピノ・グリージョ
Pinot Nero|ピノ・ネーロ
Pollera Nera|ポッレーラ・ネーラ
Prugnolo Gentile|プルニョーロ・ジェンティーレ
Pugnitello|プニテッロ
Rebo|レボ
Refosco dal Peduncolo rosso|レフォスコ・ダル・ペドゥンコロ・ロッソ
Riesling Italico|リースリング・イタリコ
Riesling Renano|リースリング・レナーノ
Roussane|ルーサンヌ
Sagrantino|サグランティーノ
Sanforte|サンフォルテ
Sangiovese|サンジョヴェーゼ
Sauvignon|ソーヴィニヨン
Schiava Gentile|スキアーヴァ・ジェンティーレ
Semillon|セミヨン
Syrah|シラー
Tempranillo|テンプラニーリョ
Teroldego|テロルデゴ
Traminer Aromatico|トラミネール・アロマティコ
Trebbiano Toscano|トレッビアーノ・トスカーノ
Verdea|ヴェルデーア
Verdello|ヴェルデッロ
Verdicchio Bianco|ヴェルディッキオ・ビアンコ
Vermentino|ヴェルメンティーノ
Vermentino Nero|ヴェルメンティーノ・ネーロ
Vernaccia di San Gimignano|ヴェルナッチャ・ディ・サン・ジミニャーノ
Viogner|ヴィオニエ
bianco|白
rosso|赤
rosato|ロゼ
spumante|発泡（スプマンテ）
frizzante|微発泡（フリッツァンテ）
passito|陰干し（パッシート）
liquoroso|酒精強化
vendemmia tardiva|遅摘み（ヴェンデンミア・タルディーヴァ）
riserva|リゼルヴァ
superiore|スペリオーレ
novello|ノヴェッロ
abboccato|やや甘口
amabile|中甘口
dolce|甘口
secco|辛口
`.trim().split('\n').map(line => line.split('|'));
const lookup = new Map(entries.map(([original, ja]) => [original.toLowerCase(), ja]));
const prefixes = [...entries].sort((a,b)=>b[0].length-a[0].length);
export function japaneseDisplay(original) {
  if (!original) return '';
  const primary = original.split(/\s+o\s+[“"]/i)[0];
  if (primary !== original) return japaneseDisplay(primary);
  const exact = lookup.get(original.toLowerCase());
  if (exact) return exact;
  const parts = [...new Set(original.split(/\s*\/\s*/))];
  if (parts.length > 1) return parts.map(part => japaneseDisplay(part) || part).join('・');
  for (const [prefix, ja] of prefixes) {
    if (original.toLowerCase().startsWith(prefix.toLowerCase() + ' ')) {
      const rest = original.slice(prefix.length + 1);
      const suffix = japaneseDisplay(rest);
      if (suffix) return `${ja} ${suffix}`;
    }
  }
  return '';
}

// Search-only editorial alias, bound to the retained identity and original name.
// Plantgrape / INRAE-IFV, Pinot noir, Synonymy (checked 2026-10-13):
// https://www.plantgrape.fr/en/varieties/fruit-varieties/218
// Pinot Nero is the Italian name. Japanese is an editorial reading of that
// confirmed synonym, not an official Japanese name or a legal permission.
// Never used by candidate generation, identity resolution or grape evaluation.
export function editorialSearchAliases(entity) {
  return entity?.kind === 'grape' && entity.id === 'grape-8df57f5847b0bd7dbe7b'
    && entity.name?.original === 'Pinot Nero' ? ['Pinot noir', 'ピノ・ノワール'] : [];
}
