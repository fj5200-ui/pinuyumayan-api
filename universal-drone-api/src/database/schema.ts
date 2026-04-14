import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  doublePrecision,
  uniqueIndex,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ═══════════════════════════════════════════
//  Enums
// ═══════════════════════════════════════════
export const userRoleEnum      = pgEnum('user_role', ['admin', 'operator', 'observer']);
export const droneStatusEnum   = pgEnum('drone_status', ['idle', 'preflight', 'flying', 'returning', 'error', 'maintenance', 'offline']);
export const droneBrandEnum    = pgEnum('drone_brand', ['dji', 'autel', 'px4', 'ardupilot', 'custom']);
export const missionStatusEnum = pgEnum('mission_status', ['draft', 'ready', 'executing', 'paused', 'completed', 'aborted']);
export const waypointActionEnum = pgEnum('waypoint_action', ['hover', 'photo', 'video_start', 'video_stop', 'rotate', 'land']);
export const alertTypeEnum     = pgEnum('alert_type', ['low_battery', 'lost_connection', 'geofence_breach', 'gps_anomaly', 'motor_error', 'high_wind', 'return_home']);
export const alertSeverityEnum = pgEnum('alert_severity', ['info', 'warning', 'critical']);
export const zoneTypeEnum      = pgEnum('zone_type', ['no_fly', 'restricted', 'custom_geofence']);
export const connectionTypeEnum = pgEnum('connection_type', ['usb', 'wifi', 'cellular_4g', 'cellular_5g', 'mavlink_serial', 'mavlink_udp', 'vendor_sdk']);
export const droneMediaTypeEnum = pgEnum('media_type_drone', ['photo', 'video', 'thermal']);
export const logEventTypeEnum  = pgEnum('log_event_type', ['takeoff', 'land', 'waypoint_reached', 'alert', 'manual_override', 'mission_complete', 'abort']);
export const failsafeActionEnum = pgEnum('failsafe_action', ['return_home', 'land', 'hover', 'continue']);
export const exportFormatEnum  = pgEnum('export_format', ['json', 'csv', 'kml', 'gpx']);

// ═══════════════════════════════════════════
//  Users
// ═══════════════════════════════════════════
export const users = pgTable('users', {
  id:        serial('id').primaryKey(),
  email:     varchar('email', { length: 255 }).unique().notNull(),
  password:  varchar('password', { length: 255 }).notNull(),
  name:      varchar('name', { length: 100 }).notNull(),
  role:      userRoleEnum('role').default('observer').notNull(),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index('idx_users_email').on(t.email)]);

// ═══════════════════════════════════════════
//  Drones
// ═══════════════════════════════════════════
export const drones = pgTable('drones', {
  id:             serial('id').primaryKey(),
  name:           varchar('name', { length: 100 }).notNull(),
  brand:          droneBrandEnum('brand').notNull(),
  model:          varchar('model', { length: 100 }).notNull(),
  serialNumber:   varchar('serial_number', { length: 100 }).unique().notNull(),
  firmwareVer:    varchar('firmware_version', { length: 50 }),
  status:         droneStatusEnum('status').default('offline').notNull(),
  registeredById: integer('registered_by_id').references(() => users.id, { onDelete: 'set null' }),
  maxFlightTimeMins:  integer('max_flight_time_mins'),
  maxRangeMeters:     integer('max_range_meters'),
  maxAltitudeMeters:  integer('max_altitude_meters'),
  weightGrams:        integer('weight_grams'),
  homeLatitude:   doublePrecision('home_latitude'),
  homeLongitude:  doublePrecision('home_longitude'),
  homeAltitude:   doublePrecision('home_altitude'),
  notes:          text('notes'),
  isActive:       boolean('is_active').default(true).notNull(),
  createdAt:      timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:      timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('idx_drones_brand').on(t.brand),
  index('idx_drones_status').on(t.status),
  index('idx_drones_serial').on(t.serialNumber),
]);

// ═══════════════════════════════════════════
//  Fleet Groups
// ═══════════════════════════════════════════
export const fleetGroups = pgTable('fleet_groups', {
  id:            serial('id').primaryKey(),
  name:          varchar('name', { length: 100 }).notNull(),
  description:   text('description'),
  masterDroneId: integer('master_drone_id').references(() => drones.id, { onDelete: 'set null' }),
  createdById:   integer('created_by_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt:     timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:     timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const fleetGroupMembers = pgTable('fleet_group_members', {
  id:        serial('id').primaryKey(),
  groupId:   integer('group_id').references(() => fleetGroups.id, { onDelete: 'cascade' }).notNull(),
  droneId:   integer('drone_id').references(() => drones.id, { onDelete: 'cascade' }).notNull(),
  role:      varchar('role', { length: 50 }).default('follower'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [uniqueIndex('idx_fleet_member_unique').on(t.groupId, t.droneId)]);

// ═══════════════════════════════════════════
//  Missions & Waypoints
// ═══════════════════════════════════════════
export const missions = pgTable('missions', {
  id:             serial('id').primaryKey(),
  name:           varchar('name', { length: 200 }).notNull(),
  description:    text('description'),
  droneId:        integer('drone_id').references(() => drones.id, { onDelete: 'set null' }),
  createdById:    integer('created_by_id').references(() => users.id, { onDelete: 'set null' }),
  status:         missionStatusEnum('status').default('draft').notNull(),
  homeLatitude:   doublePrecision('home_latitude'),
  homeLongitude:  doublePrecision('home_longitude'),
  homeAltitude:   doublePrecision('home_altitude'),
  targetAreaGeojson:     text('target_area_geojson'),
  defaultAltitudeMeters: doublePrecision('default_altitude_meters').default(50),
  defaultSpeedMps:       doublePrecision('default_speed_mps').default(5),
  plannedStartAt:  timestamp('planned_start_at', { withTimezone: true }),
  startedAt:       timestamp('started_at', { withTimezone: true }),
  completedAt:     timestamp('completed_at', { withTimezone: true }),
  createdAt:       timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:       timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('idx_missions_drone').on(t.droneId),
  index('idx_missions_status').on(t.status),
]);

export const waypoints = pgTable('waypoints', {
  id:             serial('id').primaryKey(),
  missionId:      integer('mission_id').references(() => missions.id, { onDelete: 'cascade' }).notNull(),
  sequence:       integer('sequence').notNull(),
  latitude:       doublePrecision('latitude').notNull(),
  longitude:      doublePrecision('longitude').notNull(),
  altitudeMeters: doublePrecision('altitude_meters').notNull(),
  speedMps:       doublePrecision('speed_mps'),
  hoverSeconds:   integer('hover_seconds').default(0),
  action:         waypointActionEnum('action').default('hover'),
  gimbalPitch:    doublePrecision('gimbal_pitch'),
  heading:        doublePrecision('heading'),
  createdAt:      timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index('idx_waypoints_mission').on(t.missionId)]);

// ═══════════════════════════════════════════
//  Flight Logs & Events
// ═══════════════════════════════════════════
export const flightLogs = pgTable('flight_logs', {
  id:              serial('id').primaryKey(),
  droneId:         integer('drone_id').references(() => drones.id, { onDelete: 'set null' }),
  missionId:       integer('mission_id').references(() => missions.id, { onDelete: 'set null' }),
  operatorId:      integer('operator_id').references(() => users.id, { onDelete: 'set null' }),
  startedAt:       timestamp('started_at', { withTimezone: true }).notNull(),
  endedAt:         timestamp('ended_at', { withTimezone: true }),
  durationSeconds: integer('duration_seconds'),
  maxAltitudeM:    doublePrecision('max_altitude_m'),
  maxSpeedMps:     doublePrecision('max_speed_mps'),
  distanceKm:      doublePrecision('distance_km'),
  startLatitude:   doublePrecision('start_latitude'),
  startLongitude:  doublePrecision('start_longitude'),
  endLatitude:     doublePrecision('end_latitude'),
  endLongitude:    doublePrecision('end_longitude'),
  trajectoryGeojson: text('trajectory_geojson'),
  notes:           text('notes'),
  createdAt:       timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('idx_flightlog_drone').on(t.droneId),
  index('idx_flightlog_mission').on(t.missionId),
]);

export const flightLogEvents = pgTable('flight_log_events', {
  id:          serial('id').primaryKey(),
  flightLogId: integer('flight_log_id').references(() => flightLogs.id, { onDelete: 'cascade' }).notNull(),
  eventType:   logEventTypeEnum('event_type').notNull(),
  description: text('description'),
  latitude:    doublePrecision('latitude'),
  longitude:   doublePrecision('longitude'),
  altitudeM:   doublePrecision('altitude_m'),
  metadata:    text('metadata'),
  recordedAt:  timestamp('recorded_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index('idx_log_events_flight').on(t.flightLogId)]);

// ═══════════════════════════════════════════
//  Telemetry Snapshots
// ═══════════════════════════════════════════
export const telemetrySnapshots = pgTable('telemetry_snapshots', {
  id:               serial('id').primaryKey(),
  droneId:          integer('drone_id').references(() => drones.id, { onDelete: 'cascade' }).notNull(),
  flightLogId:      integer('flight_log_id').references(() => flightLogs.id, { onDelete: 'set null' }),
  latitude:         doublePrecision('latitude'),
  longitude:        doublePrecision('longitude'),
  altitudeMeters:   doublePrecision('altitude_meters'),
  gpsFixType:       integer('gps_fix_type'),
  gpsSatellites:    integer('gps_satellites'),
  roll:             doublePrecision('roll'),
  pitch:            doublePrecision('pitch'),
  yaw:              doublePrecision('yaw'),
  speedMps:         doublePrecision('speed_mps'),
  verticalSpeedMps: doublePrecision('vertical_speed_mps'),
  batteryPercent:   integer('battery_percent'),
  batteryVoltage:   doublePrecision('battery_voltage'),
  batteryCurrentA:  doublePrecision('battery_current_amps'),
  rssi:             integer('rssi'),
  linkQuality:      integer('link_quality'),
  flightMode:       varchar('flight_mode', { length: 50 }),
  isArmed:          boolean('is_armed'),
  recordedAt:       timestamp('recorded_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('idx_telemetry_drone').on(t.droneId),
  index('idx_telemetry_log').on(t.flightLogId),
  index('idx_telemetry_recorded').on(t.droneId, t.recordedAt),
]);

// ═══════════════════════════════════════════
//  Geofences
// ═══════════════════════════════════════════
export const geofences = pgTable('geofences', {
  id:               serial('id').primaryKey(),
  name:             varchar('name', { length: 200 }).notNull(),
  type:             zoneTypeEnum('type').notNull(),
  boundaryGeojson:  text('boundary_geojson').notNull(),
  minAltitudeM:     doublePrecision('min_altitude_m'),
  maxAltitudeM:     doublePrecision('max_altitude_m'),
  isActive:         boolean('is_active').default(true).notNull(),
  sourceAuthority:  varchar('source_authority', { length: 100 }),
  effectiveFrom:    timestamp('effective_from', { withTimezone: true }),
  effectiveTo:      timestamp('effective_to', { withTimezone: true }),
  createdById:      integer('created_by_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt:        timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:        timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index('idx_geofences_type').on(t.type)]);

// ═══════════════════════════════════════════
//  Alerts & Failsafe Rules
// ═══════════════════════════════════════════
export const alerts = pgTable('alerts', {
  id:          serial('id').primaryKey(),
  droneId:     integer('drone_id').references(() => drones.id, { onDelete: 'cascade' }).notNull(),
  flightLogId: integer('flight_log_id').references(() => flightLogs.id, { onDelete: 'set null' }),
  type:        alertTypeEnum('type').notNull(),
  severity:    alertSeverityEnum('severity').notNull(),
  message:     text('message').notNull(),
  metadata:    text('metadata'),
  isResolved:  boolean('is_resolved').default(false).notNull(),
  resolvedAt:  timestamp('resolved_at', { withTimezone: true }),
  triggeredAt: timestamp('triggered_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('idx_alerts_drone').on(t.droneId),
  index('idx_alerts_unresolved').on(t.droneId, t.isResolved),
]);

export const failsafeRules = pgTable('failsafe_rules', {
  id:             serial('id').primaryKey(),
  droneId:        integer('drone_id').references(() => drones.id, { onDelete: 'cascade' }).notNull(),
  triggerType:    alertTypeEnum('trigger_type').notNull(),
  action:         failsafeActionEnum('action').notNull(),
  thresholdValue: doublePrecision('threshold_value'),
  isEnabled:      boolean('is_enabled').default(true).notNull(),
  createdAt:      timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index('idx_failsafe_drone').on(t.droneId)]);

// ═══════════════════════════════════════════
//  FPV Media
// ═══════════════════════════════════════════
export const fpvMedia = pgTable('fpv_media', {
  id:            serial('id').primaryKey(),
  droneId:       integer('drone_id').references(() => drones.id, { onDelete: 'cascade' }).notNull(),
  flightLogId:   integer('flight_log_id').references(() => flightLogs.id, { onDelete: 'set null' }),
  type:          droneMediaTypeEnum('type').notNull(),
  filename:      varchar('filename', { length: 255 }).notNull(),
  storageUrl:    text('storage_url'),
  rtspUrl:       text('rtsp_url'),
  thumbnailUrl:  text('thumbnail_url'),
  durationSecs:  integer('duration_secs'),
  fileSizeBytes: integer('file_size_bytes'),
  capturedAt:    timestamp('captured_at', { withTimezone: true }).notNull(),
  latitude:      doublePrecision('latitude'),
  longitude:     doublePrecision('longitude'),
  altitudeM:     doublePrecision('altitude_m'),
  createdAt:     timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('idx_fpv_media_drone').on(t.droneId),
  index('idx_fpv_media_log').on(t.flightLogId),
]);

// ═══════════════════════════════════════════
//  Checklist Templates & Runs
// ═══════════════════════════════════════════
export const checklistTemplates = pgTable('checklist_templates', {
  id:          serial('id').primaryKey(),
  name:        varchar('name', { length: 200 }).notNull(),
  droneModel:  varchar('drone_model', { length: 100 }),
  isDefault:   boolean('is_default').default(false).notNull(),
  createdById: integer('created_by_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt:   timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const checklistItems = pgTable('checklist_items', {
  id:          serial('id').primaryKey(),
  templateId:  integer('template_id').references(() => checklistTemplates.id, { onDelete: 'cascade' }).notNull(),
  sequence:    integer('sequence').notNull(),
  label:       varchar('label', { length: 300 }).notNull(),
  description: text('description'),
  isRequired:  boolean('is_required').default(true).notNull(),
}, (t) => [index('idx_checklist_items_template').on(t.templateId)]);

export const checklistRuns = pgTable('checklist_runs', {
  id:            serial('id').primaryKey(),
  templateId:    integer('template_id').references(() => checklistTemplates.id, { onDelete: 'set null' }),
  droneId:       integer('drone_id').references(() => drones.id, { onDelete: 'cascade' }).notNull(),
  missionId:     integer('mission_id').references(() => missions.id, { onDelete: 'set null' }),
  performedById: integer('performed_by_id').references(() => users.id, { onDelete: 'set null' }),
  resultsJson:   text('results_json').notNull(),
  allPassed:     boolean('all_passed').default(false).notNull(),
  performedAt:   timestamp('performed_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index('idx_checklist_runs_drone').on(t.droneId)]);

// ═══════════════════════════════════════════
//  Device Connections
// ═══════════════════════════════════════════
export const deviceConnections = pgTable('device_connections', {
  id:                   serial('id').primaryKey(),
  droneId:              integer('drone_id').references(() => drones.id, { onDelete: 'cascade' }).notNull(),
  type:                 connectionTypeEnum('type').notNull(),
  isConnected:          boolean('is_connected').default(false).notNull(),
  endpoint:             varchar('endpoint', { length: 500 }),
  lastConnectedAt:      timestamp('last_connected_at', { withTimezone: true }),
  lastDisconnectedAt:   timestamp('last_disconnected_at', { withTimezone: true }),
  connectionMetadata:   text('connection_metadata'),
  createdAt:            timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:            timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index('idx_connections_drone').on(t.droneId)]);

// ═══════════════════════════════════════════
//  Batteries & Maintenance
// ═══════════════════════════════════════════
export const batteries = pgTable('batteries', {
  id:            serial('id').primaryKey(),
  droneId:       integer('drone_id').references(() => drones.id, { onDelete: 'set null' }),
  serialNumber:  varchar('serial_number', { length: 100 }).unique(),
  brand:         varchar('brand', { length: 100 }),
  capacityMah:   integer('capacity_mah'),
  cycleCount:    integer('cycle_count').default(0).notNull(),
  healthPercent: integer('health_percent'),
  lastChargedAt: timestamp('last_charged_at', { withTimezone: true }),
  notes:         text('notes'),
  createdAt:     timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:     timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const maintenanceRecords = pgTable('maintenance_records', {
  id:            serial('id').primaryKey(),
  droneId:       integer('drone_id').references(() => drones.id, { onDelete: 'cascade' }).notNull(),
  performedById: integer('performed_by_id').references(() => users.id, { onDelete: 'set null' }),
  type:          varchar('type', { length: 100 }).notNull(),
  description:   text('description').notNull(),
  partsReplaced: text('parts_replaced'),
  nextDueAt:     timestamp('next_due_at', { withTimezone: true }),
  performedAt:   timestamp('performed_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt:     timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index('idx_maintenance_drone').on(t.droneId)]);

// ═══════════════════════════════════════════
//  Weather Cache
// ═══════════════════════════════════════════
export const weatherCache = pgTable('weather_cache', {
  id:               serial('id').primaryKey(),
  latitude:         doublePrecision('latitude').notNull(),
  longitude:        doublePrecision('longitude').notNull(),
  windSpeedMps:     doublePrecision('wind_speed_mps'),
  windDirectionDeg: integer('wind_direction_deg'),
  precipitationMm:  doublePrecision('precipitation_mm'),
  visibilityKm:     doublePrecision('visibility_km'),
  temperatureC:     doublePrecision('temperature_c'),
  cloudCoverPct:    integer('cloud_cover_pct'),
  riskScore:        integer('risk_score'),
  riskFactors:      text('risk_factors'),
  fetchedAt:        timestamp('fetched_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt:        timestamp('expires_at', { withTimezone: true }).notNull(),
});

// ═══════════════════════════════════════════
//  Export Jobs
// ═══════════════════════════════════════════
export const exportJobs = pgTable('export_jobs', {
  id:            serial('id').primaryKey(),
  requestedById: integer('requested_by_id').references(() => users.id, { onDelete: 'set null' }),
  format:        exportFormatEnum('format').notNull(),
  entityType:    varchar('entity_type', { length: 50 }).notNull(),
  entityIds:     text('entity_ids').notNull(),
  status:        varchar('status', { length: 20 }).default('pending').notNull(),
  downloadUrl:   text('download_url'),
  expiresAt:     timestamp('expires_at', { withTimezone: true }),
  createdAt:     timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt:   timestamp('completed_at', { withTimezone: true }),
});

// ═══════════════════════════════════════════
//  Relations
// ═══════════════════════════════════════════
export const usersRelations = relations(users, ({ many }) => ({
  drones: many(drones),
  missions: many(missions),
  flightLogs: many(flightLogs),
  alerts: many(alerts),
}));

export const dronesRelations = relations(drones, ({ one, many }) => ({
  registeredBy: one(users, { fields: [drones.registeredById], references: [users.id] }),
  missions: many(missions),
  flightLogs: many(flightLogs),
  telemetrySnapshots: many(telemetrySnapshots),
  alerts: many(alerts),
  failsafeRules: many(failsafeRules),
  deviceConnections: many(deviceConnections),
  batteries: many(batteries),
  maintenanceRecords: many(maintenanceRecords),
  fpvMedia: many(fpvMedia),
  checklistRuns: many(checklistRuns),
}));

export const missionsRelations = relations(missions, ({ one, many }) => ({
  drone: one(drones, { fields: [missions.droneId], references: [drones.id] }),
  createdBy: one(users, { fields: [missions.createdById], references: [users.id] }),
  waypoints: many(waypoints),
  flightLogs: many(flightLogs),
}));

export const flightLogsRelations = relations(flightLogs, ({ one, many }) => ({
  drone: one(drones, { fields: [flightLogs.droneId], references: [drones.id] }),
  mission: one(missions, { fields: [flightLogs.missionId], references: [missions.id] }),
  operator: one(users, { fields: [flightLogs.operatorId], references: [users.id] }),
  events: many(flightLogEvents),
  telemetrySnapshots: many(telemetrySnapshots),
  alerts: many(alerts),
  fpvMedia: many(fpvMedia),
}));

export const fleetGroupsRelations = relations(fleetGroups, ({ one, many }) => ({
  masterDrone: one(drones, { fields: [fleetGroups.masterDroneId], references: [drones.id] }),
  createdBy: one(users, { fields: [fleetGroups.createdById], references: [users.id] }),
  members: many(fleetGroupMembers),
}));

export const fleetGroupMembersRelations = relations(fleetGroupMembers, ({ one }) => ({
  group: one(fleetGroups, { fields: [fleetGroupMembers.groupId], references: [fleetGroups.id] }),
  drone: one(drones, { fields: [fleetGroupMembers.droneId], references: [drones.id] }),
}));
