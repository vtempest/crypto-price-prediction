CREATE TABLE `btc_price_cache` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`timestamp` integer NOT NULL,
	`time` text NOT NULL,
	`open` real NOT NULL,
	`high` real NOT NULL,
	`low` real NOT NULL,
	`close` real NOT NULL,
	`volume` real NOT NULL,
	`number_of_trades` integer NOT NULL,
	`polymarket_odds` real,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `btc_price_cache_index` (
	`date` text,
	`timestamp` integer
);
--> statement-breakpoint
CREATE TABLE `polymarket_intervals_cache` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`interval_index` integer NOT NULL,
	`data` text NOT NULL,
	`created_at` integer NOT NULL
);
