"""SupplyChainIQ Statistical Analysis — Executable Script.

This script:
- runs statistical tests with proper methodology
- computes Cramer's V
- uses Spearman correlation for Dataset 2
- generates charts into notebooks/charts_stats/
- writes a verified JSON results file for validation

Run from project root:
    python notebooks/run_statistical_analysis.py
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import matplotlib
matplotlib.use("Agg")  # non-interactive backend for chart generation

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from scipy import stats


ROOT = Path(__file__).resolve().parents[1]
PROCESSED = ROOT / "data" / "processed"
CHARTS = ROOT / "notebooks" / "charts_stats"
RESULTS_JSON = ROOT / "notebooks" / "statistical_analysis_results.json"

CHARTS.mkdir(parents=True, exist_ok=True)
sns.set_theme(style="whitegrid")


def cramers_v(confusion_matrix: pd.DataFrame) -> float:
    """Compute Cramer's V from a contingency table."""
    chi2 = stats.chi2_contingency(confusion_matrix)[0]
    n = confusion_matrix.to_numpy().sum()
    r, k = confusion_matrix.shape
    return math.sqrt(chi2 / (n * (min(r, k) - 1)))


def load_data() -> tuple[pd.DataFrame, pd.DataFrame]:
    d1 = pd.read_csv(PROCESSED / "supplychainiq_dataset1_clean.csv", low_memory=False)
    d2 = pd.read_csv(PROCESSED / "supplychainiq_dataset2_clean.csv")
    for col in ["order_date", "shipping_date"]:
        if col in d1.columns:
            d1[col] = pd.to_datetime(d1[col], errors="coerce")
    return d1, d2


def test_profit_margin_vs_late(d1: pd.DataFrame) -> dict:
    """Hypothesis 1: Late shipments do not change profit margin (Welch t-test)."""
    on_time = d1.loc[d1["late_delivery_flag"] == 0, "profit_margin_pct"].dropna()
    late = d1.loc[d1["late_delivery_flag"] == 1, "profit_margin_pct"].dropna()
    result = stats.ttest_ind(on_time, late, equal_var=False, nan_policy="omit")
    return {
        "test": "Welch t-test",
        "hypothesis": "Late shipments do not change profit margin",
        "on_time_mean": round(float(on_time.mean()), 4),
        "late_mean": round(float(late.mean()), 4),
        "on_time_std": round(float(on_time.std()), 4),
        "late_std": round(float(late.std()), 4),
        "on_time_n": int(len(on_time)),
        "late_n": int(len(late)),
        "t_statistic": round(float(result.statistic), 4),
        "p_value": round(float(result.pvalue), 6),
        "significant_at_005": bool(result.pvalue < 0.05),
    }


def test_shipping_mode_vs_late(d1: pd.DataFrame) -> dict:
    """Hypothesis 2: Shipping mode and late-delivery risk are independent (Chi-square + Cramer's V)."""
    ct = pd.crosstab(d1["shipping_mode"], d1["late_delivery_flag"])
    chi2, p, dof, expected = stats.chi2_contingency(ct)
    v = cramers_v(ct)
    return {
        "test": "Chi-square test of independence + Cramer's V",
        "hypothesis": "Shipping mode and late-delivery risk are independent",
        "contingency_table": ct.to_dict(),
        "chi2_statistic": round(float(chi2), 4),
        "p_value": float(p),
        "degrees_of_freedom": int(dof),
        "cramers_v": round(float(v), 4),
        "significant_at_005": bool(p < 0.05),
        "effect_size_interpretation": (
            "negligible" if v < 0.1
            else "small" if v < 0.3
            else "medium" if v < 0.5
            else "large"
        ),
    }


def test_defect_rate_vs_inspection(d2: pd.DataFrame) -> dict:
    """Hypothesis 3: Defect rates do not differ by inspection result (Kruskal-Wallis)."""
    groups = {}
    for result_type in ["Pass", "Fail", "Pending"]:
        vals = d2.loc[d2["inspection_result"] == result_type, "defect_rate_raw"].dropna()
        groups[result_type] = vals

    kw = stats.kruskal(*groups.values())

    group_stats = {}
    for name, vals in groups.items():
        group_stats[name] = {
            "n": int(len(vals)),
            "mean": round(float(vals.mean()), 4),
            "median": round(float(vals.median()), 4),
            "std": round(float(vals.std()), 4),
        }

    return {
        "test": "Kruskal-Wallis H test",
        "hypothesis": "Defect rates do not differ by inspection result",
        "group_stats": group_stats,
        "h_statistic": round(float(kw.statistic), 4),
        "p_value": round(float(kw.pvalue), 6),
        "significant_at_005": bool(kw.pvalue < 0.05),
        "note": "Defect rate units remain unresolved (76% of values > 1.0).",
    }


def compute_correlations(d1: pd.DataFrame, d2: pd.DataFrame) -> dict:
    """Correlation analysis: Pearson for Dataset 1, Spearman for Dataset 2."""
    d1_cols = [
        "sales", "benefit_per_order", "order_item_discount_rate",
        "order_item_quantity", "delivery_delay_days", "profit_margin_pct",
    ]
    d1_cols_present = [c for c in d1_cols if c in d1.columns]
    d1_corr = d1[d1_cols_present].corr(method="pearson")

    d2_cols = [
        "stock_levels", "products_sold", "revenue_generated",
        "shipping_cost", "lead_time_gap_days",
    ]
    d2_cols_present = [c for c in d2_cols if c in d2.columns]
    d2_corr_pearson = d2[d2_cols_present].corr(method="pearson")
    d2_corr_spearman = d2[d2_cols_present].corr(method="spearman")

    # Key pairs to highlight
    d1_highlights = {}
    pairs_d1 = [
        ("sales", "benefit_per_order"),
        ("benefit_per_order", "profit_margin_pct"),
        ("delivery_delay_days", "profit_margin_pct"),
        ("order_item_discount_rate", "profit_margin_pct"),
    ]
    for a, b in pairs_d1:
        if a in d1_corr.columns and b in d1_corr.columns:
            d1_highlights[f"{a}_vs_{b}"] = round(float(d1_corr.loc[a, b]), 4)

    d2_highlights = {}
    pairs_d2 = [
        ("stock_levels", "products_sold"),
        ("products_sold", "revenue_generated"),
        ("stock_levels", "revenue_generated"),
    ]
    for a, b in pairs_d2:
        if a in d2_corr_spearman.columns and b in d2_corr_spearman.columns:
            d2_highlights[f"{a}_vs_{b}_spearman"] = round(float(d2_corr_spearman.loc[a, b]), 4)
            d2_highlights[f"{a}_vs_{b}_pearson"] = round(float(d2_corr_pearson.loc[a, b]), 4)

    return {
        "dataset1_method": "Pearson",
        "dataset1_highlights": d1_highlights,
        "dataset1_full_matrix": {
            col: {row: round(float(d1_corr.loc[row, col]), 4) for row in d1_corr.index}
            for col in d1_corr.columns
        },
        "dataset2_method": "Spearman (primary) + Pearson (secondary)",
        "dataset2_highlights": d2_highlights,
        "dataset2_spearman_matrix": {
            col: {row: round(float(d2_corr_spearman.loc[row, col]), 4) for row in d2_corr_spearman.index}
            for col in d2_corr_spearman.columns
        },
    }, d1_corr, d2_corr_spearman


def generate_charts(
    d1: pd.DataFrame,
    d2: pd.DataFrame,
    d1_corr: pd.DataFrame,
    d2_corr: pd.DataFrame,
) -> list[str]:
    """Generate all statistical charts."""
    created = []

    # 1. Dataset 1 correlation heatmap
    fig, ax = plt.subplots(figsize=(9, 7))
    sns.heatmap(d1_corr, annot=True, cmap="Blues", ax=ax, fmt=".2f", linewidths=0.5)
    ax.set_title("Dataset 1: Pearson Correlation Heatmap", fontsize=14)
    path = CHARTS / "correlation_heatmap_dataset1.png"
    fig.tight_layout()
    fig.savefig(path, dpi=160)
    plt.close(fig)
    created.append(path.name)

    # 2. Dataset 2 Spearman correlation heatmap
    fig, ax = plt.subplots(figsize=(9, 7))
    sns.heatmap(d2_corr, annot=True, cmap="Greens", ax=ax, fmt=".2f", linewidths=0.5)
    ax.set_title("Dataset 2: Spearman Correlation Heatmap", fontsize=14)
    path = CHARTS / "correlation_heatmap_dataset2.png"
    fig.tight_layout()
    fig.savefig(path, dpi=160)
    plt.close(fig)
    created.append(path.name)

    # 3. Profit margin by late delivery flag (boxplot)
    fig, ax = plt.subplots(figsize=(8, 6))
    d1_plot = d1.copy()
    d1_plot["late_delivery_flag"] = d1_plot["late_delivery_flag"].astype(str)
    sns.boxplot(
        data=d1_plot, x="late_delivery_flag", y="profit_margin_pct",
        hue="late_delivery_flag", legend=False, ax=ax,
        palette={"0": "#22c55e", "1": "#ef4444"},
    )
    ax.set_title("Profit Margin by Late Delivery Flag (Welch t-test)", fontsize=13)
    ax.set_xlabel("Late Delivery Flag (0 = On-Time, 1 = Late)")
    ax.set_ylabel("Profit Margin %")
    path = CHARTS / "profit_margin_by_late_flag.png"
    fig.tight_layout()
    fig.savefig(path, dpi=160)
    plt.close(fig)
    created.append(path.name)

    # 4. Shipping mode vs late delivery (stacked bar)
    ct = pd.crosstab(d1["shipping_mode"], d1["late_delivery_flag"], normalize="index")
    fig, ax = plt.subplots(figsize=(9, 6))
    ct.plot(kind="bar", stacked=True, ax=ax, color=["#22c55e", "#ef4444"])
    ax.set_title("Shipping Mode vs Late Delivery Risk (Chi-square)", fontsize=13)
    ax.set_xlabel("Shipping Mode")
    ax.set_ylabel("Proportion")
    ax.legend(["On-Time", "Late"], title="Delivery")
    ax.set_xticklabels(ax.get_xticklabels(), rotation=30, ha="right")
    path = CHARTS / "shipping_mode_vs_late_delivery.png"
    fig.tight_layout()
    fig.savefig(path, dpi=160)
    plt.close(fig)
    created.append(path.name)

    # 5. Defect rate by inspection result (boxplot)
    fig, ax = plt.subplots(figsize=(8, 6))
    sns.boxplot(
        data=d2, x="inspection_result", y="defect_rate_raw",
        hue="inspection_result", legend=False,
        order=["Pass", "Fail", "Pending"], hue_order=["Pass", "Fail", "Pending"],
        ax=ax,
        palette={"Pass": "#22c55e", "Fail": "#ef4444", "Pending": "#f59e0b"},
    )
    ax.set_title("Defect Rate by Inspection Result (Kruskal-Wallis)", fontsize=13)
    ax.set_xlabel("Inspection Result")
    ax.set_ylabel("Defect Rate (raw)")
    path = CHARTS / "defect_rate_by_inspection.png"
    fig.tight_layout()
    fig.savefig(path, dpi=160)
    plt.close(fig)
    created.append(path.name)

    # 6. Stock levels vs products sold scatter
    fig, ax = plt.subplots(figsize=(9, 6))
    sns.scatterplot(
        data=d2, x="stock_levels", y="products_sold",
        hue="product_type", ax=ax, s=80, alpha=0.8,
    )
    ax.set_title("Stock Levels vs Products Sold (Spearman)", fontsize=13)
    ax.set_xlabel("Stock Levels")
    ax.set_ylabel("Products Sold")
    path = CHARTS / "stock_vs_sold_scatter.png"
    fig.tight_layout()
    fig.savefig(path, dpi=160)
    plt.close(fig)
    created.append(path.name)

    return created


def main() -> None:
    print("=" * 60)
    print("SupplyChainIQ Statistical Analysis")
    print("=" * 60)

    # Load data
    print("\n[1/5] Loading processed data...")
    d1, d2 = load_data()
    print(f"  Dataset 1: {d1.shape[0]:,} rows × {d1.shape[1]} cols")
    print(f"  Dataset 2: {d2.shape[0]:,} rows × {d2.shape[1]} cols")

    # Run tests
    print("\n[2/5] Running statistical tests...")
    results = {}

    h1 = test_profit_margin_vs_late(d1)
    results["hypothesis_1_profit_margin_vs_late"] = h1
    sig1 = "SIGNIFICANT" if h1["significant_at_005"] else "NOT significant"
    print(f"  H1 (Welch t-test): p = {h1['p_value']} → {sig1}")
    print(f"      On-time mean: {h1['on_time_mean']}%  |  Late mean: {h1['late_mean']}%")

    h2 = test_shipping_mode_vs_late(d1)
    results["hypothesis_2_shipping_mode_vs_late"] = h2
    sig2 = "SIGNIFICANT" if h2["significant_at_005"] else "NOT significant"
    print(f"  H2 (Chi-square + Cramer's V): p = {h2['p_value']:.2e}, V = {h2['cramers_v']} → {sig2} ({h2['effect_size_interpretation']} effect)")

    h3 = test_defect_rate_vs_inspection(d2)
    results["hypothesis_3_defect_vs_inspection"] = h3
    sig3 = "SIGNIFICANT" if h3["significant_at_005"] else "NOT significant"
    print(f"  H3 (Kruskal-Wallis): p = {h3['p_value']} → {sig3}")
    for group, st in h3["group_stats"].items():
        print(f"      {group}: n={st['n']}, mean={st['mean']}, median={st['median']}")

    # Correlations
    print("\n[3/5] Computing correlations...")
    corr_results, d1_corr, d2_corr = compute_correlations(d1, d2)
    results["correlations"] = corr_results
    print("  Dataset 1 (Pearson):")
    for k, v in corr_results["dataset1_highlights"].items():
        print(f"    {k}: {v}")
    print("  Dataset 2 (Spearman):")
    for k, v in corr_results["dataset2_highlights"].items():
        if "spearman" in k:
            print(f"    {k}: {v}")

    # Charts
    print("\n[4/5] Generating charts...")
    chart_files = generate_charts(d1, d2, d1_corr, d2_corr)
    for f in chart_files:
        print(f"  ✓ {f}")

    # Save verified results
    print("\n[5/5] Saving verified results JSON...")
    results["_meta"] = {
        "script": "notebooks/run_statistical_analysis.py",
        "dataset1_rows": int(d1.shape[0]),
        "dataset2_rows": int(d2.shape[0]),
    }
    with RESULTS_JSON.open("w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False, default=str)
    print(f"  ✓ {RESULTS_JSON.relative_to(ROOT)}")

    print("\n" + "=" * 60)
    print("Analysis COMPLETE — All results verified by computation.")
    print("=" * 60)


if __name__ == "__main__":
    main()
