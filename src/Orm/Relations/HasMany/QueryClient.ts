/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { QueryClientContract, OneOrMany } from '@ioc:Adonis/Lucid/Database'
import {
  LucidRow,
  LucidModel,
  ModelObject,
  HasManyClientContract,
  ModelAssignOptions,
} from '@ioc:Adonis/Lucid/Orm'

import { HasMany } from './index'
import { managedTransaction } from '../../../utils'
import { HasManyQueryBuilder } from './QueryBuilder'
import { HasManySubQueryBuilder } from './SubQueryBuilder'

/**
 * Query client for executing queries in scope to the defined
 * relationship
 */
export class HasManyQueryClient implements HasManyClientContract<HasMany, LucidModel> {
  constructor(
    public relation: HasMany,
    private parent: LucidRow,
    private client: QueryClientContract
  ) {}

  /**
   * Generate a related query builder
   */
  public static query(client: QueryClientContract, relation: HasMany, row: LucidRow) {
    const query = new HasManyQueryBuilder(client.knexQuery(), client, row, relation)
    typeof relation.onQueryHook === 'function' && relation.onQueryHook(query)
    return query
  }

  /**
   * Generate a related eager query builder
   */
  public static eagerQuery(
    client: QueryClientContract,
    relation: HasMany,
    rows: OneOrMany<LucidRow>
  ) {
    const query = new HasManyQueryBuilder(client.knexQuery(), client, rows, relation)

    query.isRelatedPreloadQuery = true
    typeof relation.onQueryHook === 'function' && relation.onQueryHook(query)
    return query
  }

  /**
   * Returns an instance of the sub query
   */
  public static subQuery(client: QueryClientContract, relation: HasMany) {
    const query = new HasManySubQueryBuilder(client.knexQuery(), client, relation)

    typeof relation.onQueryHook === 'function' && relation.onQueryHook(query)
    return query
  }

  /**
   * Returns instance of query builder
   */
  public query(): any {
    return HasManyQueryClient.query(this.client, this.relation, this.parent)
  }

  /**
   * Save related model instance
   */
  public async save(related: LucidRow) {
    await managedTransaction(this.parent.$trx || this.client, async (trx) => {
      this.parent.$trx = trx
      await this.parent.save()

      this.relation.hydrateForPersistance(this.parent, related)
      related.$trx = trx
      await related.save()
    })
  }

  /**
   * Save related model instance
   */
  public async saveMany(related: LucidRow[]) {
    const parent = this.parent

    await managedTransaction(this.parent.$trx || this.client, async (trx) => {
      this.parent.$trx = trx
      await parent.save()

      for (let row of related) {
        this.relation.hydrateForPersistance(this.parent, row)
        row.$trx = trx
        await row.save()
      }
    })
  }

  /**
   * Create instance of the related model
   */
  public async create(values: ModelObject, options?: ModelAssignOptions): Promise<LucidRow> {
    return managedTransaction(this.parent.$trx || this.client, async (trx) => {
      this.parent.$trx = trx
      await this.parent.save()

      const valuesToPersist = Object.assign({}, values)
      this.relation.hydrateForPersistance(this.parent, valuesToPersist)
      return this.relation.relatedModel().create(valuesToPersist, { client: trx, ...options })
    })
  }

  /**
   * Create instance of the related model
   */
  public async createMany(
    values: ModelObject[],
    options?: ModelAssignOptions
  ): Promise<LucidRow[]> {
    const parent = this.parent

    return managedTransaction(this.parent.$trx || this.client, async (trx) => {
      this.parent.$trx = trx
      await parent.save()

      const valuesToPersist = values.map((value) => {
        const valueToPersist = Object.assign({}, value)
        this.relation.hydrateForPersistance(this.parent, valueToPersist)
        return valueToPersist
      })

      return this.relation.relatedModel().createMany(valuesToPersist, { client: trx, ...options })
    })
  }

  /**
   * Get the first matching related instance or create a new one
   */
  public async firstOrCreate(
    search: any,
    savePayload?: any,
    options?: ModelAssignOptions
  ): Promise<LucidRow> {
    return managedTransaction(this.parent.$trx || this.client, async (trx) => {
      this.parent.$trx = trx
      await this.parent.save()

      const valuesToPersist = Object.assign({}, search)
      this.relation.hydrateForPersistance(this.parent, valuesToPersist)

      return this.relation
        .relatedModel()
        .firstOrCreate(valuesToPersist, savePayload, { client: trx, ...options })
    })
  }

  /**
   * Update the existing row or create a new one
   */
  public async updateOrCreate(
    search: ModelObject,
    updatePayload: ModelObject,
    options?: ModelAssignOptions
  ): Promise<LucidRow> {
    return managedTransaction(this.parent.$trx || this.client, async (trx) => {
      this.parent.$trx = trx
      await this.parent.save()

      const valuesToPersist = Object.assign({}, search)
      this.relation.hydrateForPersistance(this.parent, valuesToPersist)

      return this.relation
        .relatedModel()
        .updateOrCreate(valuesToPersist, updatePayload, { client: trx, ...options })
    })
  }

  /**
   * Fetch the existing related rows or create new one's
   */
  public async fetchOrCreateMany(
    payload: ModelObject[],
    predicate?: any,
    options?: ModelAssignOptions
  ): Promise<LucidRow[]> {
    return managedTransaction(this.parent.$trx || this.client, async (trx) => {
      this.parent.$trx = trx
      await this.parent.save()

      payload.forEach((row) => {
        this.relation.hydrateForPersistance(this.parent, row)
      })

      predicate = Array.isArray(predicate) ? predicate : predicate ? [predicate] : []

      return this.relation
        .relatedModel()
        .fetchOrCreateMany(predicate.concat(this.relation.foreignKey) as any, payload, {
          client: trx,
          ...options,
        })
    })
  }

  /**
   * Update the existing related rows or create new one's
   */
  public async updateOrCreateMany(
    payload: ModelObject[],
    predicate?: any,
    options?: ModelAssignOptions
  ): Promise<LucidRow[]> {
    return managedTransaction(this.parent.$trx || this.client, async (trx) => {
      this.parent.$trx = trx
      await this.parent.save()

      payload.forEach((row) => {
        this.relation.hydrateForPersistance(this.parent, row)
      })

      predicate = Array.isArray(predicate) ? predicate : predicate ? [predicate] : []

      return this.relation
        .relatedModel()
        .updateOrCreateMany(predicate.concat(this.relation.foreignKey) as any, payload, {
          client: trx,
          ...options,
        })
    })
  }
}
