// The spec's §4 examples; exodus-ios's HealthWireTests holds the same JSON,
// so the two sides agree on the wire.
export const SNAPSHOT = {
  date: '2026-10-01',
  localTime: '15:00',
  locale: 'zh-Hant',
  sleep: {
    asleepMin: 372,
    baselineMin: 425,
    deepMin: 52,
    coreMin: 209,
    remMin: 81,
    awakeMin: 30,
    bedtime: '23:48',
    wake: '06:00'
  },
  activity: {
    steps: 5840,
    stepGoal: 8000,
    activeKcal: 310,
    kcalGoal: 500,
    exerciseMin: 12,
    standHours: 6,
    workouts: []
  },
  recovery: {
    level: 'low',
    hrvMs: 38,
    hrvBaselineMs: 44,
    restingHr: 61,
    restingHrBaseline: 58,
    respRate: 14.2
  },
  body: { waterCups: 3, weightKg: null, weightTrend30d: null, mood: null },
  odyState: 'tired'
}

export const SUMMARY = {
  headline: '有點沒睡飽',
  summary: '昨晚只睡了 **6 小時 12 分**。',
  categories: {
    sleep: '深睡偏少。',
    activity: '還差 2,160 步。',
    recovery: 'HRV 偏低。',
    body: null
  },
  memorySuggestion: {
    section: 'profile',
    key: 'weekday-sleep',
    summary: '工作日平均只睡 6 小時左右'
  }
}
