import { NextResponse } from 'next/server';
import { getDriver } from '@/lib/neo4j';

export async function POST() {
  let driver;
  try {
    driver = getDriver();
  } catch (e: any) {
    return NextResponse.json({ error: 'Database connection error', details: e.message }, { status: 500 });
  }

  const session = driver.session();
  try {
    // Generate a new unique fraud ring dynamically
    const ts = Date.now();
    const d1 = new Date(ts).toISOString();
    const d2 = new Date(ts + 3600000).toISOString(); // 1 hour later
    const d3 = new Date(ts + 7200000).toISOString(); // 2 hours later

    const result = await session.run(`
      // Create 3 new accounts
      CREATE (a:Account {id: 'sim_a_' + $ts, balance: 10000, isFlagged: false})
      CREATE (b:Account {id: 'sim_b_' + $ts, balance: 15000, isFlagged: false})
      CREATE (c:Account {id: 'sim_c_' + $ts, balance: 2000, isFlagged: false})
      
      // Create a new person
      CREATE (p:Person {id: 'sim_p_' + $ts, name: 'LIVE_SIM_' + $ts, isFlagged: true, riskScore: 99})
      
      // Person owns accounts
      CREATE (p)-[:OWNS]->(a)
      CREATE (p)-[:OWNS]->(b)
      
      // Create a temporal circular money mule ring (A -> B -> C -> A) with chronological dates
      CREATE (a)-[:TRANSFERRED_TO {amount: 5000, date: $d1, transactionId: 'tx1_' + $ts}]->(b)
      CREATE (b)-[:TRANSFERRED_TO {amount: 4950, date: $d2, transactionId: 'tx2_' + $ts}]->(c)
      CREATE (c)-[:TRANSFERRED_TO {amount: 4900, date: $d3, transactionId: 'tx3_' + $ts}]->(a)
      
      RETURN a, b, c, p
    `, { ts: ts.toString(), d1, d2, d3 });

    return NextResponse.json({ success: true, injected: result.records.length });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to simulate transaction', details: error.message }, { status: 500 });
  } finally {
    await session.close();
  }
}
