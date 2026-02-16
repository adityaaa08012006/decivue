# Structured Decision Entry Guide

## Overview

This guide explains how to create decisions using structured dropdown parameters to enable high-accuracy conflict detection (78-96% confidence).

## Decision Categories

When creating a decision, select one of these categories from the dropdown:

1. **Budget & Financial** - Budget allocations, spending decisions, financial approvals
2. **Resource Allocation** - Personnel, equipment, space, or resource decisions
3. **Timeline & Milestones** - Schedule changes, deadline decisions, milestone planning
4. **Strategic Initiative** - High-level strategic choices affecting business direction
5. **Technical Architecture** - Technology choices, system design decisions
6. **Other** - Decisions that don't fit the above categories

---

## Category-Specific Parameters

### 1. Budget & Financial

**When to use:** Budget allocations, spending approvals, financial planning decisions

**Required Dropdowns:**

| Field             | Dropdown Options                                                                                                                    | Description               |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| **Direction**     | Increase, Decrease, Approve, Reject, Maintain                                                                                       | What action on the budget |
| **Resource Type** | Marketing Budget, Engineering Budget, Operations Budget, Sales Budget, R&D Budget, HR Budget, Infrastructure Budget, General Budget | Which budget category     |
| **Timeframe**     | Q1 2026, Q2 2026, Q3 2026, Q4 2026, H1 2026, H2 2026, 2026, 2027                                                                    | When this applies         |

**Optional Fields:**

- **Amount** (text input): Specific dollar amount (e.g., "500000", "$2M")
- **Allocation** (text input): Specific allocation details

**Example Decision:**

```
Title: Increase Marketing Budget for Q3
Category: Budget & Financial
Parameters:
  - direction: "Increase"
  - resourceType: "Marketing Budget"
  - timeframe: "Q3 2026"
  - amount: "200000"
```

**Conflicts This Detects:**

- ✅ Opposite directions (Increase vs Decrease) - 95% confidence
- ✅ Different amounts for same timeframe - 92% confidence
- ✅ Same resource with conflicting allocations - 88% confidence

---

### 2. Resource Allocation

**When to use:** Hiring decisions, resource assignments, equipment allocation

**Required Dropdowns:**

| Field             | Dropdown Options                                                                                  | Description         |
| ----------------- | ------------------------------------------------------------------------------------------------- | ------------------- |
| **Action**        | Allocate, Deallocate, Hire, Layoff, Add, Remove, Increase, Decrease                               | What action to take |
| **Resource Type** | Personnel, Budget, Equipment, Office Space, Software Licenses, Computing Resources, Time/Capacity | Type of resource    |
| **Timeframe**     | Q1 2026, Q2 2026, Q3 2026, Q4 2026, H1 2026, H2 2026, 2026, 2027                                  | When this applies   |

**Optional Fields:**

- **Quantity** (text input): How many resources (e.g., "5", "10 licenses")

**Example Decision:**

```
Title: Hire 5 Software Engineers
Category: Resource Allocation
Parameters:
  - action: "Hire"
  - resourceType: "Personnel"
  - timeframe: "Q2 2026"
  - quantity: "5"
```

**Conflicts This Detects:**

- ✅ Contradictory actions (Hire vs Layoff) - 94% confidence
- ✅ Same resource + same timeframe competition - 82% confidence

---

### 3. Timeline & Milestones

**When to use:** Schedule changes, deadline decisions, project timeline planning

**Required Dropdowns:**

| Field              | Dropdown Options                                                                                                             | Description          |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| **Milestone Type** | Product Launch, Feature Release, Beta Release, MVP Completion, Phase Completion, Project Kickoff, Go-Live, Review Checkpoint | Type of milestone    |
| **Expectation**    | Accelerate, Delay, On Track, At Risk, Meet Deadline, Miss Deadline                                                           | Timeline expectation |
| **Timeframe**      | Q1 2026, Q2 2026, Q3 2026, Q4 2026, H1 2026, H2 2026, 2026, 2027                                                             | Target timeframe     |

**Optional Fields:**

- **Milestone** (text input): Specific milestone name
- **Target Date** (text input): Specific target date (e.g., "2026-09-15")

**Example Decision:**

```
Title: Accelerate Product Launch
Category: Timeline & Milestones
Parameters:
  - milestoneType: "Product Launch"
  - expectation: "Accelerate"
  - timeframe: "Q3 2026"
  - targetDate: "2026-07-15"
```

**Conflicts This Detects:**

- ✅ Same milestone with different target dates - 90% confidence
- ✅ Incompatible expectations (Accelerate vs Delay) - 93% confidence

---

### 4. Strategic Initiative

**When to use:** High-level strategic decisions affecting business direction, growth, or operations

**Required Dropdowns:**

| Field              | Dropdown Options                                                                                                                                                            | Description            |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| **Direction**      | Increase, Decrease, Improve, Reduce, Expand, Contract, Grow, Shrink, Accelerate, Slow Down                                                                                  | Strategic direction    |
| **Impact Area**    | Revenue, Cost, Timeline, Quality, Compliance, Customer Experience, Team Capacity, Market Share, Brand Reputation, Innovation, Operational Efficiency, Employee Satisfaction | What area is impacted  |
| **Priority Level** | Critical, High, Medium, Low                                                                                                                                                 | Priority of initiative |

**Example Decision:**

```
Title: Improve Product Quality Standards
Category: Strategic Initiative
Parameters:
  - direction: "Improve"
  - impactArea: "Quality"
  - priority: "High"
```

**Conflicts This Detects:**

- ✅ Opposite directions on same impact area (Improve vs Reduce Quality) - 96% confidence
- ✅ Different priorities on same impact area - 78% confidence

---

### 5. Technical Architecture

**When to use:** Technology choices, system design decisions, infrastructure planning

**Required Dropdowns:**

| Field          | Dropdown Options                                                                                                           | Description            |
| -------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| **Component**  | Frontend, Backend, Database, API Gateway, Authentication, Caching Layer, Message Queue, Load Balancer, CDN, Analytics      | System component       |
| **Technology** | React, Vue, Angular, Node.js, Python, Java, PostgreSQL, MongoDB, MySQL, Redis, AWS, Azure, GCP                             | Specific technology    |
| **Approach**   | Monolith, Microservices, Serverless, Event-Driven, Centralized, Distributed, SQL, NoSQL, Hybrid, Synchronous, Asynchronous | Architectural approach |

**Example Decision:**

```
Title: Adopt Microservices Architecture
Category: Technical Architecture
Parameters:
  - component: "Backend"
  - technology: "Node.js"
  - approach: "Microservices"
```

**Conflicts This Detects:**

- ✅ Different technologies for same component - 91% confidence
- ✅ Conflicting architectural approaches (Monolith vs Microservices) - 89% confidence

---

## Best Practices

### 1. Always Use Dropdowns When Possible

- **High Confidence:** Structured parameters give 78-96% confidence scores
- **Low False Positives:** Explicit dropdowns reduce ambiguity
- **Better Explanations:** System can reference specific parameter conflicts

### 2. Be Consistent with Terminology

- Use the same dropdown selections for related decisions
- This ensures the system can properly detect relationships

### 3. Fill All Relevant Parameters

- More parameters = better conflict detection
- Especially important:
  - **Timeframe** for budget and resource decisions
  - **Impact Area + Direction** for strategic initiatives
  - **Component** for technical decisions

### 4. Use Text Fields for Specifics

- Amount, quantity, dates, milestone names should go in text fields
- These provide context but aren't used for primary conflict detection

### 5. Category Selection

- Choose the most specific category that fits
- If unsure, use "Other" and rely on text-based detection (65-85% confidence)

---

## Conflict Detection Workflow

1. **Create Decision with Dropdowns**
   - Select category
   - Fill in dropdown parameters
   - Add title and description

2. **System Detects Conflicts**
   - Navigate to "Decision Conflicts" page
   - Click "Detect Conflicts" button
   - System compares all decisions

3. **Review High-Confidence Conflicts**
   - Structured conflicts appear first (78-96% confidence)
   - Text-based conflicts appear next (65-85% confidence)
   - Review explanations

4. **Resolve Conflicts**
   - Choose resolution action
   - Add notes
   - Submit

---

## API Access to Parameter Templates

### Frontend: Get Dropdown Options

```javascript
// Get all templates
const response = await api.get('/api/parameter-templates');
const { templates, grouped } = response.data;

// Get templates for specific category
const response = await api.get('/api/parameter-templates?category=budget_direction');

// Grouped structure:
{
  "budget_direction": [
    { "id": "uuid", "name": "Increase", "order": 1 },
    { "id": "uuid", "name": "Decrease", "order": 2 }
  ]
}
```

### Backend: Query Templates

```sql
-- Get all decision-related templates
SELECT * FROM parameter_templates
WHERE category IN ('decision_category', 'budget_direction', 'resource_action')
ORDER BY category, display_order;

-- Get specific category
SELECT * FROM parameter_templates
WHERE category = 'budget_direction'
  AND is_active = true
ORDER BY display_order;
```

---

## Migration Instructions

### Apply Decision Category Templates

Run this migration to add all decision dropdown templates:

```bash
# In Supabase SQL Editor, run:
backend/migrations/020_add_decision_category_templates.sql
```

This creates dropdown options for:

- 6 decision categories
- 5 budget directions
- 8 budget resource types
- 8 resource actions
- 7 resource types
- 6 timeline expectations
- 8 milestone types
- 10 strategic directions
- 13 technology choices
- 11 architectural approaches
- 10 system components

**Total: 92 dropdown parameter templates**

---

## Example Complete Decisions

### Budget Conflict Example

**Decision A:**

```yaml
Title: Increase Marketing Budget for Q3
Category: Budget & Financial
Description: Allocate additional funds to marketing initiatives
Parameters:
  direction: Increase
  resourceType: Marketing Budget
  timeframe: Q3 2026
  amount: "200000"
```

**Decision B:**

```yaml
Title: Decrease Marketing Spending for Q3
Category: Budget & Financial
Description: Cut marketing expenses to improve profit margins
Parameters:
  direction: Decrease
  resourceType: Marketing Budget
  timeframe: Q3 2026
  amount: "150000"
```

**Detected Conflict:**

- Type: CONTRADICTORY
- Confidence: 95%
- Explanation: "Direct budget conflict: Decision A aims to Increase while Decision B aims to Decrease in the same budget area. These decisions are contradictory."

---

### Resource Conflict Example

**Decision A:**

```yaml
Title: Hire 5 Software Engineers
Category: Resource Allocation
Description: Expand engineering team to accelerate product development
Parameters:
  action: Hire
  resourceType: Personnel
  timeframe: Q2 2026
  quantity: "5"
```

**Decision B:**

```yaml
Title: Engineering Hiring Freeze
Category: Resource Allocation
Description: Pause all engineering hires to control costs
Parameters:
  action: Layoff
  resourceType: Personnel
  timeframe: Q2 2026
  quantity: "0"
```

**Detected Conflict:**

- Type: RESOURCE_COMPETITION
- Confidence: 94%
- Explanation: "Contradictory resource actions on Personnel in Q2 2026: Decision A plans to Hire while Decision B plans to Layoff."

---

## Summary

| Category                  | Confidence Range | Key Parameters                        |
| ------------------------- | ---------------- | ------------------------------------- |
| Budget & Financial        | 88-95%           | direction, resourceType, timeframe    |
| Resource Allocation       | 82-94%           | action, resourceType, timeframe       |
| Timeline & Milestones     | 90-93%           | milestoneType, expectation, timeframe |
| Strategic Initiative      | 78-96%           | direction, impactArea, priority       |
| Technical Architecture    | 89-91%           | component, technology, approach       |
| Text-based (no dropdowns) | 65-85%           | title, description analysis           |

**Recommendation:** Always use dropdowns when possible to achieve 78-96% conflict detection confidence!
