export type EventStatus = "草稿配置" | "数调中" | "待开放报名" | "报名中" | "即将截止" | "付款确认中" | "已成团" | "已结束";
export type EventCategory = "同好活动" | "校园活动" | "会议会务" | "好友聚会" | "工作坊" | "快闪/市集";
export type EventTemplate = "基础报名" | "报名收款" | "选座活动" | "签到活动" | "分时预约" | "记录型聚会";
export type VenueType = "影院" | "咖啡馆" | "会议室" | "校园场地" | "Livehouse" | "展厅/市集";
export type VenueSupportStatus = "确认可办" | "可能可办" | "暂不支持" | "未知待确认";
export type EventFeeMode = "免费" | "收费" | "AA记账";
export type ExpenseCategory = "场地费" | "物料采购" | "餐饮茶歇" | "设备租赁" | "交通快递" | "宣传设计" | "其他";
export type ExpenseStatus = "预算中" | "已支付" | "待报销";
export type AnnouncementType = "报名通知" | "付款提醒" | "选座通知" | "成团通知" | "活动当日通知";
export type AnnouncementStatus = "草稿" | "已发布";

export type GatherEvent = {
  id: string;
  publicCode: string;
  name: string;
  category: EventCategory;
  template: EventTemplate;
  customTypeLabel: string;
  city: string;
  venue: string;
  address: string;
  startsAt: string;
  deadline: string;
  price: number;
  capacity: number;
  registered: number;
  acceptWaitlist?: boolean;
  paid: number;
  seated: number;
  status: EventStatus;
  allowMulti: boolean;
  maxPeoplePerOrder: number;
  orderPrefix: string;
  description: string;
  customFormConfig?: unknown;
  paymentCodeImg?: string;
  wechatGroupImg?: string;
};

export type EventOrganizerRole = "主办" | "联合主办" | "财务" | "现场协作" | "只读";

export type EventOrganizer = {
  eventId: string;
  userId: string;
  publicId: string;
  name: string;
  role: EventOrganizerRole;
  status?: "invited" | "active" | "declined";
};

export type Registration = {
  orderNumber: string;
  eventId: string;
  nickname: string;
  quantity: number;
  attendeeIds: string[];
  amount: number;
  registrationStatus: "已提交" | "已确认" | "候补" | "已取消";
  paymentStatus: "未付款" | "待审核" | "付款已确认" | "已驳回" | "已退款";
  seatStatus: string;
  createdAt: string;
  confirmationEta: string;
  paymentProof?: string;
  formAnswers?: unknown;
  checkInCode?: string;
  checkInStatus?: "NOT_ARRIVED" | "CHECKED_IN";
  refundPolicy: string;
};

export type EventAnnouncement = {
  id: string;
  eventId: string;
  type: AnnouncementType;
  title: string;
  content: string;
  status: AnnouncementStatus;
  publishedAt: string;
  audience: "全部参与者" | "待付款参与者" | "已确认参与者";
};

export type PollOption = {
  label: string;
  votes: number;
  selected?: boolean;
};

export type EventSetup = {
  eventId: string;
  setupStatus: "草稿配置" | "数调中" | "待开放报名" | "报名已开放";
  paymentQrStatus: "未配置" | "已配置";
  paymentMethod: "微信收款码" | "支付宝收款码" | "银行转账";
  surveyOptions: PollOption[];
  venueOptions: PollOption[];
  nextAction: string;
};

export type EventFinanceSetting = {
  eventId: string;
  feeMode: EventFeeMode;
  currency: "CNY";
  revenueSource: "报名订单" | "AA分摊" | "无收入";
  settlementRule: string;
};

export type EventExpense = {
  id: string;
  eventId: string;
  category: ExpenseCategory;
  title: string;
  amount: number;
  status: ExpenseStatus;
  paidBy: string;
  proof: string;
  note: string;
  createdAt: string;
};

export type EventFinanceSummary = {
  confirmedIncome: number;
  pendingIncome: number;
  refundedIncome: number;
  paidExpenses: number;
  budgetedExpenses: number;
  netBalance: number;
  perPaidPersonCost: number;
};

export type VenueIntel = {
  id: string;
  name: string;
  city: string;
  district: string;
  type: VenueType;
  supportStatus: VenueSupportStatus;
  suitableFor: string[];
  address: string;
  capacity: string;
  priceNote: string;
  contactNote: string;
  rating: number;
  reviewCount: number;
  lastVerified: string;
  highlights: string[];
  caveats: string[];
  organizerNotes: string;
  experienceScores: {
    communication: number;
    environment: number;
    setupFlexibility: number;
    valueForMoney: number;
  };
};

export const events: GatherEvent[] = [
  {
    id: "ryuichi-masterpiece",
    publicCode: "GU-RYU-20260622",
    name: "《坂本龙一：杰作》线下观影",
    category: "同好活动",
    template: "选座活动",
    customTypeLabel: "线下观影",
    city: "上海",
    venue: "百丽宫影城 环贸店",
    address: "上海市徐汇区淮海中路999号",
    startsAt: "2026-06-22 14:30",
    deadline: "2026-06-18 23:59",
    price: 88,
    capacity: 60,
    registered: 42,
    paid: 31,
    seated: 24,
    status: "数调中",
    allowMulti: true,
    maxPeoplePerOrder: 4,
    orderPrefix: "RYU",
    customFormConfig: {
      fields: [
        { id: "favorite_track", label: "最想听/看的片段", type: "text", required: false },
        { id: "notes", label: "同行备注", type: "textarea", required: false }
      ]
    },
    paymentCodeImg: "collection-codes/demo/ryu-wechat-v1.png",
    wechatGroupImg: "wechat-groups/demo/ryu-group.png",
    description:
      "同好组织的线下观影活动。报名成功后请按订单金额付款并上传截图，组织者确认后开放选座。"
  },
  {
    id: "spring-rerun",
    publicCode: "GU-SPR-20260629",
    name: "春日同好重映场",
    category: "同好活动",
    template: "选座活动",
    customTypeLabel: "线下观影",
    city: "杭州",
    venue: "浙影时代影城",
    address: "杭州市拱墅区湖墅南路",
    startsAt: "2026-06-29 19:00",
    deadline: "2026-06-25 22:00",
    price: 72,
    capacity: 32,
    registered: 26,
    paid: 18,
    seated: 0,
    status: "待开放报名",
    allowMulti: false,
    maxPeoplePerOrder: 1,
    orderPrefix: "SPR",
    description: "小规模重映观影活动，暂不开放多人报名。"
  },
  {
    id: "birthday-cafe-trial",
    publicCode: "GU-CAF-NJ0705",
    name: "生日咖试运营小聚",
    category: "同好活动",
    template: "分时预约",
    customTypeLabel: "生咖",
    city: "南京",
    venue: "雾岛咖啡",
    address: "南京市玄武区长江路",
    startsAt: "2026-07-05 12:00",
    deadline: "2026-07-01 20:00",
    price: 45,
    capacity: 80,
    registered: 36,
    paid: 21,
    seated: 0,
    status: "报名中",
    allowMulti: true,
    maxPeoplePerOrder: 6,
    orderPrefix: "CAF",
    description: "生咖活动模板的早期探索，用于验证预约和报名体验。"
  },
  {
    id: "campus-club-fair",
    publicCode: "GU-CLUB-20260712",
    name: "春季社团招新开放日",
    category: "校园活动",
    template: "签到活动",
    customTypeLabel: "校园招新",
    city: "广州",
    venue: "岭南大学生活动中心",
    address: "广州市番禺区大学城",
    startsAt: "2026-07-12 10:00",
    deadline: "2026-07-10 22:00",
    price: 0,
    capacity: 300,
    registered: 186,
    paid: 0,
    seated: 0,
    status: "报名中",
    allowMulti: false,
    maxPeoplePerOrder: 1,
    orderPrefix: "CLUB",
    customFormConfig: {
      fields: [
        { id: "student_id", label: "学号", type: "text", required: true, placeholder: "例如 20260001" },
        { id: "phone", label: "手机号", type: "phone", required: true },
        { id: "interest_clubs", label: "感兴趣的社团方向", type: "checkbox", required: true, options: ["文艺", "体育", "科技", "公益"], maxSelect: 2 },
        { id: "arrival_slot", label: "预计到场时段", type: "select", required: false, options: ["上午 10:00-12:00", "下午 14:00-16:00"] },
        { id: "notes", label: "想对社团说的话", type: "textarea", required: false }
      ]
    },
    description: "校园社团联合开放日，支持报名、名单、签到和活动通知。"
  },
  {
    id: "product-forum",
    publicCode: "GU-FORUM-BJ0718",
    name: "城市青年消费趋势闭门论坛",
    category: "会议会务",
    template: "签到活动",
    customTypeLabel: "闭门会议",
    city: "北京",
    venue: "望京会议中心",
    address: "北京市朝阳区望京街道",
    startsAt: "2026-07-18 13:30",
    deadline: "2026-07-15 18:00",
    price: 199,
    capacity: 120,
    registered: 74,
    paid: 61,
    seated: 0,
    status: "付款确认中",
    allowMulti: true,
    maxPeoplePerOrder: 3,
    orderPrefix: "FORUM",
    description: "面向品牌方和活动组织者的闭门交流会，支持报名收款和现场签到。"
  },
  {
    id: "friends-hotpot",
    publicCode: "GU-HOT-CD0720",
    name: "周末火锅局",
    category: "好友聚会",
    template: "记录型聚会",
    customTypeLabel: "好友聚餐",
    city: "成都",
    venue: "玉林路附近",
    address: "成都市武侯区",
    startsAt: "2026-07-20 18:30",
    deadline: "2026-07-19 20:00",
    price: 0,
    capacity: 8,
    registered: 6,
    paid: 0,
    seated: 0,
    status: "报名中",
    allowMulti: true,
    maxPeoplePerOrder: 2,
    orderPrefix: "HOT",
    description: "朋友之间的小聚记录，适合记录参与人、费用、时间和地点。"
  }
];

export const eventOrganizers: EventOrganizer[] = [
  {
    eventId: "ryuichi-masterpiece",
    userId: "user-miki",
    publicId: "GU-MIKI",
    name: "比奇堡miki",
    role: "主办"
  },
  {
    eventId: "ryuichi-masterpiece",
    userId: "user-tsuki",
    publicId: "GU-TSUKI",
    name: "月见草",
    role: "联合主办"
  },
  {
    eventId: "ryuichi-masterpiece",
    userId: "user-lime",
    publicId: "GU-LIME",
    name: "青柠",
    role: "财务"
  },
  {
    eventId: "spring-rerun",
    userId: "user-miki",
    publicId: "GU-MIKI",
    name: "比奇堡miki",
    role: "主办"
  },
  {
    eventId: "birthday-cafe-trial",
    userId: "user-tsuki",
    publicId: "GU-TSUKI",
    name: "月见草",
    role: "主办"
  },
  {
    eventId: "campus-club-fair",
    userId: "user-lime",
    publicId: "GU-LIME",
    name: "青柠",
    role: "主办"
  },
  {
    eventId: "product-forum",
    userId: "user-miki",
    publicId: "GU-MIKI",
    name: "比奇堡miki",
    role: "主办"
  },
  {
    eventId: "friends-hotpot",
    userId: "user-miki",
    publicId: "GU-MIKI",
    name: "比奇堡miki",
    role: "主办"
  }
];

export const eventSetups: EventSetup[] = [
  {
    eventId: "ryuichi-masterpiece",
    setupStatus: "数调中",
    paymentQrStatus: "已配置",
    paymentMethod: "微信收款码",
    surveyOptions: [
      { label: "6月21日 周日 14:00", votes: 18 },
      { label: "6月22日 周一 19:30", votes: 34, selected: true },
      { label: "6月23日 周二 19:30", votes: 27 }
    ],
    venueOptions: [
      { label: "百丽宫影城 环贸店", votes: 29, selected: true },
      { label: "大光明电影院", votes: 21 },
      { label: "百美汇影城 静安店", votes: 15 }
    ],
    nextAction: "确认数调和地点结果后，开放正式报名与付款截图上传。"
  },
  {
    eventId: "spring-rerun",
    setupStatus: "待开放报名",
    paymentQrStatus: "已配置",
    paymentMethod: "支付宝收款码",
    surveyOptions: [
      { label: "6月28日 周日 15:00", votes: 9 },
      { label: "6月29日 周一 19:00", votes: 17, selected: true }
    ],
    venueOptions: [
      { label: "浙影时代影城", votes: 16, selected: true },
      { label: "杭州百美汇影城", votes: 8 }
    ],
    nextAction: "报名可开放，等待组织者发布活动链接。"
  },
  {
    eventId: "campus-club-fair",
    setupStatus: "报名已开放",
    paymentQrStatus: "未配置",
    paymentMethod: "微信收款码",
    surveyOptions: [
      { label: "7月12日 周日 10:00", votes: 142, selected: true },
      { label: "7月12日 周日 14:00", votes: 98 }
    ],
    venueOptions: [
      { label: "大学生活动中心", votes: 156, selected: true },
      { label: "图书馆报告厅", votes: 72 }
    ],
    nextAction: "免费活动无需收款码，重点处理签到名单和现场动线。"
  },
  {
    eventId: "birthday-cafe-trial",
    setupStatus: "报名已开放",
    paymentQrStatus: "已配置",
    paymentMethod: "微信收款码",
    surveyOptions: [
      { label: "7月5日 周日 12:00", votes: 24, selected: true },
      { label: "7月5日 周日 15:00", votes: 18 },
      { label: "7月6日 周一 13:00", votes: 11 }
    ],
    venueOptions: [
      { label: "雾岛咖啡", votes: 31, selected: true },
      { label: "新街口快闪空间", votes: 14 },
      { label: "玄武区共享会客厅", votes: 9 }
    ],
    nextAction: "报名已开放，重点确认分时预约人数和物料发放节奏。"
  },
  {
    eventId: "product-forum",
    setupStatus: "报名已开放",
    paymentQrStatus: "已配置",
    paymentMethod: "银行转账",
    surveyOptions: [
      { label: "7月18日 周六 13:30", votes: 42, selected: true },
      { label: "7月18日 周六 16:00", votes: 25 }
    ],
    venueOptions: [
      { label: "望京会议中心", votes: 48, selected: true },
      { label: "三里屯共享会议厅", votes: 19 }
    ],
    nextAction: "报名与付款审核进行中，后续重点处理签到名单和现场分组。"
  },
  {
    eventId: "friends-hotpot",
    setupStatus: "报名已开放",
    paymentQrStatus: "未配置",
    paymentMethod: "微信收款码",
    surveyOptions: [
      { label: "7月20日 周一 18:30", votes: 6, selected: true },
      { label: "7月21日 周二 19:00", votes: 3 }
    ],
    venueOptions: [
      { label: "玉林路附近", votes: 5, selected: true },
      { label: "芳草街附近", votes: 2 }
    ],
    nextAction: "好友聚会按 AA 记账处理，活动后补充实际支出并生成分摊结果。"
  }
];

export const eventFinanceSettings: EventFinanceSetting[] = [
  {
    eventId: "ryuichi-masterpiece",
    feeMode: "收费",
    currency: "CNY",
    revenueSource: "报名订单",
    settlementRule: "按订单实收统计收入，活动结束后根据实际支出确认结余。"
  },
  {
    eventId: "spring-rerun",
    feeMode: "收费",
    currency: "CNY",
    revenueSource: "报名订单",
    settlementRule: "未成团时原路退款，成团后按实际场地费核算。"
  },
  {
    eventId: "birthday-cafe-trial",
    feeMode: "收费",
    currency: "CNY",
    revenueSource: "报名订单",
    settlementRule: "按分时预约订单统计收入，物料和场地低消分别记账。"
  },
  {
    eventId: "campus-club-fair",
    feeMode: "免费",
    currency: "CNY",
    revenueSource: "无收入",
    settlementRule: "免费活动只记录支出，便于社团或学校报销。"
  },
  {
    eventId: "product-forum",
    feeMode: "收费",
    currency: "CNY",
    revenueSource: "报名订单",
    settlementRule: "按企业或个人报名订单确认收入，活动结束后统一核算场地、茶歇和设备支出。"
  },
  {
    eventId: "friends-hotpot",
    feeMode: "AA记账",
    currency: "CNY",
    revenueSource: "AA分摊",
    settlementRule: "先记录总支出，活动后按实际参与人数平摊。"
  }
];

export const eventExpenses: EventExpense[] = [
  {
    id: "expense-ryu-venue",
    eventId: "ryuichi-masterpiece",
    category: "场地费",
    title: "百丽宫影城包场定金",
    amount: 2400,
    status: "已支付",
    paidBy: "GU-MIKI",
    proof: "cinema-deposit-ryu.jpg",
    note: "工作日下午场定金，尾款按最终人数确认。",
    createdAt: "2026-05-20"
  },
  {
    id: "expense-ryu-material",
    eventId: "ryuichi-masterpiece",
    category: "物料采购",
    title: "纪念票根和手幅打样",
    amount: 368,
    status: "已支付",
    paidBy: "GU-TSUKI",
    proof: "print-proof-ryu.jpg",
    note: "含设计打样和首批印刷。",
    createdAt: "2026-05-21"
  },
  {
    id: "expense-ryu-delivery",
    eventId: "ryuichi-masterpiece",
    category: "交通快递",
    title: "物料快递和现场交通",
    amount: 126,
    status: "预算中",
    paidBy: "GU-LIME",
    proof: "pending",
    note: "活动前一周确认最终金额。",
    createdAt: "2026-05-22"
  },
  {
    id: "expense-cafe-minimum",
    eventId: "birthday-cafe-trial",
    category: "场地费",
    title: "雾岛咖啡低消预付",
    amount: 1200,
    status: "已支付",
    paidBy: "GU-TSUKI",
    proof: "cafe-minimum.jpg",
    note: "分时段预约，含基础饮品套餐。",
    createdAt: "2026-05-18"
  },
  {
    id: "expense-club-poster",
    eventId: "campus-club-fair",
    category: "宣传设计",
    title: "招新海报印刷",
    amount: 460,
    status: "待报销",
    paidBy: "GU-LIME",
    proof: "club-poster-receipt.jpg",
    note: "免费活动，后续走社团经费报销。",
    createdAt: "2026-05-19"
  },
  {
    id: "expense-hotpot-meal",
    eventId: "friends-hotpot",
    category: "餐饮茶歇",
    title: "火锅餐费预估",
    amount: 960,
    status: "预算中",
    paidBy: "GU-MIKI",
    proof: "pending",
    note: "按 8 人估算，活动后改成实际金额。",
    createdAt: "2026-05-22"
  }
];

export const venues: VenueIntel[] = [
  {
    id: "sh-palace-iapm",
    name: "百丽宫影城 环贸店",
    city: "上海",
    district: "徐汇区",
    type: "影院",
    supportStatus: "确认可办",
    suitableFor: ["线下观影", "映后交流", "品牌小型放映"],
    address: "上海市徐汇区淮海中路999号环贸iapm",
    capacity: "约 50-90 人，视影厅而定",
    priceNote: "包场价格随影片、日期和影厅变化，工作日白天更容易谈。",
    contactNote: "建议提前 2-3 周联系影城市场或团体票负责人。",
    rating: 4.7,
    reviewCount: 18,
    lastVerified: "2026-05-12",
    highlights: ["交通方便", "影厅体验稳定", "适合中小规模同好观影", "周边餐饮选择多"],
    caveats: ["热门档期价格波动明显", "物料布置需要提前确认", "可选影厅受排片影响"],
    organizerNotes: "过往组织者反馈沟通效率较高，适合需要选座和付款审核的观影活动。",
    experienceScores: {
      communication: 4.6,
      environment: 4.8,
      setupFlexibility: 4.1,
      valueForMoney: 4.3
    }
  },
  {
    id: "sh-grand-cinema",
    name: "大光明电影院",
    city: "上海",
    district: "黄浦区",
    type: "影院",
    supportStatus: "可能可办",
    suitableFor: ["线下观影", "经典片重映", "影迷交流"],
    address: "上海市黄浦区南京西路216号",
    capacity: "中大型影厅较多，需按场次沟通",
    priceNote: "历史建筑和热门场次限制较多，需要单独确认报价。",
    contactNote: "适合先电话确认档期，再邮件补充活动需求。",
    rating: 4.5,
    reviewCount: 9,
    lastVerified: "2026-04-28",
    highlights: ["城市地标感强", "观影氛围好", "适合经典片主题活动"],
    caveats: ["审批和排期可能较慢", "现场布置空间有限", "大型活动需更早沟通"],
    organizerNotes: "适合有明确片源和日期弹性的组织者，建议准备多个备选时间。",
    experienceScores: {
      communication: 3.9,
      environment: 4.9,
      setupFlexibility: 3.6,
      valueForMoney: 4.0
    }
  },
  {
    id: "hz-zheying-times",
    name: "浙影时代影城",
    city: "杭州",
    district: "拱墅区",
    type: "影院",
    supportStatus: "确认可办",
    suitableFor: ["线下观影", "小型重映场", "社群包场"],
    address: "杭州市拱墅区湖墅南路",
    capacity: "约 30-70 人",
    priceNote: "小厅灵活度较高，适合预算有限的同好活动。",
    contactNote: "建议明确人数、影片、是否需要选座和付款截图管理。",
    rating: 4.4,
    reviewCount: 11,
    lastVerified: "2026-05-03",
    highlights: ["小厅友好", "价格相对可控", "沟通反馈快"],
    caveats: ["影厅设备差异需提前看场", "周末黄金时段不一定可约"],
    organizerNotes: "如果人数不确定，可以先用 GatherUp 做数调，再带着预估人数沟通。",
    experienceScores: {
      communication: 4.5,
      environment: 4.2,
      setupFlexibility: 4.4,
      valueForMoney: 4.6
    }
  },
  {
    id: "nj-kirishima-coffee",
    name: "雾岛咖啡",
    city: "南京",
    district: "玄武区",
    type: "咖啡馆",
    supportStatus: "确认可办",
    suitableFor: ["生咖", "生日应援", "小型同好聚会"],
    address: "南京市玄武区长江路",
    capacity: "约 40-80 人，分时段更稳",
    priceNote: "通常按低消或套餐沟通，物料布置可能另算清洁费。",
    contactNote: "需要提前确认布置范围、音乐播放、拍照动线和撤场时间。",
    rating: 4.6,
    reviewCount: 24,
    lastVerified: "2026-05-09",
    highlights: ["出片效果好", "店员配合度高", "适合分时预约", "桌面布置空间足"],
    caveats: ["高峰时段不适合长时间占位", "大型立牌需提前确认", "同日多批次需要控流"],
    organizerNotes: "适合生咖试运营。建议用分时段预约，避免现场拥堵和排队体验下降。",
    experienceScores: {
      communication: 4.7,
      environment: 4.6,
      setupFlexibility: 4.5,
      valueForMoney: 4.2
    }
  },
  {
    id: "bj-wangjing-conference",
    name: "望京会议中心",
    city: "北京",
    district: "朝阳区",
    type: "会议室",
    supportStatus: "确认可办",
    suitableFor: ["闭门会议", "工作坊", "品牌分享会"],
    address: "北京市朝阳区望京街道",
    capacity: "约 60-160 人",
    priceNote: "按半天或全天计费，投影、茶歇和签到台需分项确认。",
    contactNote: "适合用正式邮件沟通议程、人数和设备清单。",
    rating: 4.3,
    reviewCount: 7,
    lastVerified: "2026-04-19",
    highlights: ["商务感强", "设备完整", "适合签到活动"],
    caveats: ["价格透明但附加项多", "入场布置时间需要写进合同"],
    organizerNotes: "适合会议会务类活动，财务中心可记录场租、茶歇和设备费。",
    experienceScores: {
      communication: 4.2,
      environment: 4.4,
      setupFlexibility: 3.9,
      valueForMoney: 3.8
    }
  },
  {
    id: "cd-yulin-private-room",
    name: "玉林路小型包间",
    city: "成都",
    district: "武侯区",
    type: "咖啡馆",
    supportStatus: "未知待确认",
    suitableFor: ["好友聚会", "读书会", "小型桌游"],
    address: "成都市武侯区玉林路附近",
    capacity: "约 8-16 人",
    priceNote: "可能按低消或小时费，需要组织者补充验证。",
    contactNote: "目前缺少有效联系方式，等待活动组织者提交经验。",
    rating: 3.8,
    reviewCount: 2,
    lastVerified: "2026-03-30",
    highlights: ["适合小规模聚会", "周边餐饮多"],
    caveats: ["是否能承接公开活动未知", "隔音和低消待确认"],
    organizerNotes: "作为城市候选点保留，下一次活动后应补充真实沟通记录。",
    experienceScores: {
      communication: 3.2,
      environment: 4.0,
      setupFlexibility: 3.5,
      valueForMoney: 4.1
    }
  }
];

export const registrations: Registration[] = [
  {
    orderNumber: "RYU-0001",
    eventId: "ryuichi-masterpiece",
    nickname: "比奇堡miki",
    quantity: 2,
    attendeeIds: ["GU-MIKI", "GU-TSUKI"],
    amount: 176,
    registrationStatus: "已确认",
    paymentStatus: "付款已确认",
    seatStatus: "C5, C6",
    createdAt: "2026-05-18",
    confirmationEta: "已确认",
    paymentProof: "wechat-pay-ryu-0001.jpg",
    formAnswers: { favorite_track: "Merry Christmas Mr. Lawrence", notes: "希望和同行坐一起" },
    checkInCode: "RYU0001-DEMO-CHECK-IN",
    checkInStatus: "NOT_ARRIVED",
    refundPolicy: "开场前 48 小时可联系组织者登记退款，手续费按实际支付渠道规则处理。"
  },
  {
    orderNumber: "SPR-0007",
    eventId: "spring-rerun",
    nickname: "比奇堡miki",
    quantity: 1,
    attendeeIds: ["GU-MIKI"],
    amount: 72,
    registrationStatus: "已提交",
    paymentStatus: "待审核",
    seatStatus: "未开放",
    createdAt: "2026-05-18",
    confirmationEta: "预计 24 小时内确认",
    paymentProof: "alipay-spr-0007.jpg",
    formAnswers: { notes: "付款截图已上传" },
    checkInCode: "SPR0007-DEMO-CHECK-IN",
    checkInStatus: "NOT_ARRIVED",
    refundPolicy: "活动未成团会原路退款；个人取消需在报名截止前联系组织者。"
  },
  {
    orderNumber: "SPR-0029",
    eventId: "spring-rerun",
    nickname: "比奇堡miki",
    quantity: 1,
    attendeeIds: ["GU-MIKI"],
    amount: 72,
    registrationStatus: "已提交",
    paymentStatus: "待审核",
    seatStatus: "未开放",
    createdAt: "2026-05-19",
    confirmationEta: "预计 24 小时内确认",
    paymentProof: "pending-upload-preview.jpg",
    formAnswers: { notes: "等待审核" },
    checkInCode: "SPR0029-DEMO-CHECK-IN",
    checkInStatus: "NOT_ARRIVED",
    refundPolicy: "活动未成团会原路退款；个人取消需在报名截止前联系组织者。"
  }
];

export const eventAnnouncements: EventAnnouncement[] = [
  {
    id: "ann-ryu-survey",
    eventId: "ryuichi-masterpiece",
    type: "报名通知",
    title: "数调和地点投票已开放",
    content: "请先提交可参加时间和地点偏好。当前阶段不会生成订单，也不会占用名额。",
    status: "已发布",
    publishedAt: "2026-05-20 18:30",
    audience: "全部参与者"
  },
  {
    id: "ann-ryu-payment",
    eventId: "ryuichi-masterpiece",
    type: "付款提醒",
    title: "付款截图请备注订单号",
    content: "开放正式报名后，请按订单金额付款，并在截图备注中写上订单号和昵称，方便组织者快速核对。",
    status: "草稿",
    publishedAt: "待发布",
    audience: "待付款参与者"
  },
  {
    id: "ann-spr-open",
    eventId: "spring-rerun",
    type: "报名通知",
    title: "报名即将开放",
    content: "时间和地点已基本确认，组织者完成最后检查后会开放正式报名入口。",
    status: "已发布",
    publishedAt: "2026-05-21 12:00",
    audience: "全部参与者"
  },
  {
    id: "ann-club-day",
    eventId: "campus-club-fair",
    type: "活动当日通知",
    title: "开放日签到说明",
    content: "请在入口处出示 GatherUp ID 完成签到。建议提前 10 分钟到达，现场会按社团区域分流。",
    status: "已发布",
    publishedAt: "2026-05-22 09:00",
    audience: "已确认参与者"
  }
];

export function findEvent(eventId: string) {
  return events.find((event) => event.id === eventId);
}

export function getEvent(eventId: string) {
  return findEvent(eventId) ?? events[0];
}

export function getEventOrganizers(eventId: string) {
  return eventOrganizers.filter((organizer) => organizer.eventId === eventId);
}

export function getEventRegistrations(eventId: string) {
  return registrations.filter((registration) => registration.eventId === eventId);
}

export function getEventAnnouncements(eventId: string) {
  return eventAnnouncements.filter((announcement) => announcement.eventId === eventId);
}

export function getEventSetup(eventId: string) {
  return eventSetups.find((setup) => setup.eventId === eventId) ?? eventSetups[0];
}

export function getEventFinanceSetting(eventId: string) {
  return eventFinanceSettings.find((setting) => setting.eventId === eventId) ?? eventFinanceSettings[0];
}

export function getEventExpenses(eventId: string) {
  return eventExpenses.filter((expense) => expense.eventId === eventId);
}

export function getEventFinanceSummary(eventId: string): EventFinanceSummary {
  const eventRegistrations = getEventRegistrations(eventId);
  const expenses = getEventExpenses(eventId);
  const confirmedIncome = eventRegistrations
    .filter((registration) => registration.paymentStatus === "付款已确认")
    .reduce((sum, registration) => sum + registration.amount, 0);
  const pendingIncome = eventRegistrations
    .filter((registration) => registration.paymentStatus === "待审核")
    .reduce((sum, registration) => sum + registration.amount, 0);
  const refundedIncome = eventRegistrations
    .filter((registration) => registration.paymentStatus === "已退款")
    .reduce((sum, registration) => sum + registration.amount, 0);
  const paidExpenses = expenses
    .filter((expense) => expense.status === "已支付" || expense.status === "待报销")
    .reduce((sum, expense) => sum + expense.amount, 0);
  const budgetedExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const paidPeople = eventRegistrations
    .filter((registration) => registration.paymentStatus === "付款已确认")
    .reduce((sum, registration) => sum + registration.quantity, 0);

  return {
    confirmedIncome,
    pendingIncome,
    refundedIncome,
    paidExpenses,
    budgetedExpenses,
    netBalance: confirmedIncome - budgetedExpenses,
    perPaidPersonCost: paidPeople > 0 ? Math.round((budgetedExpenses / paidPeople) * 10) / 10 : 0
  };
}

export function findRegistration(orderNumber: string) {
  return registrations.find((registration) => registration.orderNumber === orderNumber);
}

export function getRegistration(orderNumber: string) {
  return findRegistration(orderNumber) ?? registrations[0];
}

export function findVenue(venueId: string) {
  return venues.find((venue) => venue.id === venueId);
}

export function getVenue(venueId: string) {
  return findVenue(venueId) ?? venues[0];
}
