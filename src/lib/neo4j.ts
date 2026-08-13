import neo4j, { Driver } from 'neo4j-driver';

let driver: Driver;

export function getDriver(): Driver {
  if (!driver) {
    const uri = process.env.NEO4J_URI;
    const username = process.env.NEO4J_USERNAME || 'cognodb';
    const password = process.env.NEO4J_PASSWORD;

    if (!uri || !password) {
      throw new Error('NEO4J_URI or NEO4J_PASSWORD missing in environment');
    }

    driver = neo4j.driver(uri, neo4j.auth.basic(username, password), {
      disableLosslessIntegers: true
    });
  }
  return driver;
}

export async function closeDriver() {
  if (driver) {
    await driver.close();
  }
}
