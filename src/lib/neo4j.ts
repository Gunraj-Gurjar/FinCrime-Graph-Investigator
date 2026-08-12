import neo4j, { Driver } from 'neo4j-driver';

let driver: Driver;

export function getDriver(): Driver {
  if (!driver) {
    const uri = process.env.NEO4J_URI;
    const username = process.env.NEO4J_USERNAME || 'cognodb';
    const password = process.env.NEO4J_PASSWORD;

    if (!uri || !password) {
      throw new Error('Please define NEO4J_URI and NEO4J_PASSWORD in your .env.local file');
    }

    driver = neo4j.driver(uri, neo4j.auth.basic(username, password), {
      disableLosslessIntegers: true, // For easier handling of numbers in JS
    });
  }
  return driver;
}

export async function closeDriver() {
  if (driver) {
    await driver.close();
  }
}
