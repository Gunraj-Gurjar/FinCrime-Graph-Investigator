import neo4j from 'neo4j-driver';
import { faker } from '@faker-js/faker';
import 'dotenv/config'; // requires dotenv to be installed

const uri = process.env.NEO4J_URI;
const username = process.env.NEO4J_USERNAME || 'cognodb';
const password = process.env.NEO4J_PASSWORD;

if (!uri || !password) {
  console.error('Missing NEO4J_URI or NEO4J_PASSWORD in .env');
  process.exit(1);
}

const driver = neo4j.driver(uri, neo4j.auth.basic(username, password), {
  disableLosslessIntegers: true
});

const NUM_PERSONS = 50;
const NUM_ACCOUNTS = 75;
const NUM_DEVICES = 30;
const NUM_IPS = 40;

async function seed() {
  const session = driver.session();
  try {
    console.log('Clearing existing database...');
    await session.run('MATCH (n) DETACH DELETE n');

    console.log('Creating constraints...');
    const constraints = [
      'CREATE CONSTRAINT IF NOT EXISTS FOR (p:Person) REQUIRE p.id IS UNIQUE',
      'CREATE CONSTRAINT IF NOT EXISTS FOR (a:Account) REQUIRE a.id IS UNIQUE',
      'CREATE CONSTRAINT IF NOT EXISTS FOR (d:Device) REQUIRE d.id IS UNIQUE',
      'CREATE CONSTRAINT IF NOT EXISTS FOR (i:IP) REQUIRE i.ip IS UNIQUE',
      'CREATE INDEX IF NOT EXISTS FOR (p:Person) ON (p.name)',
      'CREATE INDEX IF NOT EXISTS FOR (a:Account) ON (a.isFlagged)'
    ];
    for (const c of constraints) {
      try {
        await session.run(c);
      } catch (e) {
        console.log('Constraint already exists or not supported in this tier, skipping.', e.message);
      }
    }

    console.log('Generating Nodes...');
    const persons = Array.from({ length: NUM_PERSONS }).map(() => ({
      id: faker.string.uuid(),
      name: faker.person.fullName(),
      riskScore: faker.number.int({ min: 0, max: 100 }),
      isFlagged: Math.random() > 0.85
    }));

    const accounts = Array.from({ length: NUM_ACCOUNTS }).map(() => ({
      id: faker.finance.accountNumber(),
      accountType: faker.helpers.arrayElement(['Checking', 'Savings', 'Business']),
      balance: faker.number.float({ min: 10, max: 100000, fractionDigits: 2 })
    }));

    const devices = Array.from({ length: NUM_DEVICES }).map(() => ({
      id: faker.string.uuid(),
      type: faker.helpers.arrayElement(['Mobile', 'Desktop', 'Tablet'])
    }));

    const ips = Array.from({ length: NUM_IPS }).map(() => ({
      ip: faker.internet.ipv4()
    }));

    await session.run(
      'UNWIND $persons AS p CREATE (:Person {id: p.id, name: p.name, riskScore: p.riskScore, isFlagged: p.isFlagged})',
      { persons }
    );
    await session.run(
      'UNWIND $accounts AS a CREATE (:Account {id: a.id, accountType: a.accountType, balance: a.balance})',
      { accounts }
    );
    await session.run(
      'UNWIND $devices AS d CREATE (:Device {id: d.id, type: d.type})',
      { devices }
    );
    await session.run(
      'UNWIND $ips AS i CREATE (:IP {ip: i.ip})',
      { ips }
    );

    console.log('Generating Relationships...');
    // OWNS
    for (const acc of accounts) {
      const owner = faker.helpers.arrayElement(persons);
      await session.run(
        'MATCH (p:Person {id: $personId}), (a:Account {id: $accId}) CREATE (p)-[:OWNS]->(a)',
        { personId: owner.id, accId: acc.id }
      );
    }

    // USES and CONNECTS_FROM
    for (const person of persons) {
      const numDevices = faker.number.int({ min: 1, max: 3 });
      const usedDevices = faker.helpers.arrayElements(devices, numDevices);
      for (const d of usedDevices) {
        await session.run(
          'MATCH (p:Person {id: $personId}), (d:Device {id: $devId}) MERGE (p)-[:USES]->(d)',
          { personId: person.id, devId: d.id }
        );
      }

      const numIps = faker.number.int({ min: 1, max: 4 });
      const usedIps = faker.helpers.arrayElements(ips, numIps);
      for (const i of usedIps) {
        await session.run(
          'MATCH (p:Person {id: $personId}), (i:IP {ip: $ip}) MERGE (p)-[:CONNECTS_FROM]->(i)',
          { personId: person.id, ip: i.ip }
        );
      }
    }

    // TRANSFERRED_TO (random transfers)
    for (let i = 0; i < 150; i++) {
      const from = faker.helpers.arrayElement(accounts);
      let to = faker.helpers.arrayElement(accounts);
      while (to.id === from.id) to = faker.helpers.arrayElement(accounts); // Avoid self-transfer

      await session.run(
        `MATCH (from:Account {id: $fromId}), (to:Account {id: $toId}) 
         CREATE (from)-[:TRANSFERRED_TO {
            amount: $amount, 
            date: $date, 
            transactionId: $txId
         }]->(to)`,
        {
          fromId: from.id,
          toId: to.id,
          amount: faker.number.float({ min: 10, max: 5000, fractionDigits: 2 }),
          date: faker.date.recent({ days: 30 }).toISOString(),
          txId: faker.string.uuid()
        }
      );
    }

    // INJECT A FRAUD RING (Circular Transfers + Shared Device)
    console.log('Injecting Fraud Ring...');
    const fraudPersons = persons.filter(p => p.isFlagged).slice(0, 3);
    if (fraudPersons.length >= 3) {
      const sharedDevice = devices[0];
      const p1 = fraudPersons[0];
      const p2 = fraudPersons[1];
      const p3 = fraudPersons[2];

      // Make them share a device
      for (const p of [p1, p2, p3]) {
        await session.run(
          'MATCH (p:Person {id: $pid}), (d:Device {id: $did}) MERGE (p)-[:USES]->(d)',
          { pid: p.id, did: sharedDevice.id }
        );
      }

      // Find their accounts
      const p1Accounts = await session.run('MATCH (p:Person {id: $pid})-[:OWNS]->(a:Account) RETURN a.id LIMIT 1', { pid: p1.id });
      const p2Accounts = await session.run('MATCH (p:Person {id: $pid})-[:OWNS]->(a:Account) RETURN a.id LIMIT 1', { pid: p2.id });
      const p3Accounts = await session.run('MATCH (p:Person {id: $pid})-[:OWNS]->(a:Account) RETURN a.id LIMIT 1', { pid: p3.id });

      if (p1Accounts.records.length > 0 && p2Accounts.records.length > 0 && p3Accounts.records.length > 0) {
        const a1 = p1Accounts.records[0].get('a.id');
        const a2 = p2Accounts.records[0].get('a.id');
        const a3 = p3Accounts.records[0].get('a.id');

        // Circular transfers A1 -> A2 -> A3 -> A1
        const transferQuery = `
          MATCH (from:Account {id: $fromId}), (to:Account {id: $toId}) 
          CREATE (from)-[:TRANSFERRED_TO {amount: $amount, date: $date, transactionId: $txId, isFraudRing: true}]->(to)
        `;
        
        await session.run(transferQuery, { fromId: a1, toId: a2, amount: 9999.99, date: new Date().toISOString(), txId: faker.string.uuid() });
        await session.run(transferQuery, { fromId: a2, toId: a3, amount: 9999.99, date: new Date().toISOString(), txId: faker.string.uuid() });
        await session.run(transferQuery, { fromId: a3, toId: a1, amount: 9999.99, date: new Date().toISOString(), txId: faker.string.uuid() });
        console.log(`Injected circular fraud ring between accounts: ${a1} -> ${a2} -> ${a3} -> ${a1}`);
      }
    }


    console.log('Seed completed successfully!');
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await session.close();
    await driver.close();
  }
}

seed();
