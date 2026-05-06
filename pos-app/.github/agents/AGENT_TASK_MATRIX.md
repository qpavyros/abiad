# POS Agent Task Matrix

This matrix assigns each task ID from task.md to exactly one implementation agent.

## Meta Agents

| Agent | Primary Responsibility |
|---|---|
| POS Plan Strategist | Build execution plans from implementation_plan.md |
| POS Task Tracker | Maintain status in task.md |

## Implementation Ownership

| Task ID | Agent |
|---|---|
| 1.1 | POS Inventory and Catalog Engineer |
| 1.2 | POS Inventory and Catalog Engineer |
| 1.3 | POS Inventory and Catalog Engineer |
| 2.4 | POS Payments and Refunds Engineer |
| 2.5 | POS Payments and Refunds Engineer |
| 2.6 | POS Payments and Refunds Engineer |
| 3.7 | POS Analytics and Reporting Engineer |
| 3.8 | POS Inventory and Catalog Engineer |
| 3.9 | POS Analytics and Reporting Engineer |
| 4.10 | POS Customer and Loyalty Engineer |
| 4.11 | POS Customer and Loyalty Engineer |
| 5.12 | POS Operations and Backup Engineer |
| 5.13 | POS Operations and Backup Engineer |
| 5.14 | POS Operations and Backup Engineer |
| 6.15 | POS Localization and Accessibility Engineer |
| 6.16 | POS Localization and Accessibility Engineer |
| 6.17 | POS Localization and Accessibility Engineer |
| 6.18 | POS Localization and Accessibility Engineer |
| 7.19 | POS System Hardening Engineer |
| 7.20 | POS System Hardening Engineer |

## Suggested Workflow

1. Use POS Plan Strategist to choose a small set of IDs.
2. Invoke the owning implementation agent for those IDs.
3. Validate changes.
4. Use POS Task Tracker to mark IDs complete in task.md.
