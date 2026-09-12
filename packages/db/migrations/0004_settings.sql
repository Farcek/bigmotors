CREATE TABLE "settings" (
	"key" varchar(255) PRIMARY KEY NOT NULL,
	"value" varchar(255) NOT NULL,
	CONSTRAINT "settings_key_nonblank" CHECK (length(btrim("settings"."key")) > 0)
);
