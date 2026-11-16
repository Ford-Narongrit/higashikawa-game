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

// ---- หน้าแอดมิน (Ford ใช้คนเดียว จึงเป็นภาษาไทย) ----
export const adminCopy = {
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
} as const;
