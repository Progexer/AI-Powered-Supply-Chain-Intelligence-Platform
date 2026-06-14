# Power BI Analytics Dashboard

This directory contains the business intelligence (BI) resources and setup guides for integrating **SupplyChainIQ** data with Microsoft Power BI.

---

## 📊 Available Assets

* **`SupplyChainIQ_User_Template.pbit`**: A dynamic Power BI template pre-configured to query your Supabase PostgreSQL database and filter dashboard visualizations dynamically based on the registered user email parameter.

---

## ⚙️ Power BI Setup Guide

### 1. Connect Power BI to Supabase
1. Launch **Power BI Desktop**.
2. Click **Home** ➔ **Get Data** ➔ **PostgreSQL database**.
3. Enter your database connection server and database name (from your `.env` file):
   * **Server**: `aws-1-ap-northeast-1.pooler.supabase.com` (or your direct/session pooling host)
   * **Database**: `postgres`
4. Go to the **Database** credential tab, enter `postgres` as the user and your database password, then click **Connect**.
5. Select and load the following core reporting tables/views:
   * `dim_products`
   * `dim_suppliers`
   * `dim_locations`
   * `supplier_performance_scores`
   * `inventory_recommendations`
   * `user_predictions_log`

### 2. User-Specific Dynamic Filtering
To ensure users only see their own workspace data, the template employs a `UserEmail` parameter:
1. In the Power Query Editor (**Transform Data**), click **Manage Parameters** ➔ **New Parameter**.
2. Name it `UserEmail`, select Type `Text`, and input your registered email address (e.g., `user@domain.com`).
3. Apply a text filter on the target tables (such as `user_predictions_log`) matching the `UserEmail` parameter, then click **Close & Apply**.
