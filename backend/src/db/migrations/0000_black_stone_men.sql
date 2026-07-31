CREATE TABLE `battlenet_connection` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`battlenet_account_id` text NOT NULL,
	`region` text NOT NULL,
	`access_token` text NOT NULL,
	`refresh_token` text NOT NULL,
	`token_expires_at` integer NOT NULL,
	`connected_at` integer NOT NULL,
	`last_synced_at` integer,
	`last_sync_status` text DEFAULT 'never_run' NOT NULL,
	`last_sync_error` text
);
--> statement-breakpoint
CREATE TABLE `character` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`connection_id` integer NOT NULL,
	`battlenet_character_id` text NOT NULL,
	`name` text NOT NULL,
	`realm_slug` text NOT NULL,
	`realm_name` text NOT NULL,
	`faction` text NOT NULL,
	`class` text NOT NULL,
	`race` text NOT NULL,
	`level` integer NOT NULL,
	`item_level` integer NOT NULL,
	`active_spec` text NOT NULL,
	`professions` text NOT NULL,
	`is_removed` integer DEFAULT false NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`connection_id`) REFERENCES `battlenet_connection`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `character_connection_battlenet_id_idx` ON `character` (`connection_id`,`battlenet_character_id`);