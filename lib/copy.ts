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
    comingSoon: "じゅんびちゅう",
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
} as const;
