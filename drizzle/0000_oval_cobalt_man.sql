CREATE TABLE `scores` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`run_id` text NOT NULL,
	`player_name` text NOT NULL,
	`score` integer NOT NULL,
	`level_reached` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_scores_run_id` ON `scores` (`run_id`);--> statement-breakpoint
CREATE INDEX `idx_scores_ranking` ON `scores` (`score`,`level_reached`,`created_at`);--> statement-breakpoint
PRAGMA optimize;
