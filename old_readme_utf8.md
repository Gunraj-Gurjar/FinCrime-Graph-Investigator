# FinCrime Graph Investigator (CognoDB Assignment)

Welcome to the FinCrime Graph Investigator! This is a functional web application built on top of **CognoDB** (a managed graph database using openCypher/Neo4j) to detect and investigate financial fraud rings.

## ≡ƒÄ» The Use Case: Financial Fraud Detection

In financial fraud, bad actors frequently attempt to obfuscate their tracks through complex, multi-layered activities:
- **Money Muling / Layering:** Transferring funds across multiple accounts in a circular or deep chain to hide the original source (A ΓåÆ B ΓåÆ C ΓåÆ D ΓåÆ A).
- **Identity Synthesis & Device Sharing:** Multiple fraudulent accounts operating from the same Device ID or IP Address.

### Why a Graph Database?
If we attempted to build this using a **Relational Database (SQL)**, answering questions like *"Find a cycle of money transfers spanning up to 5 accounts"* or *"Find all unflagged users who share an IP address with a flagged user"* would require incredibly complex, recursive, and slow `JOIN`s. 

A **Graph Database** treats these relationships as first-class citizens. By modeling our data as a graph, we can execute variable-length path queries and find deep, hidden connections in milliseconds using a few lines of Cypher.

---

## ≡ƒÅù∩╕Å Data Model

Below is a simple diagram of the graph schema:

\`\`\`mermaid
erDiagram
    PERSON ||--o{ ACCOUNT : "OWNS"
    PERSON ||--o{ DEVICE : "USES"
    PERSON ||--o{ IP : "CONNECTS_FROM"
    ACCOUNT ||--o{ ACCOUNT : "TRANSFERRED_TO {amount, date, transactionId}"

    PERSON {
        string id
        string name
        int riskScore
        boolean isFlagged
    }
    ACCOUNT {
        string id
        string accountType
        float balance
    }
    DEVICE {
        string id
        string type
    }
    IP {
        string ip
    }
\`\`\`

---

## ≡ƒÜÇ Setup & Run Instructions

### 1. Create a CognoDB Instance
1. Go to [console.cognodb.com/signup](https://console.cognodb.com/signup) and create a free account.
2. From the console, create a free **(c0)** instance. It provisions in under a minute.
3. Save your connection URI (e.g., \`bolt+s://<id>.databases.cognodb.cloud\`) and the generated password for the \`cognodb\` user.

### 2. Configure the Application
Clone this repository and install dependencies:
\`\`\`bash
npm install
\`\`\`

Create a \`.env.local\` file in the root directory and add your CognoDB credentials:
\`\`\`env
NEO4J_URI=bolt+s://<instance-id>.databases.cognodb.cloud
NEO4J_USERNAME=cognodb
NEO4J_PASSWORD=<your-password>
\`\`\`

### 3. Seed the Database
We have included a seed script that generates realistic, interconnected fraud data (including injecting a circular money mule ring) using Faker.js.
\`\`\`bash
node scripts/seed.mjs
\`\`\`
*(Note: Ensure you are using Node 18+)*

### 4. Run the Web Application
Start the Next.js development server:
\`\`\`bash
npm run dev
\`\`\`
Open [http://localhost:3000](http://localhost:3000) in your browser. The application features an interactive 2D force-directed graph to explore the connections visually.

---

## ≡ƒöì Main Cypher Queries Explained

All queries are parameterized and executed via the official \`neo4j-driver\` in \`src/app/api/graph/route.ts\`.

### 1. The Money Mule Ring (Multi-Hop Cycle)
**Goal:** Detect circular money transfers (A ΓåÆ B ΓåÆ C ΓåÆ A).
\`\`\`cypher
MATCH path = (a:Account)-[r1:TRANSFERRED_TO]->(b:Account)-[r2:TRANSFERRED_TO]->(c:Account)-[r3:TRANSFERRED_TO]->(a)
RETURN nodes(path) as nodes, relationships(path) as rels
LIMIT 10
\`\`\`
*Why Graph?* Finding cycles in a standard SQL database is notoriously difficult and computationally expensive. In Cypher, it is literally drawing a circle in ASCII art.

### 2. Shared Device Risk (2-Hop Traversal)
**Goal:** Find unflagged "clean" users who have logged in using the same device as a known flagged fraudster.
\`\`\`cypher
MATCH (bad:Person {isFlagged: true})-[:USES]->(d:Device)<-[:USES]-(suspect:Person {isFlagged: false})
RETURN bad, d, suspect
\`\`\`
*Why Graph?* This traverses \`Person -> Device <- Person\` effortlessly, instantly identifying suspect accounts for manual review.

### 3. Entity Blast Radius (Variable-Length Path)
**Goal:** When investigating a specific person, load their entire localized network (accounts, shared devices, shared IPs) up to 2 hops away.
\`\`\`cypher
MATCH path = (p:Person {id: $personId})-[*1..2]-(m)
RETURN nodes(path) as nodes, relationships(path) as rels
\`\`\`

---

## ≡ƒÄ¿ UI/UX Highlights
- **Interactive Force Graph:** Built with \`react-force-graph-2d\` allowing zooming, panning, and dragging of nodes.
- **Color Coded Entities:** Easily distinguish between Flagged Persons (Red), Clean Persons (Blue), Devices (Amber), and Accounts (Green).
- **Inspector Panel:** Clicking on a node opens a detailed sidebar panel showing all properties and quick-actions (e.g., "Load 2-Hop Network").

---

## ≡ƒô╕ Media Gallery & Live Demo

### Live Simulation Video (Real-Time Temporal Engine)
![FinCrime Demo Recording](C:/Users/lenovo/.gemini/antigravity-ide/brain/ebc8ab8c-3b4d-4c49-bb17-7ff40afdbbe5/fincrime_demo_1786461550234.webp)

### Network Overview
![Initial Dashboard](C:/Users/lenovo/.gemini/antigravity-ide/brain/ebc8ab8c-3b4d-4c49-bb17-7ff40afdbbe5/initial_dashboard_1786461653515.png)

### Circular Money Mule Rings (Temporal Detection)
![Circular Mule Rings](C:/Users/lenovo/.gemini/antigravity-ide/brain/ebc8ab8c-3b4d-4c49-bb17-7ff40afdbbe5/circular_mule_rings_active_1786461727739.png)

### Shared Device Risk
![Shared Device Risk](C:/Users/lenovo/.gemini/antigravity-ide/brain/ebc8ab8c-3b4d-4c49-bb17-7ff40afdbbe5/shared_device_risk_active_1786461745999.png)

### Live Demo URL
**[Add your Vercel URL here after deployment]**
