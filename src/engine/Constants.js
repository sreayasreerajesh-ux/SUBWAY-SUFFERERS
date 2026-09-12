// Game configuration & constants according to SUBWAY SUFFERES GDD

export const LANES = {
  LEFT: 0,
  CENTER: 1,
  RIGHT: 2,
};

export const LANE_X_OFFSETS = [-140, 0, 140]; // Perspective track spacing at z=0

export const PLAYER_STATES = {
  RUNNING: 'RUNNING',
  JUMPING: 'JUMPING',
  DUCKING: 'DUCKING',
  HIT: 'HIT',
  FALLING: 'FALLING',
};

export const OBSTACLE_TYPES = {
  BARRIER: 'BARRIER',           // Ground obstacle - must jump to avoid, hitting rewards +100
  LOW_BARRIER: 'LOW_BARRIER',   // Low hurdle
  OVERHEAD: 'OVERHEAD',         // Overhead beam/sign - must duck to avoid, hitting rewards +100
  TRAIN: 'TRAIN',               // Massive locomotive - dramatic crash!
  GAP: 'GAP',                   // Hole in track - can fall through for "Falling with Style"
  COIN: 'COIN',                 // Golden coin - touching gives -50, missing gives +10
  POWERUP_SPEED: 'POWERUP_SPEED',     // "Congratulations. You made it worse."
  POWERUP_MAGNET: 'POWERUP_MAGNET',   // Attracts OBSTACLES to you!
  POWERUP_INVERT: 'POWERUP_INVERT',   // Reverses Left/Right controls!
};

export const SCORING = {
  HIT_OBSTACLE: 100,
  AVOID_OBSTACLE: -10,
  PERFECT_AVOID: -25,
  COLLECT_COIN: -50,
  MISS_COIN: 10,
  HIT_TRAIN: 250,
  FALL_OFF_MAP: 300,
  ACTIVATE_HARMFUL_POWERUP: 150,
};

export const SNARKY_MESSAGES = {
  HIT: [
    'EXCELLENT HIT!',
    'DIRECT IMPACT! +100',
    '10/10 FORM ON THAT CRASH!',
    'SPECTACULAR FAILURE!',
    'NOW WE ARE TALKING!',
    'BEAUTIFUL COLLISION!',
    'EMBRACE THE DISASTER!',
  ],
  AVOID: [
    'STOP BEING GOOD.',
    'WHY WOULD YOU AVOID THAT?!',
    'DISAPPOINTING AGILITY. -10',
    'TRAGIC COMPETENCE.',
    'WHAT A WASTE OF A GOOD OBSTACLE.',
    'THIS IS NOT WHAT WE WANTED.',
    'WHY DODGE?',
  ],
  COLLECT_COIN: [
    'FINANCIAL DISASTER! -50',
    'WHY DID YOU TOUCH THAT?!',
    'UNNECESSARY WEALTH ACQUIRED.',
    'GREED WILL BE YOUR DOWNFALL.',
    'BAD INVESTMENT: -50',
    'THAT WAS WORTHLESS!',
  ],
  MISS_COIN: [
    'RESPONSIBLE SPENDING! +10',
    'EXCELLENT FINANCIAL DECISION!',
    'MONEY SAVED!',
    'FRUGAL GENIUS! +10',
    'MINIMALIST LIFESTYLE!',
  ],
  SURVIVAL: [
    'Why are you still alive?',
    'Skill issue detected: you are surviving too much.',
    'You are getting better at being worse.',
    'Unnecessary motivation: Hang in there! Or please don\'t.',
    'Warning: Competence levels dangerously high.',
  ],
};

export const ACHIEVEMENTS = [
  {
    id: 'prof_failure',
    title: 'Professional Failure',
    desc: 'Hit 10+ obstacles in a single run. A true virtuoso.',
    icon: '💥',
  },
  {
    id: 'financial_disaster',
    title: 'Financial Disaster',
    desc: 'Collect 5+ coins. Absolutely terrible financial acumen.',
    icon: '💸',
  },
  {
    id: 'traffic_violation',
    title: 'Traffic Violation',
    desc: 'Headbutt 3+ oncoming subway trains.',
    icon: '🚆',
  },
  {
    id: 'pacifist',
    title: 'Pacifist (Undesirable)',
    desc: 'Avoid 10 obstacles without hitting them. Shame on you.',
    icon: '🕊️',
  },
  {
    id: 'worst_player',
    title: 'Worst Player Alive',
    desc: 'Reach a Failure Combo of ×8 or higher.',
    icon: '👑',
  },
  {
    id: 'actually_trying',
    title: 'Actually Trying',
    desc: 'Successfully avoid 20 obstacles. Why are you trying so hard?',
    icon: '🤦',
  },
  {
    id: 'game_hates_you',
    title: 'The Game Hates You',
    desc: 'Reach a severely negative score (< 0). You played too well.',
    icon: '📉',
  },
  {
    id: 'why_still_playing',
    title: 'Why Are You Still Playing?',
    desc: 'Survive continuously for over 60 seconds.',
    icon: '⏳',
  },
  {
    id: 'overqualified',
    title: 'Overqualified',
    desc: 'Plunge score below -200. You failed at failing.',
    icon: '🎓',
  },
  {
    id: 'falling_with_style',
    title: 'Falling With Style',
    desc: 'Take a header off the subway tracks into the abyss.',
    icon: '🪂',
  },
];
