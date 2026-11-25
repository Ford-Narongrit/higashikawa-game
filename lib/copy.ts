// ข้อความทั้งหมดของแอป แก้ที่นี่ที่เดียว
// ใส่ฟุริงานะด้วยรูปแบบ {漢字|かんじ} → แสดงเป็น <ruby> (ดู components/Furi.tsx)

export const copy = {
  appName: "HIGASHIKAWA GAME",

  // ---- หน้าผู้เล่น: เข้าร่วม ----
  join: {
    title: "ようこそ！",
    nameLabel: "{名前|なまえ}",
    namePlaceholder: "なまえ",
    roomLabel: "クラス",
    submit: "さんか する",
    rejoinButton: "もどる",
    rejoinHint: "まえに さんか した 人は こちら",
  },

  pin: {
    title: "あなたの PIN",
    screenshot: "この がめんを スクショ してね！",
    why: "もどる とき、この PIN を つかいます。",
    ok: "OK、スクショ した",
  },

  conflict: {
    title: "おなじ なまえの 人が います",
    question: "あなたですか？",
    itsMe: "もどる（わたしです）",
    notMe: "ちがう人です",
  },

  rejoin: {
    title: "もどる",
    pinLabel: "PIN（4けた）",
    submit: "もどる",
    back: "← さんか する",
  },

  waiting: {
    title: "まってね",
    sub: "もうすぐ チームが わかります",
    count: (n: number) => `いま ${n}人`,
  },

  revealed: {
    yourTeam: "あなたの チーム",
    hello: (name: string) => `${name}さん`,
    scores: "スコア",
  },

  box: {
    title: "プレゼント",
    open: "あける！",
    scanHint: "カメラで はこの QR を よみとっても OK",
    notYet: "まだ あけられません。まってね",
    sixChars: "コードは 6もじ です",
    used: "このコードは もう つかわれました",
    invalid: "このコードは ありません。もう いちど みてね",
    closed: "いまは あけられません",
    noTeam: "チームが きまってから あけてね",
    afterReveal: "チームが きまったら プレゼントを あけられます",
    congrats: "おめでとう！",
    unlucky: "ざんねん…",
    tapToClose: "タップで とじる",
  },

  photo: {
    title: "しゃしん",
    pick: (left: number) => `しゃしんを おくる（あと ${left}まい）`,
    uploading: "おくっています…",
    retry: "もう いちど",
    failed: "おくれませんでした。↻ を おしてね",
    badFile: "この しゃしんは つかえません",
    limit: (max: number) => `もう おくれません（${max}まいまで）`,
    closed: "いまは おくれません",
    status: { pending: "チェックちゅう", approved: "OK！", rejected: "NG" },
  },

  errors: {
    nameRequired: "なまえを いれてね",
    roomRequired: "クラスを えらんでね",
    pinFormat: "PIN は 4けたの すうじ です",
    pinWrong: "PIN が ちがいます",
    locked: "すこし まってから、もう いちど してね",
    notFound: "その なまえは みつかりません",
    network: "つながりません。もう いちど おしてね",
    unknown: "エラーです。もう いちど おしてね",
  },

  // ---- จอเวที ----
  screen: {
    scanTitle: "スマホで よみとってね",
    joinedCount: (n: number) => `${n}人`,
    joinedLabel: "さんか",
    teamsWaiting: "チーム はっぴょう まで まってね",
    leaderboard: "スコア",
    soundOff: "クリックで おと ON",
    kind: { admin: "ゲーム", box: "プレゼント", photo: "しゃしん" },
  },
} as const;

// ---- หน้าแอดมิน: มี 3 ภาษา (ไทย / English / 日本語) สลับได้ที่หัวหน้า /admin ----
const adminTh = {
  loginTitle: "เข้าสู่ระบบแอดมิน",
  password: "รหัสผ่าน",
  login: "เข้าสู่ระบบ",
  wrongPassword: "รหัสผ่านไม่ถูกต้อง",
  logout: "ออกจากระบบ",

  screenView: "จอเวที",
  views: { join: "QR เข้าร่วม", teams: "ทีม", leaderboard: "คะแนน", tree: "ต้นไม้ 3D" },

  reveal: "เปิดเผยทีม",
  revealConfirm1: "แน่ใจไหม? จะแบ่งทีมทุกคนตอนนี้",
  revealConfirm2: "ยืนยันอีกครั้ง — กดแล้วย้อนไม่ได้",
  revealDone: "เปิดเผยทีมแล้ว",
  cancel: "ยกเลิก",

  boxOpen: "เปิดระบบกล่อง",
  photoOpen: "เปิดส่งรูป",

  players: "ผู้เล่น",
  search: "ค้นหาชื่อ…",
  addPlayer: "เพิ่มผู้เล่น (คนไม่มีมือถือ)",
  add: "เพิ่ม",
  resetPin: "รีเซ็ต PIN",
  newPin: "PIN ใหม่",
  moveTeam: "ย้ายทีม",
  delete: "ลบ",
  deleteConfirm: (name: string) => `ลบ ${name}? (คะแนนที่ทีมได้ไปแล้วจะยังอยู่)`,
  noTeam: "ยังไม่มีทีม",
  total: (n: number) => `ทั้งหมด ${n} คน`,

  scores: "คะแนน",
  points: "คะแนน",
  label: "ข้อความ เช่น ゲーム1 1位",
  addScore: "เพิ่มคะแนน",
  scoreInvalid: "เลือกทีมและใส่คะแนนเป็นจำนวนเต็มก่อน",
  void: "ยกเลิก",
  restore: "คืนค่า",
  voidConfirm: (label: string, points: number) => `ยกเลิก "${label}" (${points})?`,
  kinds: { admin: "เกม", box: "กล่อง", photo: "รูป" },
  exportScores: "Export คะแนน (ข้อความ)",
  exportCopied: "คัดลอกแล้ว — วางใน LINE/โน้ตได้เลย",

  boxes: "กล่องของขวัญ",
  boxStats: (total: number, used: number) => `รหัสทั้งหมด ${total} · ใช้แล้ว ${used}`,
  generateCodes: "สร้างรหัส",
  boxCountInvalid: "ใส่จำนวน 1–500",
  printBatch: (n: number) => `พิมพ์ชุดที่เพิ่งสร้าง (${n})`,
  printUnused: "พิมพ์ทุกรหัสที่ยังไม่ใช้",
  showList: "ดูรายการรหัส",
  hideList: "ซ่อนรายการ",
  prizeTable: "ตารางรางวัล (คะแนน / น้ำหนัก → %)",
  prizeInvalid: "ตารางรางวัลไม่ถูกต้อง: คะแนนต้องเป็นจำนวนเต็ม น้ำหนักต้องมากกว่า 0",
  expectedPoints: (n: number) => `คะแนนเฉลี่ยต่อกล่อง ≈ ${n}`,
  save: "บันทึก",
  saved: "บันทึกแล้ว",
  print: "พิมพ์",

  photos: "ตรวจรูป",
  photoTabs: { pending: "รอตรวจ", approved: "ผ่าน", rejected: "ไม่ผ่าน" },
  photoKeys: "คีย์ลัด: ← → เลือก · A/Enter ผ่าน · X/Backspace ไม่ผ่าน · Space ดูรูปใหญ่",
  noPhotos: "ไม่มีรูป",
  rejectApproved: "รูปนี้ผ่านไปแล้ว — ไม่ผ่าน จะยกเลิกคะแนนของรูปนี้ด้วย ยืนยัน?",
  photoPoints: "คะแนน/รูป",
  maxPhotos: "รูป/คน",
  photoCap: "เพดานคะแนนรูป/ทีม (ว่าง = ไม่จำกัด)",

  resetTitle: "รีเซ็ตข้อมูลทั้งหมด",
  resetHelp:
    "ลบผู้เล่น คะแนน รหัสกล่อง และรูปทั้งหมด (รวมไฟล์ใน Storage) แล้วกลับไปก่อนเปิดเผยทีม · เก็บตั้งค่ารางวัล/รูปไว้ · พิมพ์ RESET เพื่อยืนยัน",
  resetButton: "ลบทั้งหมด",
  printCount: (n: number) => `${n} รหัส · 12 ใบต่อหน้า A4`,
};

export type AdminCopy = typeof adminTh;

const adminEn: AdminCopy = {
  loginTitle: "Admin login",
  password: "Password",
  login: "Log in",
  wrongPassword: "Wrong password",
  logout: "Log out",

  screenView: "Stage screen",
  views: { join: "Join QR", teams: "Teams", leaderboard: "Scores", tree: "3D tree" },

  reveal: "Reveal teams",
  revealConfirm1: "Are you sure? Everyone will be split into teams now.",
  revealConfirm2: "Confirm again — this cannot be undone.",
  revealDone: "Teams revealed",
  cancel: "Cancel",

  boxOpen: "Gift boxes open",
  photoOpen: "Photo upload open",

  players: "Players",
  search: "Search name…",
  addPlayer: "Add player (no phone)",
  add: "Add",
  resetPin: "Reset PIN",
  newPin: "New PIN",
  moveTeam: "Move team",
  delete: "Delete",
  deleteConfirm: (name: string) => `Delete ${name}? (Points their team already earned stay.)`,
  noTeam: "No team yet",
  total: (n: number) => `${n} total`,

  scores: "Scores",
  points: "Points",
  label: "Label, e.g. ゲーム1 1位",
  addScore: "Add points",
  scoreInvalid: "Pick a team and enter a whole number first",
  void: "Void",
  restore: "Restore",
  voidConfirm: (label: string, points: number) => `Void "${label}" (${points})?`,
  kinds: { admin: "Game", box: "Box", photo: "Photo" },
  exportScores: "Export scores (text)",
  exportCopied: "Copied — paste it into LINE or notes",

  boxes: "Gift boxes",
  boxStats: (total: number, used: number) => `${total} codes · ${used} used`,
  generateCodes: "Generate codes",
  boxCountInvalid: "Enter a number from 1 to 500",
  printBatch: (n: number) => `Print last batch (${n})`,
  printUnused: "Print all unused codes",
  showList: "Show code list",
  hideList: "Hide list",
  prizeTable: "Prize table (points / weight → %)",
  prizeInvalid: "Invalid prize table: points must be whole numbers, weights must be above 0",
  expectedPoints: (n: number) => `Average points per box ≈ ${n}`,
  save: "Save",
  saved: "Saved",
  print: "Print",

  photos: "Photo review",
  photoTabs: { pending: "Pending", approved: "Approved", rejected: "Rejected" },
  photoKeys: "Keys: ← → select · A/Enter approve · X/Backspace reject · Space zoom",
  noPhotos: "No photos",
  rejectApproved: "This photo is already approved — rejecting it also voids its points. Continue?",
  photoPoints: "Points/photo",
  maxPhotos: "Photos/player",
  photoCap: "Photo points cap per team (blank = no limit)",

  resetTitle: "Reset all data",
  resetHelp:
    "Deletes all players, scores, box codes and photos (including Storage files) and goes back to before the team reveal · Prize/photo settings are kept · Type RESET to confirm",
  resetButton: "Delete everything",
  printCount: (n: number) => `${n} codes · 12 per A4 page`,
};

const adminJa: AdminCopy = {
  loginTitle: "管理者ログイン",
  password: "パスワード",
  login: "ログイン",
  wrongPassword: "パスワードが違います",
  logout: "ログアウト",

  screenView: "ステージ画面",
  views: { join: "参加QR", teams: "チーム", leaderboard: "スコア", tree: "3Dツリー" },

  reveal: "チーム発表",
  revealConfirm1: "本当によろしいですか？今すぐ全員をチームに分けます。",
  revealConfirm2: "最終確認 — 取り消しできません。",
  revealDone: "チーム発表済み",
  cancel: "キャンセル",

  boxOpen: "プレゼント受付",
  photoOpen: "写真受付",

  players: "参加者",
  search: "名前で検索…",
  addPlayer: "参加者を追加（スマホなし）",
  add: "追加",
  resetPin: "PINリセット",
  newPin: "新しいPIN",
  moveTeam: "チーム変更",
  delete: "削除",
  deleteConfirm: (name: string) => `${name} を削除しますか？（チームの獲得済みポイントは残ります）`,
  noTeam: "チーム未定",
  total: (n: number) => `合計 ${n} 人`,

  scores: "スコア",
  points: "ポイント",
  label: "ラベル 例: ゲーム1 1位",
  addScore: "ポイント追加",
  scoreInvalid: "チームを選び、整数のポイントを入力してください",
  void: "取消",
  restore: "元に戻す",
  voidConfirm: (label: string, points: number) => `「${label}」(${points}) を取り消しますか？`,
  kinds: { admin: "ゲーム", box: "プレゼント", photo: "写真" },
  exportScores: "スコアをテキスト出力",
  exportCopied: "コピーしました — LINEやメモに貼り付けできます",

  boxes: "プレゼント箱",
  boxStats: (total: number, used: number) => `コード ${total} 件 · 使用済み ${used}`,
  generateCodes: "コード作成",
  boxCountInvalid: "1〜500 の数を入力してください",
  printBatch: (n: number) => `作成したコードを印刷 (${n})`,
  printUnused: "未使用のコードをすべて印刷",
  showList: "コード一覧を表示",
  hideList: "一覧を隠す",
  prizeTable: "賞品テーブル（ポイント / 重み → %）",
  prizeInvalid: "賞品テーブルが正しくありません：ポイントは整数、重みは 0 より大きくしてください",
  expectedPoints: (n: number) => `1箱あたりの平均 ≈ ${n} ポイント`,
  save: "保存",
  saved: "保存しました",
  print: "印刷",

  photos: "写真チェック",
  photoTabs: { pending: "未確認", approved: "承認", rejected: "却下" },
  photoKeys: "ショートカット: ← → 選択 · A/Enter 承認 · X/Backspace 却下 · Space 拡大",
  noPhotos: "写真はありません",
  rejectApproved: "この写真は承認済みです。却下するとポイントも取り消されます。よろしいですか？",
  photoPoints: "ポイント/枚",
  maxPhotos: "枚/人",
  photoCap: "チームごとの写真ポイント上限（空欄 = 無制限）",

  resetTitle: "全データをリセット",
  resetHelp:
    "参加者・スコア・コード・写真（Storage のファイルを含む）をすべて削除し、チーム発表前に戻します · 賞品/写真の設定は残ります · 確認のため RESET と入力してください",
  resetButton: "すべて削除",
  printCount: (n: number) => `${n} コード · A4 1枚に 12 枚`,
};

export const ADMIN_LANGS = [
  { key: "th", label: "ไทย" },
  { key: "en", label: "EN" },
  { key: "ja", label: "日本語" },
] as const;
export type AdminLang = (typeof ADMIN_LANGS)[number]["key"];
export const adminCopies: Record<AdminLang, AdminCopy> = { th: adminTh, en: adminEn, ja: adminJa };
