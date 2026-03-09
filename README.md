# Plantation Platform
![Deployment Status](https://github.com/Knoweb/plantation-platform/actions/workflows/deploy.yml/badge.svg)

Web-based management system for plantation estates.

## Comprehensive Features

The system is designed as a multi-tenant SaaS platform where features are access-controlled depending on the user's role.

### 1. Super Admin Dashboard (Platform Management)
*This dashboard is used by the overarching platform administrators to manage the different estates (tenants) using the software.*

* **Estates Overview:** A top-level view of all registered estates (tenants) using the platform.
* **Estate Details Management:** View and manage specific details, subscription statuses, and configurations for individual estates.
* **Tenant Onboarding (New Estate):** A guided workflow to register new estates onto the platform, setting up their initial database schemas and primary administrator accounts.

### 2. Estate Admin Dashboard (Estate Configuration)
*Used by the primary owner or highest-level administrator of a specific estate to oversee configurations and staff.*

* **Estate Dashboard:** High-level summary of the estate's status.
* **Staff Management (Users):** Add, edit, deactivate, and assign roles to system users (Managers, Clerks, Store Keepers, Field Officers).
* **Divisions Management:** Create and configure geographical sectors (Divisions) of the estate.
* **Harvest Logs:** A top-level view or summary of the estate's overall harvested crops.
* **System Configuration:** Manage overall estate settings, such as the estate name, logo, and core preferences.
* **Correspondence:** In-app messaging system to communicate with the estate staff.

### 3. Manager / Manager Clerk Dashboard (Overall Operations)
*The central hub for Estate Managers to oversee daily operations, approve requests, and monitor performance.*

* **Manager Dashboard:** A comprehensive view of operational metrics.
* **Divisions View:** Quick navigation to drill down into the performance, warnings, and metrics of specific divisions.
* **Muster Review & Approval:** Review and approve the daily musters submitted by Field Officers. Includes real-time alerts for pending reviews.
* **Pending Approvals Hub:** A centralized queue to approve various requests, including Restock Requests and Field Officer Requisitions.
* **General Stock Alerts:** Monitor the estate's overall inventory with automated alerts for items that fall below buffer/reorder levels.
* **Operational Targets & Norms:** Define daily targets, harvesting norms, and piece-rate settings for workers and fields.
* **Worker Registry Management:** Oversee the estate worker database and approve newly registered workers. Includes notification badges for pending approvals.
* **Crop Book:** A ledger to manage, track, and historical view of crop records and yield data.
* **Leave Management:** Review and approve leave requests for staff and field workers.
* **KPIs (Key Performance Indicators):** View analytical data and performance indicators for the estate and its divisions.
* **Correspondence:** Real-time messaging with individual teams (e.g., Field Officers, Admin) with unread message counts.

### 4. Chief Clerk Dashboard (Administration & Inventory Oversight)
*Designed for administrative oversight, worker management, and inventory checks.*

* **Clerk Dashboard:** Overview of administrative duties and pending bottlenecks.
* **Job Roles & Tasks Configuration:** Configure specific job roles, task types, and related payment parameters for workers.
* **Worker Registry:** Central registry to add, edit, and maintain detailed profiles of the estate's workforce.
* **Inventory Management Oversight:** Oversee inventory requests and take action on specific restock or supply requests that require clerical clearance.
* **Correspondence:** Direct messaging system.

### 5. Field Officer Dashboard (On-ground Operations)
*The most feature-dense dashboard, designed for on-the-ground management of divisions, workers, fields, and daily tasks.*

* **Field Officer Dashboard:** Daily summary of the ongoing operations in assigned divisions.
* **Morning Muster:** A digitized registry to mark worker daily attendance, assign specific tasks/blocks, and distribute the workforce.
* **Evening Muster:** Log the day's completion metrics, including total harvest collected by workers, piece-rate achievements, and task closures. Includes a blinking "Pending Submission" alert if musters are missed.
* **Attendance History:** Review the historical logs of worker attendance within their division.
* **Crop Achievements:** Analyze daily and weekly harvest amounts against predefined targets.
* **Field Log & Crop Ages:** Track the specific lifespan, planting dates, and age of crops within the blocks.
* **Fertilizer Programme:** Plan, execute, and record the usage of fertilizers across different fields.
* **Distribution of Works:** A visual log of how work (weeding, plucking, maintenance) is distributed geographically.
* **Order Request (Inventory):** Form to place requests for materials, equipment, or chemicals from the main store.
* **Request / Pending Orders History:** Track the status of placed inventory requests (Pending, Approved, Dispatched).
* **Leave Application:** Submit leave applications or record leaves for their managed workers.
* **Field KPIs:** View key performance indicators localized to their specific division.
* **Field Crop Book:** Manage field-specific harvest and agricultural records.
* **Cost Analysis:** Break down and analyze operational costs (labor, materials) at the division level.
* **Correspondence:** Connect with Managers and Store Keepers.

### 6. Store Keeper Dashboard (Inventory & Stock Management)
*Dedicated to managing physical items, executing dispatches, and maintaining stock truth.*

* **Store Dashboard:** High-level view of inventory health and pending dispatch actions.
* **Inventory Main:** View current stock quantities, categories, and buffer levels. (Note: Store Keepers cannot add new items directly; additions are done by the Manager upon request from the Chief Clerk).
* **Pending Approvals / Dispatches:** Fulfill and dispatch inventory requisitions that have been approved by Managers/Chief Clerk. Includes alert badges for immediate items needing dispatch.
* **Recent Transactions:** A historical, immutable log of all inventory movements (Stock Ins and Stock Outs).
* **Correspondence:** Chat functionality with Managers and Field Officers to clarify orders.

### Core System-Wide Capabilities
Besides the individual dashboard features, the platform integrates the following overarching architectures:

1. **Multi-Tenant Architecture:** Complete data isolation per estate. Super Admins manage multiple independent estates under one SaaS deployment.
2. **Real-Time Notification & Polling System:** The dashboard utilizes an active polling mechanism to fetch Real-time Alerts for unread chats, pending musters, low stock, and approval requirements.
3. **Role-Based Access Control (RBAC):** Every UI element and API route is strictly bound to authorization.
4. **Global Alerts Hub:** A unified notification bell on the application header that aggregates all alerts (Muster Reviews, Stock Issues, Chats) across the respective user's dashboard.
