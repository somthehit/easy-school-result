import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  date,
  jsonb,
  doublePrecision,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Users (teachers only)
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    photoUrl: text("photo_url"),
    schoolName: varchar("school_name", { length: 255 }).notNull(),
    schoolAddress: text("school_address").notNull(),
    // Additional school details for profile/export
    schoolContact: varchar("school_contact", { length: 50 }).notNull().default(""),
    estb: varchar("estb", { length: 50 }).notNull().default(""),
    regNumber: varchar("reg_number", { length: 100 }).notNull().default(""),
    principalName: varchar("principal_name", { length: 255 }).notNull().default(""),
    principalContact: varchar("principal_contact", { length: 50 }).notNull().default(""),
    schoolLogo: text("school_logo"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: false }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    emailIdx: uniqueIndex("users_email_unique").on(t.email),
  })
);

// Exam-specific per-part settings (e.g., Science Theory/Practical marks for a particular exam)
export const examSubjectPartSettings = pgTable(
  "exam_subject_part_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    examId: uuid("exam_id").notNull().references(() => exams.id),
    subjectPartId: uuid("subject_part_id").notNull().references(() => subjectParts.id),
    fullMark: integer("full_mark").notNull(),
    passMark: integer("pass_mark").notNull(),
    hasConversion: boolean("has_conversion").notNull().default(false),
    convertToMark: integer("convert_to_mark"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    uniq: uniqueIndex("uniq_exam_subject_part").on(t.examId, t.subjectPartId),
  })
);

// Email OTPs for verification & login
export const emailOtps = pgTable(
  "email_otps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull(),
    code: varchar("code", { length: 6 }).notNull(),
    purpose: varchar("purpose", { length: 50 }).notNull(), // signup|login|reset
    expiresAt: timestamp("expires_at").notNull(),
    attempts: integer("attempts").default(0).notNull(),
    lockedUntil: timestamp("locked_until"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  }
);

// Password reset tokens for secure password reset links
export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull(),
    token: varchar("token", { length: 255 }).notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    tokenIdx: uniqueIndex("password_reset_tokens_token_unique").on(t.token),
  })
);

export const classes = pgTable("classes", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  section: varchar("section", { length: 20 }),
  year: integer("year"),
  userId: uuid("user_id").notNull().references(() => users.id),
});

// Year-scoped class roster
export const classEnrollments = pgTable("class_enrollments", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id").notNull().references(() => students.id),
  classId: uuid("class_id").notNull().references(() => classes.id),
  year: integer("year").notNull(),
  section: varchar("section", { length: 20 }).notNull(),
  rollNo: integer("roll_no").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Master subjects (name templates only; no marks here)
export const masterSubjects = pgTable(
  "master_subjects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 100 }).notNull(),
    // Global subjects - no class dependency
    userId: uuid("user_id").notNull().references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    uniqPerUser: uniqueIndex("uniq_master_subject_name_user").on(t.userId, t.name),
  })
);

export const subjects = pgTable("subjects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  code: varchar("code", { length: 20 }), // Subject code (e.g., "ENG", "MATH")
  classId: uuid("class_id").notNull().references(() => classes.id),
  defaultFullMark: integer("default_full_mark").default(0).notNull(), // Default total marks
  creditHours: doublePrecision("credit_hours").default(2.0).notNull(), // Credit hours for GPA calculation
  masterSubjectId: uuid("master_subject_id").notNull().references(() => masterSubjects.id, { onDelete: "restrict" }),
  userId: uuid("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Subject parts (e.g., Theory, Practical) per subject
export const subjectParts = pgTable(
  "subject_parts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subjectId: uuid("subject_id").notNull().references(() => subjects.id),
    name: varchar("name", { length: 100 }).notNull(), // "Theory", "Practical", "Viva", "Assignment"
    partType: varchar("part_type", { length: 20 }).notNull().default("TH"), // TH, PR, VI, AS
    rawFullMark: integer("raw_full_mark").notNull(), // Exam scale (e.g., 75)
    convertedFullMark: integer("converted_full_mark").notNull(), // System scale (e.g., 100)
    passMark: integer("pass_mark").notNull(), // Minimum marks to pass this part
    sortOrder: integer("sort_order").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(), // For soft deletion/deactivation
    // Optional ownership denormalization for faster filtering; still inherits from subject
    userId: uuid("user_id").notNull().references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    uniqPerSubject: uniqueIndex("uniq_subject_part_name").on(t.subjectId, t.name),
  })
);

export const students = pgTable(
  "students",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    rollNo: integer("roll_no").notNull(),
    classId: uuid("class_id").notNull().references(() => classes.id),
    section: varchar("section", { length: 20 }),
    // Use SQL DATE for birthday (no time zone semantics)
    dob: date("dob"),
    contact: varchar("contact", { length: 50 }),
    parentName: varchar("parent_name", { length: 255 }),
    fathersName: varchar("fathers_name", { length: 255 }),
    mothersName: varchar("mothers_name", { length: 255 }),
    photoUrl: text("photo_url"),
    address: text("address"),
    gender: varchar("gender", { length: 6 }).notNull(),
    studentCode: varchar("student_code", { length: 20 }),
    userId: uuid("user_id").notNull().references(() => users.id),
  },
  (t) => ({
    uniqStudentCode: uniqueIndex("uniq_students_student_code").on(t.studentCode),
  })
);

// Note: dob is a proper DATE column; use date("dob") above

export const exams = pgTable("exams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  term: varchar("term", { length: 50 }).notNull(),
  year: integer("year").notNull(),
  classId: uuid("class_id").notNull().references(() => classes.id),
  createdByUserId: uuid("created_by_user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const marks = pgTable("marks", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id").notNull().references(() => students.id),
  subjectId: uuid("subject_id").notNull().references(() => subjects.id),
  subjectPartId: uuid("subject_part_id").references(() => subjectParts.id),
  examId: uuid("exam_id").notNull().references(() => exams.id),
  // obtained = raw scored mark; converted is a derived, denormalized value
  // kept for performance when conversion (e.g., 75 -> 50) is applied
  obtained: doublePrecision("obtained").notNull(),
  converted: doublePrecision("converted").notNull(),
  createdByUserId: uuid("created_by_user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const results = pgTable("results", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id").notNull().references(() => students.id),
  examId: uuid("exam_id").notNull().references(() => exams.id),
  total: doublePrecision("total").notNull(),
  percentage: doublePrecision("percentage").notNull(),
  grade: text("grade").notNull(),
  division: text("division").notNull(),
  rank: integer("rank").notNull(),
  createdByUserId: uuid("created_by_user_id").notNull().references(() => users.id),
  // Denormalized fields from the related exam/class for query simplicity/performance
  fiscalYear: integer("fiscal_year").notNull(),
  term: varchar("term", { length: 50 }).notNull(),
  classId: uuid("class_id").notNull().references(() => classes.id),
  section: varchar("section", { length: 20 }).notNull(),
  shareToken: uuid("share_token"),
  isPublished: boolean("is_published").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Per-exam subject mark overrides
export const examSubjectSettings = pgTable(
  "exam_subject_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    examId: uuid("exam_id").notNull().references(() => exams.id),
    subjectId: uuid("subject_id").notNull().references(() => subjects.id),
    fullMark: integer("full_mark").notNull(),
    passMark: integer("pass_mark").notNull(),
    hasConversion: boolean("has_conversion").notNull().default(false),
    convertToMark: integer("convert_to_mark"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    uniq: uniqueIndex("uniq_exam_subject").on(t.examId, t.subjectId),
  })
);

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorUserId: uuid("actor_user_id").references(() => users.id),
  entity: varchar("entity", { length: 50 }).notNull(),
  entityId: uuid("entity_id").notNull(),
  action: varchar("action", { length: 50 }).notNull(),
  before: jsonb("before"),
  after: jsonb("after"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Removed classSettings table - using user profile data instead

// Contact messages submitted from /contact
export const contactMessages = pgTable("contact_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  message: text("message").notNull(),
  userId: uuid("user_id").references(() => users.id),
  handled: boolean("handled").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Relations (minimal now; optional usage)
export const classRelations = relations(classes, ({ many }) => ({
  subjects: many(subjects),
  students: many(students),
  exams: many(exams),
}));
