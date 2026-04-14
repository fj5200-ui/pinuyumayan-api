CREATE TYPE "public"."alert_severity" AS ENUM('info', 'warning', 'critical');--> statement-breakpoint
CREATE TYPE "public"."alert_type" AS ENUM('low_battery', 'lost_connection', 'geofence_breach', 'gps_anomaly', 'motor_error', 'high_wind', 'return_home');--> statement-breakpoint
CREATE TYPE "public"."connection_type" AS ENUM('usb', 'wifi', 'cellular_4g', 'cellular_5g', 'mavlink_serial', 'mavlink_udp', 'vendor_sdk');--> statement-breakpoint
CREATE TYPE "public"."drone_brand" AS ENUM('dji', 'autel', 'px4', 'ardupilot', 'custom');--> statement-breakpoint
CREATE TYPE "public"."media_type_drone" AS ENUM('photo', 'video', 'thermal');--> statement-breakpoint
CREATE TYPE "public"."drone_status" AS ENUM('idle', 'preflight', 'flying', 'returning', 'error', 'maintenance', 'offline');--> statement-breakpoint
CREATE TYPE "public"."export_format" AS ENUM('json', 'csv', 'kml', 'gpx');--> statement-breakpoint
CREATE TYPE "public"."failsafe_action" AS ENUM('return_home', 'land', 'hover', 'continue');--> statement-breakpoint
CREATE TYPE "public"."log_event_type" AS ENUM('takeoff', 'land', 'waypoint_reached', 'alert', 'manual_override', 'mission_complete', 'abort');--> statement-breakpoint
CREATE TYPE "public"."mission_status" AS ENUM('draft', 'ready', 'executing', 'paused', 'completed', 'aborted');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'operator', 'observer');--> statement-breakpoint
CREATE TYPE "public"."waypoint_action" AS ENUM('hover', 'photo', 'video_start', 'video_stop', 'rotate', 'land');--> statement-breakpoint
CREATE TYPE "public"."zone_type" AS ENUM('no_fly', 'restricted', 'custom_geofence');--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"drone_id" integer NOT NULL,
	"flight_log_id" integer,
	"type" "alert_type" NOT NULL,
	"severity" "alert_severity" NOT NULL,
	"message" text NOT NULL,
	"metadata" text,
	"is_resolved" boolean DEFAULT false NOT NULL,
	"resolved_at" timestamp with time zone,
	"triggered_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "batteries" (
	"id" serial PRIMARY KEY NOT NULL,
	"drone_id" integer,
	"serial_number" varchar(100),
	"brand" varchar(100),
	"capacity_mah" integer,
	"cycle_count" integer DEFAULT 0 NOT NULL,
	"health_percent" integer,
	"last_charged_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "batteries_serial_number_unique" UNIQUE("serial_number")
);
--> statement-breakpoint
CREATE TABLE "checklist_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer NOT NULL,
	"sequence" integer NOT NULL,
	"label" varchar(300) NOT NULL,
	"description" text,
	"is_required" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checklist_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer,
	"drone_id" integer NOT NULL,
	"mission_id" integer,
	"performed_by_id" integer,
	"results_json" text NOT NULL,
	"all_passed" boolean DEFAULT false NOT NULL,
	"performed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checklist_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"drone_model" varchar(100),
	"is_default" boolean DEFAULT false NOT NULL,
	"created_by_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "device_connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"drone_id" integer NOT NULL,
	"type" "connection_type" NOT NULL,
	"is_connected" boolean DEFAULT false NOT NULL,
	"endpoint" varchar(500),
	"last_connected_at" timestamp with time zone,
	"last_disconnected_at" timestamp with time zone,
	"connection_metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drones" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"brand" "drone_brand" NOT NULL,
	"model" varchar(100) NOT NULL,
	"serial_number" varchar(100) NOT NULL,
	"firmware_version" varchar(50),
	"status" "drone_status" DEFAULT 'offline' NOT NULL,
	"registered_by_id" integer,
	"max_flight_time_mins" integer,
	"max_range_meters" integer,
	"max_altitude_meters" integer,
	"weight_grams" integer,
	"home_latitude" double precision,
	"home_longitude" double precision,
	"home_altitude" double precision,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "drones_serial_number_unique" UNIQUE("serial_number")
);
--> statement-breakpoint
CREATE TABLE "export_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"requested_by_id" integer,
	"format" "export_format" NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_ids" text NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"download_url" text,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "failsafe_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"drone_id" integer NOT NULL,
	"trigger_type" "alert_type" NOT NULL,
	"action" "failsafe_action" NOT NULL,
	"threshold_value" double precision,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fleet_group_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"drone_id" integer NOT NULL,
	"role" varchar(50) DEFAULT 'follower',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fleet_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"master_drone_id" integer,
	"created_by_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flight_log_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"flight_log_id" integer NOT NULL,
	"event_type" "log_event_type" NOT NULL,
	"description" text,
	"latitude" double precision,
	"longitude" double precision,
	"altitude_m" double precision,
	"metadata" text,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flight_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"drone_id" integer,
	"mission_id" integer,
	"operator_id" integer,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"duration_seconds" integer,
	"max_altitude_m" double precision,
	"max_speed_mps" double precision,
	"distance_km" double precision,
	"start_latitude" double precision,
	"start_longitude" double precision,
	"end_latitude" double precision,
	"end_longitude" double precision,
	"trajectory_geojson" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fpv_media" (
	"id" serial PRIMARY KEY NOT NULL,
	"drone_id" integer NOT NULL,
	"flight_log_id" integer,
	"type" "media_type_drone" NOT NULL,
	"filename" varchar(255) NOT NULL,
	"storage_url" text,
	"rtsp_url" text,
	"thumbnail_url" text,
	"duration_secs" integer,
	"file_size_bytes" integer,
	"captured_at" timestamp with time zone NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"altitude_m" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "geofences" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"type" "zone_type" NOT NULL,
	"boundary_geojson" text NOT NULL,
	"min_altitude_m" double precision,
	"max_altitude_m" double precision,
	"is_active" boolean DEFAULT true NOT NULL,
	"source_authority" varchar(100),
	"effective_from" timestamp with time zone,
	"effective_to" timestamp with time zone,
	"created_by_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"drone_id" integer NOT NULL,
	"performed_by_id" integer,
	"type" varchar(100) NOT NULL,
	"description" text NOT NULL,
	"parts_replaced" text,
	"next_due_at" timestamp with time zone,
	"performed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "missions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"drone_id" integer,
	"created_by_id" integer,
	"status" "mission_status" DEFAULT 'draft' NOT NULL,
	"home_latitude" double precision,
	"home_longitude" double precision,
	"home_altitude" double precision,
	"target_area_geojson" text,
	"default_altitude_meters" double precision DEFAULT 50,
	"default_speed_mps" double precision DEFAULT 5,
	"planned_start_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telemetry_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"drone_id" integer NOT NULL,
	"flight_log_id" integer,
	"latitude" double precision,
	"longitude" double precision,
	"altitude_meters" double precision,
	"gps_fix_type" integer,
	"gps_satellites" integer,
	"roll" double precision,
	"pitch" double precision,
	"yaw" double precision,
	"speed_mps" double precision,
	"vertical_speed_mps" double precision,
	"battery_percent" integer,
	"battery_voltage" double precision,
	"battery_current_amps" double precision,
	"rssi" integer,
	"link_quality" integer,
	"flight_mode" varchar(50),
	"is_armed" boolean,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"name" varchar(100) NOT NULL,
	"role" "user_role" DEFAULT 'observer' NOT NULL,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "waypoints" (
	"id" serial PRIMARY KEY NOT NULL,
	"mission_id" integer NOT NULL,
	"sequence" integer NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"altitude_meters" double precision NOT NULL,
	"speed_mps" double precision,
	"hover_seconds" integer DEFAULT 0,
	"action" "waypoint_action" DEFAULT 'hover',
	"gimbal_pitch" double precision,
	"heading" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weather_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"wind_speed_mps" double precision,
	"wind_direction_deg" integer,
	"precipitation_mm" double precision,
	"visibility_km" double precision,
	"temperature_c" double precision,
	"cloud_cover_pct" integer,
	"risk_score" integer,
	"risk_factors" text,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_drone_id_drones_id_fk" FOREIGN KEY ("drone_id") REFERENCES "public"."drones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_flight_log_id_flight_logs_id_fk" FOREIGN KEY ("flight_log_id") REFERENCES "public"."flight_logs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batteries" ADD CONSTRAINT "batteries_drone_id_drones_id_fk" FOREIGN KEY ("drone_id") REFERENCES "public"."drones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_template_id_checklist_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."checklist_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_runs" ADD CONSTRAINT "checklist_runs_template_id_checklist_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."checklist_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_runs" ADD CONSTRAINT "checklist_runs_drone_id_drones_id_fk" FOREIGN KEY ("drone_id") REFERENCES "public"."drones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_runs" ADD CONSTRAINT "checklist_runs_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_runs" ADD CONSTRAINT "checklist_runs_performed_by_id_users_id_fk" FOREIGN KEY ("performed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_templates" ADD CONSTRAINT "checklist_templates_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_connections" ADD CONSTRAINT "device_connections_drone_id_drones_id_fk" FOREIGN KEY ("drone_id") REFERENCES "public"."drones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drones" ADD CONSTRAINT "drones_registered_by_id_users_id_fk" FOREIGN KEY ("registered_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_requested_by_id_users_id_fk" FOREIGN KEY ("requested_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "failsafe_rules" ADD CONSTRAINT "failsafe_rules_drone_id_drones_id_fk" FOREIGN KEY ("drone_id") REFERENCES "public"."drones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fleet_group_members" ADD CONSTRAINT "fleet_group_members_group_id_fleet_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."fleet_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fleet_group_members" ADD CONSTRAINT "fleet_group_members_drone_id_drones_id_fk" FOREIGN KEY ("drone_id") REFERENCES "public"."drones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fleet_groups" ADD CONSTRAINT "fleet_groups_master_drone_id_drones_id_fk" FOREIGN KEY ("master_drone_id") REFERENCES "public"."drones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fleet_groups" ADD CONSTRAINT "fleet_groups_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flight_log_events" ADD CONSTRAINT "flight_log_events_flight_log_id_flight_logs_id_fk" FOREIGN KEY ("flight_log_id") REFERENCES "public"."flight_logs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flight_logs" ADD CONSTRAINT "flight_logs_drone_id_drones_id_fk" FOREIGN KEY ("drone_id") REFERENCES "public"."drones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flight_logs" ADD CONSTRAINT "flight_logs_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flight_logs" ADD CONSTRAINT "flight_logs_operator_id_users_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fpv_media" ADD CONSTRAINT "fpv_media_drone_id_drones_id_fk" FOREIGN KEY ("drone_id") REFERENCES "public"."drones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fpv_media" ADD CONSTRAINT "fpv_media_flight_log_id_flight_logs_id_fk" FOREIGN KEY ("flight_log_id") REFERENCES "public"."flight_logs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geofences" ADD CONSTRAINT "geofences_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_drone_id_drones_id_fk" FOREIGN KEY ("drone_id") REFERENCES "public"."drones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_performed_by_id_users_id_fk" FOREIGN KEY ("performed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "missions" ADD CONSTRAINT "missions_drone_id_drones_id_fk" FOREIGN KEY ("drone_id") REFERENCES "public"."drones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "missions" ADD CONSTRAINT "missions_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telemetry_snapshots" ADD CONSTRAINT "telemetry_snapshots_drone_id_drones_id_fk" FOREIGN KEY ("drone_id") REFERENCES "public"."drones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telemetry_snapshots" ADD CONSTRAINT "telemetry_snapshots_flight_log_id_flight_logs_id_fk" FOREIGN KEY ("flight_log_id") REFERENCES "public"."flight_logs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waypoints" ADD CONSTRAINT "waypoints_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_alerts_drone" ON "alerts" USING btree ("drone_id");--> statement-breakpoint
CREATE INDEX "idx_alerts_unresolved" ON "alerts" USING btree ("drone_id","is_resolved");--> statement-breakpoint
CREATE INDEX "idx_checklist_items_template" ON "checklist_items" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "idx_checklist_runs_drone" ON "checklist_runs" USING btree ("drone_id");--> statement-breakpoint
CREATE INDEX "idx_connections_drone" ON "device_connections" USING btree ("drone_id");--> statement-breakpoint
CREATE INDEX "idx_drones_brand" ON "drones" USING btree ("brand");--> statement-breakpoint
CREATE INDEX "idx_drones_status" ON "drones" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_drones_serial" ON "drones" USING btree ("serial_number");--> statement-breakpoint
CREATE INDEX "idx_failsafe_drone" ON "failsafe_rules" USING btree ("drone_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_fleet_member_unique" ON "fleet_group_members" USING btree ("group_id","drone_id");--> statement-breakpoint
CREATE INDEX "idx_log_events_flight" ON "flight_log_events" USING btree ("flight_log_id");--> statement-breakpoint
CREATE INDEX "idx_flightlog_drone" ON "flight_logs" USING btree ("drone_id");--> statement-breakpoint
CREATE INDEX "idx_flightlog_mission" ON "flight_logs" USING btree ("mission_id");--> statement-breakpoint
CREATE INDEX "idx_fpv_media_drone" ON "fpv_media" USING btree ("drone_id");--> statement-breakpoint
CREATE INDEX "idx_fpv_media_log" ON "fpv_media" USING btree ("flight_log_id");--> statement-breakpoint
CREATE INDEX "idx_geofences_type" ON "geofences" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_maintenance_drone" ON "maintenance_records" USING btree ("drone_id");--> statement-breakpoint
CREATE INDEX "idx_missions_drone" ON "missions" USING btree ("drone_id");--> statement-breakpoint
CREATE INDEX "idx_missions_status" ON "missions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_telemetry_drone" ON "telemetry_snapshots" USING btree ("drone_id");--> statement-breakpoint
CREATE INDEX "idx_telemetry_log" ON "telemetry_snapshots" USING btree ("flight_log_id");--> statement-breakpoint
CREATE INDEX "idx_telemetry_recorded" ON "telemetry_snapshots" USING btree ("drone_id","recorded_at");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_waypoints_mission" ON "waypoints" USING btree ("mission_id");