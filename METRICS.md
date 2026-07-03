# OTC Crypto Dashboard — Metrics & Formula Reference

All formulas are derived from `lib/data-utils.ts` and `components/volume-summary.tsx`.

---

## Table of Contents

1. [Transaction-level Fields](#1-transaction-level-fields)
2. [Volume Summary Metrics](#2-volume-summary-metrics)
3. [Profit Summary Metrics](#3-profit-summary-metrics)
4. [Daily Aggregate Metrics](#4-daily-aggregate-metrics)
5. [Sidebar & Period Metrics](#5-sidebar--period-metrics)
6. [Insights Panel Metrics](#6-insights-panel-metrics)
7. [Data Quality Rules](#7-data-quality-rules)

---

## 1. Transaction-level Fields

These are the raw columns read from the CSV / Google Sheet (indices 0–9).

| Column Index | Field           | Type     | Notes                                          |
|:---:|:---|:---:|:---|
| 0  | `date`          | `string` | ISO format `YYYY-MM-DD`                        |
| 1  | `name`          | `string` | Counterparty name (e.g. `MNC`)                 |
| 2  | `order`         | `string` | Order type (e.g. `Sell`)                       |
| 3  | `rate`          | `number` | Exchange rate in IDR per 1 USDT                |
| 4  | `usdt`          | `number` | USDT amount sold                               |
| 5  | `idr`           | `number` | Gross IDR = `rate × usdt`                      |
| 6  | `settlement`    | `number` | Actual IDR received after deductions           |
| 7  | `profit`        | `number` | Net profit = `idr − settlement`                |
| 8  | `nonExpected`   | `number` | Out-of-flow cost (IDR)                         |
| 9  | `remark`        | `string` | Free-text notes                                |

---

## 2. Volume Summary Metrics

### Total USDT Sold

$$
\text{Total USDT Sold} = \sum_{i=1}^{n} \text{usdt}_i
$$

> Summed across all transactions in the loaded dataset.

---

### Total IDR Received

$$
\text{Total IDR Received} = \sum_{i=1}^{n} \text{settlement}_i
$$

> The actual IDR received after all fees and deductions. This is `totalSettlement` internally.

---

### Gross IDR

$$
\text{Gross IDR} = \sum_{i=1}^{n} \text{idr}_i
$$

> Pre-deduction IDR value. Shown as a sub-value under "Total IDR Received".

---

### Avg Rate USDT/IDR (VWAP)

$$
\text{VWAP} = \frac{\displaystyle\sum_{i=1}^{n} \text{usdt}_i \times \text{rate}_i}{\displaystyle\sum_{i=1}^{n} \text{usdt}_i}
$$

> Volume-Weighted Average Price. Larger trades carry more weight than smaller ones.  
> Falls back to `0` if total USDT is zero.

---

### Total Orders

$$
\text{Total Orders} = n
$$

> Simple count of transaction rows.

---

## 3. Profit Summary Metrics

### Total Net Profit

$$
\text{Total Net Profit} = \sum_{i=1}^{n} \text{profit}_i
$$

> Sourced directly from the `profit` column in the sheet (not recalculated).

---

### Non-Expected Costs

$$
\text{Non-Expected Costs} = \sum_{i=1}^{n} \text{nonExpected}_i
$$

> Sum of all out-of-flow deductions. Displayed as `—` when zero.

---

### Trading Days

$$
\text{Trading Days} = \bigl|\{\text{date}_i \mid i = 1 \ldots n\}\bigr|
$$

> Count of **unique** dates across all transactions.

---

### Avg Profit / Day

$$
\text{Avg Profit / Day} = \frac{\text{Total Net Profit}}{\text{Trading Days}}
$$

---

### Profit Margin (bps)

$$
\text{Profit Margin (bps)} = \frac{\text{Total Net Profit}}{\text{Gross IDR}} \times 10{,}000
$$

$$
\text{Profit Margin (\%)} = \frac{\text{Profit Margin (bps)}}{100}
$$

> Expressed in basis points internally; converted to `%` for display.

---

## 4. Daily Aggregate Metrics

Each trading day groups all transactions sharing the same `date`.

### Daily Simple Average Rate

$$
\text{Avg Rate}_\text{day} = \frac{\displaystyle\sum_{i \in \text{day}} \text{rate}_i}{\text{txCount}_\text{day}}
$$

> Arithmetic mean — each order is weighted equally regardless of size.

---

### Daily VWAP Rate

$$
\text{VWAP}_\text{day} = \frac{\displaystyle\sum_{i \in \text{day}} \text{usdt}_i \times \text{rate}_i}{\displaystyle\sum_{i \in \text{day}} \text{usdt}_i}
$$

> Falls back to `avgRate` if the day's total USDT is zero.

---

### All other daily fields

| Field              | Formula                                              |
|:---|:---|
| `usdt`             | $$\sum_{i \in \text{day}} \text{usdt}_i$$           |
| `idr`              | $$\sum_{i \in \text{day}} \text{idr}_i$$            |
| `settlement`       | $$\sum_{i \in \text{day}} \text{settlement}_i$$     |
| `profit`           | $$\sum_{i \in \text{day}} \text{profit}_i$$         |
| `nonExpected`      | $$\sum_{i \in \text{day}} \text{nonExpected}_i$$    |

---

## 5. Sidebar & Period Metrics

### Avg USDT / Day

$$
\text{Avg USDT / Day} = \frac{\text{Total USDT Sold}}{\text{Trading Days}}
$$

---

### Best Day / Lowest Day

Determined by sorting daily aggregates by `profit` descending:

$$
\text{Best Day} = \underset{\text{day}}{\arg\max}\;\text{profit}_\text{day}
$$

$$
\text{Lowest Day} = \underset{\text{day}}{\arg\min}\;\text{profit}_\text{day}
$$

---

## 6. Insights Panel Metrics

### Rate Trend

Compares the VWAP of the **first half** vs **second half** of the period (chronologically):

$$
\text{Rate Trend} = \text{VWAP}_\text{second half} - \text{VWAP}_\text{first half}
$$

> Positive → improving rate environment. Negative → declining.

---

### Settlement Slippage

$$
\text{Slippage (\%)} = \frac{\text{Gross IDR} - \text{Total IDR Received}}{\text{Gross IDR}} \times 100
$$

> Measures the percentage of gross value lost to fees and deductions.  
> Values below `0.3%` are considered minimal and within normal range.

---

### Non-Expected Impact

$$
\text{Non-Expected Impact (\%)} = \frac{\text{Non-Expected Costs}}{\text{Total Net Profit}} \times 100
$$

---

### Top-3 Day Concentration

$$
\text{Concentration (\%)} = \frac{\displaystyle\sum_{k=1}^{3} \text{profit}_{\text{day}_k}}{\text{Total Net Profit}} \times 100
$$

> Ranks days by profit descending; takes the top 3.

---

### Peak Volume Day

$$
\text{Peak Volume Day} = \underset{\text{day}}{\arg\max}\;\text{usdt}_\text{day}
$$

---

## 7. Data Quality Rules

These rules are applied automatically during CSV parsing.

| Issue                  | Detection                        | Fix Applied                              |
|:---|:---|:---|
| Year typo              | Year in date `< 2020`            | Add `+20` years (e.g. `2006` → `2026`)  |
| Name casing            | `name.toLowerCase() === 'mnc'`   | Normalized to `MNC`                      |
| IDR semicolon separator| Pattern `/(\d);(\d)/g` in remark | Replace `;` with `,` in remark field     |

---

*Last updated: July 2026*
