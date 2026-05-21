import { Injectable, OnModuleDestroy } from '@nestjs/common'
import { getDb, type Db } from '@trendmarga/db'

@Injectable()
export class DbService implements OnModuleDestroy {
  private readonly db: Db

  constructor() {
    this.db = getDb()
  }

  get client(): Db {
    return this.db
  }

  onModuleDestroy() {
    // postgres-js handles connection cleanup automatically
  }
}
