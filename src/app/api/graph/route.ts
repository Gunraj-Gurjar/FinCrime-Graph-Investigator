import { NextRequest, NextResponse } from 'next/server';
import { getDriver } from '@/lib/neo4j';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const type = searchParams.get('type') || 'overview';
  const personId = searchParams.get('personId');
  const query = searchParams.get('query');
  const highValue = searchParams.get('highValue') === 'true';

  let driver;
  try {
    driver = getDriver();
  } catch (e: any) {
    return NextResponse.json({ error: 'Database connection error', details: e.message }, { status: 500 });
  }

  const session = driver.session();
  try {
    let result;
    if (type === 'overview') {
      // Get a general sample of the graph (limit 150 nodes to not overwhelm UI)
      // Apply High Value filter if requested
      const relCondition = highValue ? 'WHERE r.amount > 1000' : '';
      result = await session.run(`
        MATCH (n)
        OPTIONAL MATCH (n)-[r]->(m)
        ${relCondition}
        RETURN n, r, m
        LIMIT 150
      `);
    } else if (type === 'fraudRing') {
      // Temporal Multi-hop query: Find circular money transfers that happened CHRONOLOGICALLY
      result = await session.run(`
        MATCH path = (a:Account)-[r1:TRANSFERRED_TO]->(b:Account)-[r2:TRANSFERRED_TO]->(c:Account)-[r3:TRANSFERRED_TO]->(a)
        WHERE r1.date < r2.date AND r2.date < r3.date
        RETURN nodes(path) as nodes, relationships(path) as rels
        LIMIT 10
      `);
    } else if (type === 'personNetwork' && personId) {
      // Multi-hop query: Find everything up to 2 hops away from a specific person
      result = await session.run(`
        MATCH path = (p:Person {id: $personId})-[*1..2]-(m)
        RETURN nodes(path) as nodes, relationships(path) as rels
      `, { personId });
    } else if (type === 'sharedDeviceRisk') {
      // Find unflagged users sharing a device with a flagged user
      result = await session.run(`
        MATCH path = (bad:Person {isFlagged: true})-[r1:USES]->(d:Device)<-[r2:USES]-(suspect:Person {isFlagged: false})
        RETURN nodes(path) as nodes, relationships(path) as rels
      `);
    } else if (type === 'search' && query) {
      // Search for person by name (case-insensitive) and return their immediate connections
      result = await session.run(`
        MATCH (p:Person)
        WHERE toLower(p.name) CONTAINS toLower($query)
        OPTIONAL MATCH path = (p)-[*1..1]-(m)
        RETURN nodes(path) as nodes, relationships(path) as rels, p
        LIMIT 50
      `, { query });
    } else {
      return NextResponse.json({ error: 'Invalid query type' }, { status: 400 });
    }

    // Transform Neo4j Result to simple JSON
    const nodes = new Map();
    const links = new Map();

    result.records.forEach(record => {
      // Depending on the query shape, extract nodes and rels
      const processNode = (node: any) => {
        if (!node) return;
        nodes.set(node.identity.toString(), {
          id: node.identity.toString(),
          labels: node.labels,
          properties: node.properties
        });
      };

      const processRel = (rel: any) => {
        if (!rel) return;
        const linkId = `${rel.start.toString()}-${rel.type}-${rel.end.toString()}`;
        links.set(linkId, {
          source: rel.start.toString(),
          target: rel.end.toString(),
          type: rel.type,
          properties: rel.properties
        });
      };

      record.keys.forEach(key => {
        const item = record.get(key);
        if (Array.isArray(item)) {
          // If it's nodes(path) or relationships(path)
          item.forEach(subItem => {
            if (subItem.labels) processNode(subItem); // It's a node
            if (subItem.type) processRel(subItem);    // It's a rel
          });
        } else if (item?.labels) {
          processNode(item);
        } else if (item?.type) {
          processRel(item);
        }
      });
    });

    return NextResponse.json({
      nodes: Array.from(nodes.values()),
      links: Array.from(links.values())
    });

  } catch (error: any) {
    console.error('Neo4j Query Error:', error);
    return NextResponse.json({ error: 'Database query failed', details: error.message }, { status: 500 });
  } finally {
    await session.close();
  }
}
