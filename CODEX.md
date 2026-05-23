# FOODSPV 2.0 — CODEX OPERATING SYSTEM

## PROJECT VISION

FoodSPV is a multi-tenant SaaS platform for restaurants, taco shops, dessert stores, and informal food businesses.

Main objective:

Reduce friction between customer and business.

Traditional flow:

Customer
→ asks questions
→ waits
→ sends incomplete order
→ business loses time

FoodSPV flow:

Customer
→ scans QR
→ opens tenant webapp
→ browses menu
→ adds products to cart
→ validates order
→ enters name + phone
→ generates structured order
→ order saved in Firestore
→ WhatsApp receives formatted order

No chat friction.

No manual order taking.

No repeated questions.

No chaos.

---

## CORE PRINCIPLES

1. Multi-tenant first
2. Mobile first
3. Modular architecture
4. Security by default
5. DRY code
6. Scalable architecture
7. Firestore = source of truth
8. WhatsApp = delivery channel only
9. Avoid patches
10. Complete files over code fragments

---

## CURRENT ARCHITECTURE

Current flow:

Customer WebApp
    ↓
Cart
    ↓
Order SDK
    ↓
Validator Agent
    ↓
Firestore Writer Agent
    ↓
WhatsApp Agent
    ↓
Business

Folder structure:

src/

modules/
    orders/
        agents/
        services/
        types/
        utils/

lib/

app/
    api/

---

## ACTIVE AGENTS

### Agent 01

Name:

Order Validator Agent

Responsibilities:

- validate tenantId
- validate customer
- validate products
- validate total
- reject malformed requests

Status:

COMPLETE

---

### Agent 02

Name:

Firestore Writer Agent

Responsibilities:

- persist order
- use serverTimestamp
- generate order id

Status:

COMPLETE

---

### Agent 03

Name:

WhatsApp Comanda Agent

Responsibilities:

- generate readable order
- emojis optional
- include:
    customer
    phone
    products
    totals

Status:

PENDING

---

### Agent 04

Name:

Tenant Router Agent

Responsibilities:

- route by tenant
- route by phone_number_id

Status:

PENDING

---

### Agent 05

Name:

Analytics Agent

Responsibilities:

- metrics
- top products
- orders/day
- sales

Status:

PENDING

---

## TASK SYSTEM

Each task must follow:

TASK-001
TASK-002
TASK-003

Format:

Description:
Dependencies:
Files:
Expected result:
Status:

---

TASK-001

Description:

Create Order Validator Agent

Status:

COMPLETE

---

TASK-002

Description:

Create Firestore Writer Agent

Status:

COMPLETE

---

TASK-003

Description:

Create WhatsApp Comanda Agent

Status:

PENDING

---

## MANDATORY REVIEW AFTER EACH TASK

After finishing every task:

1. Run build

npm run build

2. Verify imports

3. Verify aliases

4. Verify TypeScript

5. Verify no duplicate logic

6. Verify no hardcoded values

7. Verify architecture consistency

8. Document result

Review output:

PASSED
or

FAILED

with explanation

---

## NEVER DO

Do not:

- create duplicate files
- create parallel architectures
- create patches over patches
- hardcode secrets
- bypass validation
- mix legacy patterns

---

## FINAL OBJECTIVE

Build FoodSPV into a scalable SaaS platform capable of serving thousands of food businesses with minimal operational friction.
