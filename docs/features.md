# HairRoot — Feature Inventory

Version 0.3 — reviewed and approved in PR #24, 2026-11-14.

| ID | Feature or responsibility | Description | Requirements | Depends on | Sprint |
|---|---|---|---|---|---|
| F-01 | Authentication and session | Login, logout, and current user with server-side sessions and seeded accounts. | FR-01, FR-02, FR-03, NFR-01, NFR-03, NFR-05 | none | 1 |
| F-02 | Access control | Role and ownership guards shared by all protected endpoints. | BR-05, BR-06, BR-07, NFR-01, NFR-02 | F-01 | 1 |
| F-03 | Slot creation | A specialist creates validated, non-overlapping slots on an assigned schedule. | FR-04, BR-03, BR-04, BR-05 | F-01, F-02 | 1 |
| F-04 | Booking | A customer lists available slots and books one, safely under competition. | FR-05, FR-06, BR-01, BR-02, BR-06, BR-07, BR-08, NFR-04, NFR-06 | F-01, F-02, F-03 | 1 |
| F-05 | Booking views | A customer reads their own bookings and a specialist reads schedule bookings. | FR-07, FR-08, BR-05, BR-06, NFR-08 | F-04 | 1 |
| F-06 | Customer cancellation | A customer cancels before the limit and the slot reopens. | FR-09, BR-09 | F-04 | 2 |
| F-07 | Rescheduling | A customer moves a booking atomically. | FR-10, BR-09, BR-10 | F-04, F-06 | 2 |
| F-08 | Overlap protection | A customer cannot hold overlapping active bookings. | BR-11 | F-04 | 2 |
| F-09 | Slot maintenance | A specialist edits or removes an unbooked slot. | FR-11, BR-12 | F-03, F-04 | 2 |
| F-10 | Recurring slots | A specialist creates a weekly series, with conflicts reported per slot. | FR-12, BR-03, BR-04 | F-03 | 2 |
| F-11 | Specialist cancellation | A specialist cancels a booking with a reason. | FR-13, BR-13 | F-04, F-05 | 2 |
| F-12 | Filtering | Customers and specialists filter lists by specialist, date, or status. | FR-14, FR-15, NFR-10 | F-04, F-05 | 3 |
| F-13 | Appointment outcomes | A specialist records Completed or No-show. | FR-16, BR-14 | F-05 | 3 |
| F-14 | Booking history | Customers and specialists read a booking's status history. | FR-18 | F-06, F-11, F-13 | 3 |
| F-15 | Appointment summary | A specialist reads schedule-level appointment figures. | FR-17, BR-15 | F-13 | 3 |
| F-16 | Public booking pulse | Any visitor views a seven-day aggregate of upcoming bookings on Home, represented by a hair-growth illustration and daily activity bars. | FR-19, BR-16, NFR-08, NFR-13 | F-04 | 2 |
| R-01 | UI quality responsibility | Loading, empty, and error states, and a usable narrow layout. | NFR-08, NFR-09 | all UI features | 1 to 3 |
| R-02 | Delivery responsibility | Configuration, Docker, CI/CD, and GCP deployment. | NFR-07, NFR-11, NFR-12 | F-01 | 1 and Lab 5 |
