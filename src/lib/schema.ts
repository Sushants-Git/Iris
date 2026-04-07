import { pgTable, uuid, text, real, timestamp, pgEnum, integer } from 'drizzle-orm/pg-core'

export const itemTypeEnum = pgEnum('item_type', ['link', 'note', 'subcategory'])
export const statusEnum = pgEnum('status', ['pending', 'in_progress', 'done'])

export const boards = pgTable('boards', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const items = pgTable('items', {
  id: uuid('id').primaryKey().defaultRandom(),
  boardId: uuid('board_id')
    .notNull()
    .references(() => boards.id, { onDelete: 'cascade' }),
  type: itemTypeEnum('type').notNull(),

  // Link fields (scraped)
  url: text('url'),
  scrapedTitle: text('scraped_title'),
  scrapedDescription: text('scraped_description'),
  scrapedThumbnail: text('scraped_thumbnail'),

  // User overrides
  customTitle: text('custom_title'),
  customDescription: text('custom_description'),
  customThumbnail: text('custom_thumbnail'),

  // Note field
  noteContent: text('note_content'),

  // Subcategory grouping (label this item belongs to)
  subcategory: text('subcategory'),

  // Canvas position
  x: real('x').notNull().default(100),
  y: real('y').notNull().default(100),
  width: real('width').notNull().default(320),
  height: real('height').notNull().default(200),
  rotation: real('rotation').notNull().default(0),

  status: statusEnum('status').notNull().default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const workEntries = pgTable('work_entries', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  tag: text('tag').notNull(),           // 'work' | 'personal'
  startedAt: timestamp('started_at').notNull(),
  endedAt: timestamp('ended_at'),
  totalPausedMs: integer('total_paused_ms').notNull().default(0),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export type Board = typeof boards.$inferSelect
export type NewBoard = typeof boards.$inferInsert
export type Item = typeof items.$inferSelect
export type NewItem = typeof items.$inferInsert
