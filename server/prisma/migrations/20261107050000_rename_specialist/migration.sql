-- The product context changed from academic advising to a hair clinic (SRS D-01).
ALTER TABLE "Schedule" RENAME COLUMN "advisorId" TO "specialistId";
ALTER INDEX "Schedule_advisorId_idx" RENAME TO "Schedule_specialistId_idx";
