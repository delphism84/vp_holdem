/**
 * zenith_holdem DB — append-only 로그 컬렉션
 */
export const COLLECTIONS = {
  roundHistory: 'roundHistory',
  betHistory: 'betHistory',
  transaction: 'transaction',
};

export function createMongoLogger({ getDb, tableId }) {
  async function logRound(doc) {
    try {
      const db = await getDb();
      const payload = {
        time: new Date(),
        tableId,
        ...doc,
      };
      await db.collection(COLLECTIONS.roundHistory).insertOne(payload);
    } catch (e) {
      console.error('[holdem] roundHistory insert:', e.message);
    }
  }

  async function logBet(doc) {
    try {
      const db = await getDb();
      const payload = {
        time: new Date(),
        tableId,
        ...doc,
      };
      await db.collection(COLLECTIONS.betHistory).insertOne(payload);
    } catch (e) {
      console.error('[holdem] betHistory insert:', e.message);
    }
  }

  async function logTransaction(doc) {
    try {
      const db = await getDb();
      const payload = {
        time: new Date(),
        tableId,
        ...doc,
      };
      await db.collection(COLLECTIONS.transaction).insertOne(payload);
    } catch (e) {
      console.error('[holdem] transaction insert:', e.message);
    }
  }

  return { logRound, logBet, logTransaction };
}
