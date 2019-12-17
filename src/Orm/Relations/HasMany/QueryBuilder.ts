/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

import knex from 'knex'
import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'
import { ModelConstructorContract, ModelContract } from '@ioc:Adonis/Lucid/Model'
import { RelationBaseQueryBuilderContract } from '@ioc:Adonis/Lucid/Relations'

import { HasMany } from './index'
import { getValue, unique } from '../../../utils'
import { BaseQueryBuilder } from '../Base/QueryBuilder'

/**
 * Extends the model query builder for executing queries in scope
 * to the current relationship
 */
export class HasManyQueryBuilder extends BaseQueryBuilder implements RelationBaseQueryBuilderContract<
ModelConstructorContract,
ModelConstructorContract
> {
  constructor (
    builder: knex.QueryBuilder,
    client: QueryClientContract,
    private parent: ModelContract | ModelContract[],
    private relation: HasMany,
    isEager: boolean = false,
  ) {
    super(builder, client, relation, isEager, (userFn) => {
      return (__builder) => {
        userFn(new HasManyQueryBuilder(__builder, this.client, this.parent, this.relation))
      }
    })
  }

  /**
   * Applies constraint to limit rows to the current relationship
   * only.
   */
  public applyConstraints () {
    if (this.$appliedConstraints) {
      return
    }

    const queryAction = this.$queryAction()
    this.$appliedConstraints = true

    /**
     * Eager query contraints
     */
    if (Array.isArray(this.parent)) {
      this.$knexBuilder.whereIn(this.relation.$foreignCastAsKey, unique(this.parent.map((model) => {
        return getValue(model, this.relation.$localKey, this.relation, queryAction)
      })))
      return
    }

    /**
     * Query constraints
     */
    const value = getValue(this.parent, this.relation.$localKey, this.relation, queryAction)
    this.$knexBuilder.where(this.relation.$foreignCastAsKey, value)
  }

  /**
   * The keys for constructing the join query
   */
  public getRelationKeys (): string[] {
    return [this.relation.$foreignCastAsKey]
  }
}
