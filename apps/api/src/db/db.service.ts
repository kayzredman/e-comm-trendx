import { Injectable, OnModuleDestroy } from '@nestjs/common'
import { getDb, reconnectDb, type Db } from '@trendmarga/db'

@Injectable()
export class DbService implements OnModuleDestroy {
  private db: Db

  constructor() {
    this.db = getDb()
  }

  get client(): Db {
    return this.db
  }

  /** Tear down the existing pool and reopen — used by Service Quality "reconnect" */
  async reconnect(): Promise<void> {
    await reconnectDb()
    this.db = getDb()
  }

  onModuleDestroy() {
    // postgres-js handles connection cleanup automatically
  }
}
