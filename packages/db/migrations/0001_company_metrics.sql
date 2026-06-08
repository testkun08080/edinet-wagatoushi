CREATE TABLE `company_metrics` (
	`sec_code` text PRIMARY KEY NOT NULL,
	`edinet_code` text NOT NULL,
	`filer_name` text NOT NULL,
	`calc_date` text,
	`fiscal_month` text,
	`metrics_json` text NOT NULL,
	`sales` real,
	`roe` real,
	`equity_ratio` real,
	`total_assets` real,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`edinet_code`) REFERENCES `companies`(`edinet_code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_cm_filer_name` ON `company_metrics` (`filer_name`);--> statement-breakpoint
CREATE INDEX `idx_cm_sales` ON `company_metrics` (`sales`);--> statement-breakpoint
CREATE INDEX `idx_cm_roe` ON `company_metrics` (`roe`);--> statement-breakpoint
CREATE TABLE `shareholder_snapshots` (
	`sec_code` text NOT NULL,
	`period_end` text NOT NULL,
	`doc_id` text,
	`entries_json` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`sec_code`, `period_end`)
);
--> statement-breakpoint
CREATE INDEX `idx_sh_sec_code` ON `shareholder_snapshots` (`sec_code`);
