-- SupplyChainIQ Database Smoke Test Validation
-- Run in Supabase Dashboard > SQL Editor > New Query after 04_verification_queries.sql.
-- Purpose: validate core inserts and relationships without keeping test data.
-- Expected result: success message; final rollback means no smoke-test rows remain.

begin;

do $$
declare
    v_suffix text := replace(gen_random_uuid()::text, '-', '');
    v_batch uuid;
    v_source_file uuid;
    v_supplier uuid;
    v_product uuid;
    v_supplier_product uuid;
    v_source_location uuid;
    v_destination_location uuid;
    v_customer_location uuid;
    v_carrier uuid;
    v_purchase_order uuid;
    v_customer_order uuid;
    v_shipment uuid;
    v_model uuid;
    v_inventory_recommendation uuid;
begin
    insert into public.etl_batch_runs (
        pipeline_name,
        source_name,
        status,
        rows_read,
        rows_inserted,
        rows_rejected,
        metadata
    )
    values (
        'schema_smoke_test',
        'manual_sql_editor',
        'success',
        1,
        1,
        0,
        jsonb_build_object('purpose', 'schema validation')
    )
    returning batch_id into v_batch;

    insert into public.raw_source_files (
        batch_id,
        source_name,
        file_name,
        file_type,
        file_hash,
        row_count
    )
    values (
        v_batch,
        'manual_sql_editor',
        'smoke_test_' || v_suffix || '.csv',
        'csv',
        v_suffix,
        1
    )
    returning file_id into v_source_file;

    insert into public.raw_source_records (
        file_id,
        source_name,
        source_row_number,
        payload
    )
    values (
        v_source_file,
        'manual_sql_editor',
        1,
        jsonb_build_object('sku', 'SMOKE-' || v_suffix)
    );

    insert into public.dim_products (
        sku,
        product_name,
        category,
        subcategory,
        unit_cost,
        unit_price
    )
    values (
        'SMOKE-SKU-' || v_suffix,
        'Smoke Test Product',
        'Validation',
        'Schema',
        10.00,
        15.00
    )
    returning product_id into v_product;

    insert into public.dim_suppliers (
        supplier_code,
        supplier_name,
        country,
        region,
        default_lead_time_days
    )
    values (
        'SMOKE-SUP-' || v_suffix,
        'Smoke Test Supplier',
        'United States',
        'North America',
        7
    )
    returning supplier_id into v_supplier;

    insert into public.supplier_products (
        supplier_id,
        product_id,
        contracted_unit_cost,
        min_order_quantity,
        lead_time_days,
        is_preferred
    )
    values (
        v_supplier,
        v_product,
        9.50,
        10,
        7,
        true
    )
    returning supplier_product_id into v_supplier_product;

    insert into public.dim_locations (
        location_code,
        location_name,
        location_type,
        city,
        state,
        country,
        region
    )
    values (
        'SMOKE-SRC-' || v_suffix,
        'Smoke Source Warehouse',
        'warehouse',
        'Dallas',
        'TX',
        'United States',
        'North America'
    )
    returning location_id into v_source_location;

    insert into public.dim_locations (
        location_code,
        location_name,
        location_type,
        city,
        state,
        country,
        region
    )
    values (
        'SMOKE-DST-' || v_suffix,
        'Smoke Destination Warehouse',
        'distribution_center',
        'Austin',
        'TX',
        'United States',
        'North America'
    )
    returning location_id into v_destination_location;

    insert into public.dim_locations (
        location_code,
        location_name,
        location_type,
        city,
        state,
        country,
        region
    )
    values (
        'SMOKE-CUST-' || v_suffix,
        'Smoke Customer Location',
        'customer',
        'Houston',
        'TX',
        'United States',
        'North America'
    )
    returning location_id into v_customer_location;

    insert into public.dim_carriers (
        carrier_code,
        carrier_name,
        transport_mode
    )
    values (
        'SMOKE-CAR-' || v_suffix,
        'Smoke Test Carrier',
        'road'
    )
    returning carrier_id into v_carrier;

    insert into public.fact_purchase_orders (
        po_number,
        supplier_id,
        product_id,
        order_date,
        expected_delivery_date,
        actual_delivery_date,
        ordered_quantity,
        received_quantity,
        unit_cost,
        status,
        defect_quantity,
        quality_score,
        batch_id
    )
    values (
        'SMOKE-PO-' || v_suffix,
        v_supplier,
        v_product,
        current_date - 14,
        current_date - 7,
        current_date - 6,
        100,
        98,
        9.50,
        'received',
        1,
        97.50,
        v_batch
    )
    returning purchase_order_id into v_purchase_order;

    insert into public.fact_customer_orders (
        order_number,
        customer_location_id,
        product_id,
        order_date,
        promised_delivery_date,
        actual_delivery_date,
        ordered_quantity,
        fulfilled_quantity,
        unit_price,
        status,
        batch_id
    )
    values (
        'SMOKE-CO-' || v_suffix,
        v_customer_location,
        v_product,
        current_date - 10,
        current_date - 2,
        current_date - 1,
        25,
        25,
        15.00,
        'fulfilled',
        v_batch
    )
    returning customer_order_id into v_customer_order;

    insert into public.fact_sales_demand (
        demand_date,
        product_id,
        location_id,
        sales_channel,
        quantity_demanded,
        quantity_sold,
        lost_sales_quantity,
        revenue,
        batch_id
    )
    values (
        current_date - 1,
        v_product,
        v_destination_location,
        'smoke_test',
        30,
        25,
        5,
        375.00,
        v_batch
    );

    insert into public.fact_inventory_snapshots (
        snapshot_date,
        product_id,
        location_id,
        on_hand_quantity,
        reserved_quantity,
        reorder_point,
        safety_stock,
        unit_cost_snapshot,
        batch_id
    )
    values (
        current_date,
        v_product,
        v_destination_location,
        80,
        10,
        50,
        20,
        10.00,
        v_batch
    );

    insert into public.fact_shipments (
        shipment_number,
        carrier_id,
        supplier_id,
        product_id,
        source_location_id,
        destination_location_id,
        purchase_order_id,
        customer_order_id,
        ship_date,
        expected_delivery_date,
        actual_delivery_date,
        shipped_quantity,
        delivered_quantity,
        freight_cost,
        distance_km,
        status,
        batch_id
    )
    values (
        'SMOKE-SHIP-' || v_suffix,
        v_carrier,
        v_supplier,
        v_product,
        v_source_location,
        v_destination_location,
        v_purchase_order,
        v_customer_order,
        current_date - 5,
        current_date - 2,
        current_date - 1,
        25,
        25,
        125.00,
        310.50,
        'delivered',
        v_batch
    )
    returning shipment_id into v_shipment;

    insert into public.model_registry (
        model_name,
        model_type,
        version,
        target_variable,
        algorithm,
        training_start_date,
        training_end_date,
        metrics,
        artifact_path,
        is_active
    )
    values (
        'smoke_test_model',
        'delay_prediction',
        'v-' || v_suffix,
        'is_delayed',
        'manual_validation',
        current_date - 30,
        current_date - 1,
        jsonb_build_object('auc', 0.80),
        'models/smoke-test.joblib',
        false
    )
    returning model_id into v_model;

    insert into public.demand_forecasts (
        model_id,
        product_id,
        location_id,
        forecast_date,
        forecast_horizon_days,
        predicted_quantity,
        lower_bound,
        upper_bound
    )
    values (
        v_model,
        v_product,
        v_destination_location,
        current_date + 7,
        7,
        45.00,
        35.00,
        55.00
    );

    insert into public.shipment_delay_predictions (
        model_id,
        shipment_id,
        predicted_delay_probability,
        predicted_delay_days,
        risk_level,
        explanation
    )
    values (
        v_model,
        v_shipment,
        0.7000,
        1.25,
        'high',
        jsonb_build_object('reason', 'smoke test')
    );

    insert into public.supplier_performance_scores (
        model_id,
        supplier_id,
        score_date,
        delivery_score,
        quality_score,
        cost_score,
        reliability_score,
        overall_score,
        risk_tier,
        explanation
    )
    values (
        v_model,
        v_supplier,
        current_date,
        88.00,
        97.00,
        91.00,
        90.00,
        91.50,
        'low',
        jsonb_build_object('reason', 'smoke test')
    );

    insert into public.inventory_recommendations (
        model_id,
        product_id,
        location_id,
        recommendation_date,
        current_stock,
        forecasted_demand,
        reorder_point,
        recommended_order_quantity,
        safety_stock,
        expected_stockout_date,
        priority,
        status,
        rationale
    )
    values (
        v_model,
        v_product,
        v_destination_location,
        current_date,
        70,
        45.00,
        50,
        25,
        20,
        current_date + 14,
        'medium',
        'open',
        'Smoke test recommendation.'
    )
    returning inventory_recommendation_id into v_inventory_recommendation;

    insert into public.business_recommendations (
        related_inventory_recommendation_id,
        supplier_id,
        shipment_id,
        product_id,
        location_id,
        recommendation_type,
        severity,
        title,
        description,
        action_owner,
        status,
        expected_impact_value
    )
    values (
        v_inventory_recommendation,
        v_supplier,
        v_shipment,
        v_product,
        v_destination_location,
        'reorder',
        'medium',
        'Smoke test reorder check',
        'Validates recommendation relationships.',
        'Supply Chain Analyst',
        'open',
        1000.00
    );
end $$;

rollback;
