DELETE FROM `character`;--> statement-breakpoint
DELETE FROM `battlenet_connection`;--> statement-breakpoint
ALTER TABLE `battlenet_connection` ADD `session_id` text NOT NULL;--> statement-breakpoint
ALTER TABLE `battlenet_connection` ADD `battletag` text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `battlenet_connection_session_id_idx` ON `battlenet_connection` (`session_id`);