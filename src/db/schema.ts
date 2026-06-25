// SQLite Schema for Dislexic_App

export const CREATE_TABLES_SQL = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  firstName TEXT,
  lastName TEXT,
  dateOfBirth DATE,
  diabetesDiagnosis DATE,
  autonomyLevel INTEGER DEFAULT 1,
  locale TEXT DEFAULT 'es-ES',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Glucose readings table
CREATE TABLE IF NOT EXISTS glucose_readings (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  value INTEGER NOT NULL,
  unit TEXT DEFAULT 'mg/dL',
  timestamp DATETIME NOT NULL,
  source TEXT NOT NULL,
  notes TEXT,
  autonomyLevel INTEGER,
  syncStatus TEXT DEFAULT 'pending',
  syncedAt DATETIME,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(userId) REFERENCES users(id),
  UNIQUE(userId, timestamp, source)
);

CREATE INDEX IF NOT EXISTS idx_glucose_user_timestamp 
  ON glucose_readings(userId, timestamp DESC);

-- Meals table
CREATE TABLE IF NOT EXISTS meals (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  type TEXT NOT NULL,
  timestamp DATETIME NOT NULL,
  medicalPauta TEXT,
  incidences TEXT,
  notes TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(userId) REFERENCES users(id)
);

-- Study blocks table
CREATE TABLE IF NOT EXISTS study_blocks (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  date DATE NOT NULL,
  subject TEXT NOT NULL,
  duration INTEGER DEFAULT 15,
  completed BOOLEAN DEFAULT 0,
  completedAt DATETIME,
  tasks TEXT NOT NULL,
  notes TEXT,
  distractionsCount INTEGER DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(userId) REFERENCES users(id),
  UNIQUE(userId, date, subject)
);

-- Routines table
CREATE TABLE IF NOT EXISTS routines (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  name TEXT NOT NULL,
  timeOfDay TEXT NOT NULL,
  description TEXT,
  tasks TEXT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(userId) REFERENCES users(id)
);

-- Routine completions table
CREATE TABLE IF NOT EXISTS routine_completions (
  id TEXT PRIMARY KEY,
  routineId TEXT NOT NULL,
  date DATE NOT NULL,
  completedTasks INTEGER,
  totalTasks INTEGER,
  completionPercentage REAL,
  completedAt DATETIME,
  FOREIGN KEY(routineId) REFERENCES routines(id),
  UNIQUE(routineId, date)
);

CREATE INDEX IF NOT EXISTS idx_routine_date 
  ON routine_completions(routineId, date DESC);

-- Daily chats table
CREATE TABLE IF NOT EXISTS daily_chats (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  date DATE NOT NULL,
  topic TEXT NOT NULL,
  message TEXT NOT NULL,
  audioNotePath TEXT,
  audioTranscript TEXT,
  parentReply TEXT,
  parentRepliedAt DATETIME,
  emotion INTEGER,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(userId) REFERENCES users(id),
  UNIQUE(userId, date)
);

-- Weekly reports table
CREATE TABLE IF NOT EXISTS weekly_reports (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  weekStarting DATE NOT NULL,
  whatWorked TEXT NOT NULL,
  whatFailed TEXT NOT NULL,
  changes TEXT NOT NULL,
  rewardChosen TEXT,
  rewardClaimedAt DATETIME,
  meetingNotes TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  completedAt DATETIME,
  FOREIGN KEY(userId) REFERENCES users(id),
  UNIQUE(userId, weekStarting)
);

-- Gamification state table
CREATE TABLE IF NOT EXISTS gamification_state (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  totalPoints INTEGER DEFAULT 0,
  currentLevel INTEGER DEFAULT 1,
  lastUpdated DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(userId) REFERENCES users(id),
  UNIQUE(userId)
);

-- Missions table
CREATE TABLE IF NOT EXISTS missions (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  target INTEGER NOT NULL,
  progress INTEGER DEFAULT 0,
  reward INTEGER NOT NULL,
  dueDate DATETIME NOT NULL,
  completed BOOLEAN DEFAULT 0,
  completedAt DATETIME,
  type TEXT DEFAULT 'daily',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(userId) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_missions_duedate 
  ON missions(userId, dueDate DESC);

-- Rewards table
CREATE TABLE IF NOT EXISTS rewards (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  cost INTEGER NOT NULL,
  tier INTEGER NOT NULL,
  claimed BOOLEAN DEFAULT 0,
  claimedAt DATETIME,
  nextAvailableAt DATETIME,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(userId) REFERENCES users(id)
);

-- Family members table
CREATE TABLE IF NOT EXISTS family_members (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  familyMemberId TEXT NOT NULL,
  relationship TEXT NOT NULL,
  canViewProgress BOOLEAN DEFAULT 1,
  canEditSettings BOOLEAN DEFAULT 0,
  canReceiveNotifications BOOLEAN DEFAULT 1,
  inviteToken TEXT UNIQUE,
  invitedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  acceptedAt DATETIME,
  FOREIGN KEY(userId) REFERENCES users(id),
  UNIQUE(userId, familyMemberId)
);
`;

export async function initDatabase(db: any) {
  try {
    await db.execAsync(CREATE_TABLES_SQL);
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}
