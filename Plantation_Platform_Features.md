# Plantation Management Platform - System Features

This document provides a comprehensive overview of the features available in the Plantation Management Platform, organized by user role and dashboard.

---

## 1. Super Admin Dashboard
The Super Admin is responsible for managing the overarching SaaS platform and configuring individual estates/companies.

*   **Platform Overview:** High-level metrics on active estates, total users, and system health.
*   **Estate/Company Management:** View a comprehensive list of all registered estates. Activate, deactivate, or edit high-level configuration details for each estate.
*   **Tenant Onboarding:** Register new estates onto the platform, assigning them a unique tenant ID, administrator credentials, and dedicated database schemas to ensure data isolation.

---

## 2. Estate Admin / Manager Dashboard
The Manager oversees the daily operations of the entire estate, monitoring costs, crop yields, and approving critical workflows.

*   **Executive KPIs & Cost Analysis:** Centralized dashboard displaying aggregated data on crop yields, labor costs, and operational targets.
*   **Division Management:** Create, define, and manage the various geographical "Divisions" within the estate.
*   **Muster Review (Manager):** Review daily morning musters submitted by Field Officers. Provides the ability to audit worker assignments, task allocations, and formally Approve or Reject the muster with manager remarks.
*   **Pending Approvals:** A central hub to review and approve/reject critical requests from Field Officers, such as stock/inventory requisitions and finalized daily entries.
*   **Crop Book:** A comprehensive, dynamic ledger tracking daily performance metrics including:
    *   Factory Weight & Field Weight
    *   Checkroll Weight
    *   Yield per Acre
    *   Number of Pluckers & Plucking Averages
    *   Cash Kilos & Over Kilos
*   **Attendance Reports:** Generate and analyze estate-wide or division-specific worker attendance patterns over defined date ranges.
*   **Leave Management:** Review, approve, or reject formal leave applications submitted for the estate staff and workforce.
*   **Worker Registry Oversight:** Global view of all registered workers (Permanent, Casual, Contract) operating across all divisions.

---

## 3. Field Officer (FO) Dashboard
The Field Officer is the "boots on the ground" role, managing day-to-day labor assignments, tracking daily crop weights, and ensuring field productivity.

*   **Worker Registry:** Register new workers under specific employment types (Permanent, Casual, Contract), manage bio-data, and assign unique worker IDs (or barcodes).
*   **Morning Muster:** 
    *   Assign available workers (Floating Pool) to specific Tasks (e.g., Plucking, Tapping, Transport).
    *   Allocate workers to specific Fields within the division.
    *   Smart aggregation: Automatically merges identical task/field assignments before submission.
    *   Submit the finalized Morning Muster securely for Manager review.
*   **Daily Entry (Evening Muster):** 
    *   Record daily outputs for each worker (AM Weight, PM Weight).
    *   Log extra output metrics: "Over Kilos" and "Cash Kilos" (Overtime hours).
    *   Manage attendance statuses dynamically (Present, Absent, Half Day/Half Athtama).
    *   Enter total bulk "Field Wt" and "Factory Weight" for the entire division after session close.
*   **Field Officer Crop Book:** A localized view of the Crop Book tailored just for the Field Officer's assigned divisions.
*   **Divisional Inventory (General Stock):** Real-time tracking of tools and materials actively held at the division level.
*   **Order Requests (Requisitions):** Formally request new tools, fertilizer, or materials from the central Store Keeper.
*   **Pending Orders:** Track the status (Pending, Approved, Rejected) of submitted order requests.
*   **Fertilizer Programme:** Plan, record, and track fertilizer application cycles per field.
*   **Leave Application:** Submit leave requests on behalf of the division's workforce.
*   **Distribution of Works:** Visualize how labor is distributed across various tasks and fields on any given day.

---

## 4. Chief Clerk Dashboard
The Chief Clerk is responsible for defining the operational norms, payment calculations, and standardizing estate data.

*   **Job Roles & Task Type Settings:** Create and standardize the task catalog (e.g., Plucking, Tapping, Weeding). Define whether tasks are piece-rate or daily-wage.
*   **Norms Settings:** Define baseline targets for crop yields, standard plucking averages, and worker quotas that drive over-kilo calculations.
*   **Data Standardization:** Ensure that worker assignments and task catalogs remain consistent across all divisions to allow for accurate payroll generation.

---

## 5. Store Keeper Dashboard
The Store Keeper manages the estate's central inventory warehouse, fulfilling orders from Field Officers and tracking stock levels.

*   **Central Inventory Management:** Add new items, update existing stock, define stock thresholds, and view current central warehouse quantities.
*   **Order Approvals (Fulfillment):** Review incoming item requisitions (Order Requests) from Field Officers. Approve (fulfill) or Reject requests based on stock availability.
*   **Transaction History:** A comprehensive, immutable ledger of all inventory movements.
    *   Tracks Incoming Restocks.
    *   Tracks Outgoing Requisitions (FO distributions).
    *   Clearly displays the Requester's name and role, the Approver's name, action timestamps, and associated remarks.

---
*Generated automatically by the Plantation Management Platform System.*
