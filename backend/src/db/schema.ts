import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

export const battleNetConnection = sqliteTable('battlenet_connection', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  battlenetAccountId: text('battlenet_account_id').notNull(),
  region: text('region').notNull(),
  accessToken: text('access_token').notNull(),
  tokenExpiresAt: integer('token_expires_at', { mode: 'timestamp_ms' }).notNull(),
  connectedAt: integer('connected_at', { mode: 'timestamp_ms' }).notNull(),
  lastSyncedAt: integer('last_synced_at', { mode: 'timestamp_ms' }),
  lastSyncStatus: text('last_sync_status', { enum: ['success', 'failure', 'never_run'] })
    .notNull()
    .default('never_run'),
  lastSyncError: text('last_sync_error'),
});

export const character = sqliteTable(
  'character',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    connectionId: integer('connection_id')
      .notNull()
      .references(() => battleNetConnection.id, { onDelete: 'cascade' }),
    battlenetCharacterId: text('battlenet_character_id').notNull(),
    name: text('name').notNull(),
    realmSlug: text('realm_slug').notNull(),
    realmName: text('realm_name').notNull(),
    faction: text('faction', { enum: ['Alliance', 'Horde'] }).notNull(),
    class: text('class').notNull(),
    race: text('race').notNull(),
    level: integer('level').notNull(),
    itemLevel: integer('item_level').notNull(),
    activeSpec: text('active_spec').notNull(),
    /** JSON-encoded array of { name: string; skillLevel: number } */
    professions: text('professions').notNull(),
    /** Blizzard character-media render URL; null if Blizzard has no media for this character yet */
    imageUrl: text('image_url'),
    isRemoved: integer('is_removed', { mode: 'boolean' }).notNull().default(false),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    uniqueIndex('character_connection_battlenet_id_idx').on(
      table.connectionId,
      table.battlenetCharacterId,
    ),
  ],
);

export const battleNetConnectionRelations = relations(battleNetConnection, ({ many }) => ({
  characters: many(character),
}));

export const characterRelations = relations(character, ({ one }) => ({
  connection: one(battleNetConnection, {
    fields: [character.connectionId],
    references: [battleNetConnection.id],
  }),
}));

export type BattleNetConnection = typeof battleNetConnection.$inferSelect;
export type NewBattleNetConnection = typeof battleNetConnection.$inferInsert;
export type Character = typeof character.$inferSelect;
export type NewCharacter = typeof character.$inferInsert;
