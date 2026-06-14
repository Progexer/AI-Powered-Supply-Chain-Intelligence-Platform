-- SupplyChainIQ Database Extensions and Enum Types Setup
-- Run in Supabase Dashboard > SQL Editor > New Query.
-- Purpose: enable required extensions and shared enum types.

create extension if not exists pgcrypto;

do $$
begin
    create type public.app_role as enum ('admin', 'analyst', 'manager', 'executive');
exception
    when duplicate_object then null;
end $$;

do $$
begin
    create type public.location_type as enum (
        'supplier',
        'warehouse',
        'distribution_center',
        'port',
        'store',
        'customer'
    );
exception
    when duplicate_object then null;
end $$;

do $$
begin
    create type public.transport_mode as enum ('road', 'rail', 'ocean', 'air', 'multimodal');
exception
    when duplicate_object then null;
end $$;

do $$
begin
    create type public.purchase_order_status as enum (
        'planned',
        'placed',
        'in_transit',
        'received',
        'cancelled',
        'closed'
    );
exception
    when duplicate_object then null;
end $$;

do $$
begin
    create type public.customer_order_status as enum (
        'planned',
        'open',
        'partially_fulfilled',
        'fulfilled',
        'cancelled',
        'returned'
    );
exception
    when duplicate_object then null;
end $$;

do $$
begin
    create type public.shipment_status as enum (
        'planned',
        'in_transit',
        'delivered',
        'delayed',
        'cancelled'
    );
exception
    when duplicate_object then null;
end $$;

do $$
begin
    create type public.etl_status as enum ('running', 'success', 'failed', 'partial');
exception
    when duplicate_object then null;
end $$;

do $$
begin
    create type public.data_quality_severity as enum ('info', 'warning', 'error', 'critical');
exception
    when duplicate_object then null;
end $$;

do $$
begin
    create type public.model_type as enum (
        'demand_forecast',
        'delay_prediction',
        'supplier_scoring',
        'inventory_optimization',
        'recommendation'
    );
exception
    when duplicate_object then null;
end $$;

do $$
begin
    create type public.risk_level as enum ('low', 'medium', 'high', 'critical');
exception
    when duplicate_object then null;
end $$;

do $$
begin
    create type public.recommendation_status as enum (
        'open',
        'accepted',
        'rejected',
        'completed',
        'expired'
    );
exception
    when duplicate_object then null;
end $$;

do $$
begin
    create type public.recommendation_type as enum (
        'reorder',
        'supplier_risk',
        'logistics_intervention',
        'demand_planning',
        'inventory_rebalance'
    );
exception
    when duplicate_object then null;
end $$;
