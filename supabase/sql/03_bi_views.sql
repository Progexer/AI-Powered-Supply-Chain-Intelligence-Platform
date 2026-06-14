-- SupplyChainIQ Database BI and Reporting Views Setup
-- Run in Supabase Dashboard > SQL Editor > New Query after 02_rls_policies.sql.
-- Purpose: create stable Power BI and dashboard views.

create or replace view public.bi_executive_kpis
with (security_invoker = true)
as
with shipment_summary as (
    select
        count(*) as total_shipments,
        count(*) filter (where is_delayed is true) as delayed_shipments,
        avg(delay_days) filter (where delay_days is not null) as average_delay_days
    from public.fact_shipments
),
demand_summary as (
    select
        coalesce(sum(quantity_demanded), 0) as total_demand_units,
        coalesce(sum(quantity_sold), 0) as total_sold_units,
        coalesce(sum(lost_sales_quantity), 0) as total_lost_sales_units,
        coalesce(sum(revenue), 0) as total_revenue
    from public.fact_sales_demand
),
latest_inventory as (
    select distinct on (product_id, location_id)
        product_id,
        location_id,
        available_quantity,
        reorder_point,
        inventory_value
    from public.fact_inventory_snapshots
    order by product_id, location_id, snapshot_date desc
),
inventory_summary as (
    select
        count(*) as inventory_positions,
        coalesce(sum(inventory_value), 0) as inventory_value,
        count(*) filter (where available_quantity <= reorder_point) as reorder_risk_positions
    from latest_inventory
),
recommendation_summary as (
    select
        count(*) filter (where status = 'open') as open_recommendations,
        count(*) filter (where status = 'open' and severity in ('high', 'critical')) as high_priority_recommendations
    from public.business_recommendations
)
select
    now() as refreshed_at,
    demand_summary.total_demand_units,
    demand_summary.total_sold_units,
    demand_summary.total_lost_sales_units,
    demand_summary.total_revenue,
    shipment_summary.total_shipments,
    shipment_summary.delayed_shipments,
    coalesce(
        round(shipment_summary.delayed_shipments::numeric * 100 / nullif(shipment_summary.total_shipments, 0), 2),
        0
    ) as shipment_delay_rate_pct,
    round(coalesce(shipment_summary.average_delay_days, 0)::numeric, 2) as average_delay_days,
    inventory_summary.inventory_positions,
    inventory_summary.inventory_value,
    inventory_summary.reorder_risk_positions,
    recommendation_summary.open_recommendations,
    recommendation_summary.high_priority_recommendations
from shipment_summary
cross join demand_summary
cross join inventory_summary
cross join recommendation_summary;

create or replace view public.bi_inventory_dashboard
with (security_invoker = true)
as
with latest_inventory as (
    select distinct on (product_id, location_id)
        *
    from public.fact_inventory_snapshots
    order by product_id, location_id, snapshot_date desc
),
latest_forecast as (
    select distinct on (product_id, location_id)
        product_id,
        location_id,
        forecast_date,
        forecast_horizon_days,
        predicted_quantity
    from public.demand_forecasts
    where forecast_date >= current_date
    order by product_id, location_id, forecast_date, created_at desc
),
latest_recommendation as (
    select distinct on (product_id, location_id)
        product_id,
        location_id,
        recommendation_date,
        recommended_order_quantity,
        priority,
        status
    from public.inventory_recommendations
    order by product_id, location_id, recommendation_date desc, created_at desc
)
select
    inv.snapshot_date,
    p.sku,
    p.product_name,
    p.category,
    l.location_code,
    l.location_name,
    l.region,
    inv.on_hand_quantity,
    inv.reserved_quantity,
    inv.available_quantity,
    inv.reorder_point,
    inv.safety_stock,
    inv.inventory_value,
    case when inv.available_quantity <= inv.reorder_point then true else false end as below_reorder_point,
    latest_forecast.forecast_date,
    latest_forecast.forecast_horizon_days,
    latest_forecast.predicted_quantity,
    latest_recommendation.recommended_order_quantity,
    latest_recommendation.priority::text as recommendation_priority,
    latest_recommendation.status::text as recommendation_status
from latest_inventory inv
join public.dim_products p on p.product_id = inv.product_id
join public.dim_locations l on l.location_id = inv.location_id
left join latest_forecast
    on latest_forecast.product_id = inv.product_id
    and latest_forecast.location_id = inv.location_id
left join latest_recommendation
    on latest_recommendation.product_id = inv.product_id
    and latest_recommendation.location_id = inv.location_id;

create or replace view public.bi_supplier_dashboard
with (security_invoker = true)
as
with purchase_order_summary as (
    select
        supplier_id,
        count(*) as total_purchase_orders,
        count(*) filter (where status in ('received', 'closed')) as completed_purchase_orders,
        coalesce(sum(ordered_quantity), 0) as ordered_units,
        coalesce(sum(received_quantity), 0) as received_units,
        coalesce(sum(defect_quantity), 0) as defect_units,
        count(*) filter (
            where actual_delivery_date is not null
            and actual_delivery_date <= expected_delivery_date
        ) as on_time_purchase_orders
    from public.fact_purchase_orders
    group by supplier_id
),
latest_score as (
    select distinct on (supplier_id)
        supplier_id,
        score_date,
        delivery_score,
        quality_score,
        cost_score,
        reliability_score,
        overall_score,
        risk_tier
    from public.supplier_performance_scores
    order by supplier_id, score_date desc, created_at desc
)
select
    s.supplier_code,
    s.supplier_name,
    s.country,
    s.region,
    s.default_lead_time_days,
    coalesce(pos.total_purchase_orders, 0) as total_purchase_orders,
    coalesce(pos.completed_purchase_orders, 0) as completed_purchase_orders,
    coalesce(pos.ordered_units, 0) as ordered_units,
    coalesce(pos.received_units, 0) as received_units,
    coalesce(pos.defect_units, 0) as defect_units,
    coalesce(
        round(pos.on_time_purchase_orders::numeric * 100 / nullif(pos.completed_purchase_orders, 0), 2),
        0
    ) as supplier_on_time_rate_pct,
    coalesce(
        round(pos.defect_units::numeric * 100 / nullif(pos.received_units, 0), 2),
        0
    ) as defect_rate_pct,
    latest_score.score_date,
    latest_score.delivery_score,
    latest_score.quality_score,
    latest_score.cost_score,
    latest_score.reliability_score,
    latest_score.overall_score,
    latest_score.risk_tier::text as risk_tier
from public.dim_suppliers s
left join purchase_order_summary pos on pos.supplier_id = s.supplier_id
left join latest_score on latest_score.supplier_id = s.supplier_id;

create or replace view public.bi_logistics_dashboard
with (security_invoker = true)
as
with latest_delay_prediction as (
    select distinct on (shipment_id)
        shipment_id,
        predicted_delay_probability,
        predicted_delay_days,
        risk_level,
        created_at as prediction_created_at
    from public.shipment_delay_predictions
    order by shipment_id, created_at desc
)
select
    sh.shipment_number,
    sh.ship_date,
    sh.expected_delivery_date,
    sh.actual_delivery_date,
    sh.status::text as status,
    sh.shipped_quantity,
    sh.delivered_quantity,
    sh.freight_cost,
    sh.distance_km,
    sh.delay_days,
    sh.is_delayed,
    p.sku,
    p.product_name,
    c.carrier_code,
    c.carrier_name,
    c.transport_mode::text as transport_mode,
    src.location_code as source_location_code,
    src.location_name as source_location_name,
    dest.location_code as destination_location_code,
    dest.location_name as destination_location_name,
    s.supplier_code,
    s.supplier_name,
    latest_delay_prediction.predicted_delay_probability,
    latest_delay_prediction.predicted_delay_days,
    latest_delay_prediction.risk_level::text as predicted_delay_risk_level,
    latest_delay_prediction.prediction_created_at
from public.fact_shipments sh
join public.dim_products p on p.product_id = sh.product_id
left join public.dim_carriers c on c.carrier_id = sh.carrier_id
left join public.dim_locations src on src.location_id = sh.source_location_id
join public.dim_locations dest on dest.location_id = sh.destination_location_id
left join public.dim_suppliers s on s.supplier_id = sh.supplier_id
left join latest_delay_prediction on latest_delay_prediction.shipment_id = sh.shipment_id;

create or replace view public.bi_inventory_recommendations
with (security_invoker = true)
as
select
    p.sku,
    p.product_name,
    r.current_stock,
    r.reorder_point,
    r.recommended_order_quantity,
    r.safety_stock,
    r.priority::text as priority,
    r.status::text as status
from public.inventory_recommendations r
join public.dim_products p on p.product_id = r.product_id;

grant select on
    public.bi_executive_kpis,
    public.bi_inventory_dashboard,
    public.bi_supplier_dashboard,
    public.bi_logistics_dashboard,
    public.bi_inventory_recommendations
to authenticated;
