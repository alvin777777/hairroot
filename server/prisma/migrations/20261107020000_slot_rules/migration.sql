CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Slot" ADD CONSTRAINT "slot_end_after_start" CHECK ("endAt" > "startAt");

-- tsrange is end-exclusive, so adjacent slots do not conflict (BR-04).
ALTER TABLE "Slot" ADD CONSTRAINT "slot_no_overlap"
  EXCLUDE USING gist ("scheduleId" WITH =, tsrange("startAt", "endAt") WITH &&);
