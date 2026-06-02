# B2B Sales & Solution Architect (Presales) Collaboration Framework

This document outlines the Key Performance Indicator (KPI) matrices, alignment bridge, and lifecycle workflows for the Sales and Solution Architect (Presales) teams on the Leadsy platform.

---

## 1. Sales KPI Matrix (Commercial Acquisition & Closing)

The Sales department is primarily accountable for volume, velocity, and conversion efficiency. For a B2B Leads Intelligence platform like **Leadsy**, these metrics ensure that the commercial pipeline is actively closing and generating recurring revenue.

| KPI Name | Definition | Target Metric / Formula | Strategic Relevance for Leadsy |
| :--- | :--- | :--- | :--- |
| **1. New Business Annual Recurring Revenue (ARR) Added** | Total new contract value signed on a yearly basis (excluding expansions/renewals). | $$\sum (\text{Annual Contract Value of New Logos Closed-Won})$$ | Direct measure of market acquisition. As a B2B SaaS platform, new ARR is the primary driver of valuation and growth. |
| **2. Win Rate (%)** | The percentage of Sales Qualified Opportunities (SQOs) that successfully convert to Closed-Won deals. | $$\left( \frac{\text{Closed-Won Deals}}{\text{Total Closed-Won} + \text{Closed-Lost Deals}} \right) \times 100$$ | Measures salesperson competency and qualification accuracy. A low win rate indicates wasted sales resources or poor initial targeting. |
| **3. Sales Cycle Length (Velocity)** | The average number of days it takes for a lead to transition from initial Discovery to Closed-Won. | $$\frac{\sum (\text{Closed Date} - \text{Discovery Date})}{\text{Total Closed-Won Deals}}$$ | Critical for identifying friction in the funnel. For Leadsy, high velocity prevents competitor lock-in and increases sales capacity. |
| **4. Pipeline Coverage Ratio** | The total value of active pipeline compared to the quarterly closing quota. | $$\frac{\text{Total Value of Opportunities in Stages 1–4}}{\text{Quarterly Quota}}$$ | Target: **3x to 4x coverage**. Ensures there is enough pipeline volume to hit the target even if historical win-rates fluctuate. |

---

## 2. Architect Solution / Presales KPI Matrix

The Solution Architect (SA) team focuses on engineering technical trust. For a B2B Leads Intelligence platform where data quality, integrations (e.g., CRM, Lark, Slack), and custom API endpoints are crucial, the SA team guarantees that what is sold can actually be delivered.

| KPI Name | Definition | Target Metric / Formula | Technical Trust & Validation Metric |
| :--- | :--- | :--- | :--- |
| **1. Technical Win Rate (%)** | The percentage of opportunities where the client signs off on technical feasibility/security. | $$\left( \frac{\text{Opportunities with Tech Sign-Off}}{\text{Total Opportunities Assigned to SA}} \right) \times 100$$ | **Tech Validation**: Isolates sales capability from technical validation. If this is high but win rate is low, the issue is pricing/negotiation, not product fit. |
| **2. Proof of Concept (POC) Success Rate** | The percentage of completed POCs that meet the customer's pre-defined success criteria. | $$\left( \frac{\text{POCs Meeting Success Criteria}}{\text{Total POCs Executed}} \right) \times 100$$ | **Technical Trust**: Proves Leadsy can successfully query, clean, and output leads matching the client's actual data environment. |
| **3. Integration & API Fit Score** | Accuracy rate of custom CRM/Lark integration scoping prior to contract signature. | $$\left( \frac{\text{Deals with 0 Post-Sale Integration Delays}}{\text{Total Closed-Won Custom Deals}} \right) \times 100$$ | **Engineering Integrity**: Ensures the SA correctly mapped the client's schema. Prevents post-sale churn caused by integration implementation bottlenecks. |
| **4. SLA Response Time for Technical Queries** | Average time taken to resolve client security, data compliance (GDPR/PDPA), or architecture queries. | $$\frac{\sum (\text{Resolution Time} - \text{Ticket Opened Time})}{\text{Total Tech Query Tickets}}$$ | Target: **< 4 Hours**. High responsiveness builds enterprise credibility and accelerates the sales cycle. |

---

## 3. The Alignment & Shared KPIs (The Bridge)

To eliminate the classic B2B SaaS conflict—where Sales promises custom features that the product cannot support, and Presales builds over-engineered architectures that are too expensive—we establish two Shared KPIs and an Incentive Bridge:

### **Shared KPI 1: Net Revenue Retention (NRR) in Year 1**
*   **Formula:** 
    $$\frac{(\text{ARR Sourced from Year 1 Clients} + \text{Expansion}) - \text{Churn}}{\text{Starting ARR from Year 1 Clients}} \times 100$$
*   **Why it works:** Both Sales and SAs are measured on client retention. If a client churns in Year 1 because the product did not fit their workflow, both departments lose their bonus. This forces AEs to sell to the right ICP and SAs to flag product gaps early.

### **Incentive Bridge: SA Variable Commission Sourced from Closed-Won Revenue**
*   **Strategy:** Instead of compensating SAs purely on "Technical Wins," their variable salary is tied directly to the **Closed-Won Revenue (ACV)** of the deals they supported.
*   **Outcome:** SAs do not just validate technology; they actively help the AE sell value, handle technical objections, and close deals.

---

## 4. Sales-Presales Lead Lifecycle Workflow

This table maps the exact hand-off process and division of responsibilities across the pipeline stages:

| Pipeline Stage | Responsible Department | Action Required | Exit Criteria to Next Stage |
| :--- | :--- | :--- | :--- |
| **1. Discovery** | **Sales** (Lead, SA consulted if Enterprise) | Identify commercial fit, budget, decision-makers, and primary pain points (ICP mapping). | **Commercial Qualification**: Confirmed budget, timeline, and client agreement to attend a dedicated Demo. |
| **2. Technical Evaluation / Demo** | **Architect Solution** (Lead), **Sales** (Support) | Run a customized platform demonstration highlighting Leadsy's API capability, database accuracy, and integration ease. | **Technical Fit Approved**: Client confirms the platform meets their functional requirements. No critical product gaps. |
| **3. Proof of Concept (POC)** | **Architect Solution** (Lead), **Sales** (Commercial mgmt) | 1. Define 3-5 clear, quantifiable success criteria (e.g., >95% email accuracy).<br>2. Upload sample client data and run intelligence enrichment. | **POC Sign-Off**: Client signs a "POC Success Form" confirming all pre-defined technical criteria were met. |
| **4. Commercial Negotiation** | **Sales** (Lead), **Architect Solution** (Scope of Work validation) | Draft custom proposals, finalize pricing tiers, handle procurement security reviews, and compile SLA terms. | **Closed-Won**: Signed master service agreement (MSA) and initial payment received. |
