import { BaseEntity } from 'typeorm'
import { IRelationQuery } from '..'

const QueryModelName = 'model'
type ComposeQueryOptions = {
  relations?: (string | IRelationQuery)[],
  skip?: number,
  limit?: number
  last?: number,
  first?: number,
  conditionOperator?: 'or' | 'and'
}

export class OrmInterface {
  private _model: typeof BaseEntity

  public get Model() {
    return this._model
  }
  public set Model(val: typeof BaseEntity) {
    this._model = val
  }

  constructor(model: typeof BaseEntity) {
    this.Model = model
  }

  private getQueryFieldName(fieldName: string, mainField: string = QueryModelName): string {
    if (mainField) {
      return `${mainField}.${fieldName}`
    } else {
      return fieldName
    }
  }

  private getConditionString(mainField: string, subField: string): string {
    return `${this.getQueryFieldName(subField, mainField)} = :${subField}`
  }

  /**
   * Compose a TypeORM query from a GraphQL query
   * @param where The where conditions
   * @param options The other options
   */
  ComposeQuery(options: ComposeQueryOptions)
  ComposeQuery(where: Object, options?: ComposeQueryOptions)
  ComposeQuery(where: Object | undefined, options: ComposeQueryOptions = {}) {
    const QueryBuilder = this.Model.createQueryBuilder(QueryModelName)
    const RelationArgs = new Map()

    if (options.skip && options.limit) {
      QueryBuilder.take(options.limit)
      QueryBuilder.skip(options.skip)
    }

    options.limit && QueryBuilder.limit(options.limit)

    if (options.first) {
      QueryBuilder.take(options.first)
    }

    if (options.last) {
      QueryBuilder.orderBy(this.getQueryFieldName('Id'), 'DESC')
      QueryBuilder.take(options.last)
    }

    if (options.relations) {
      // Add relations to the query
      options.relations.map((relation: string | IRelationQuery) => {
        // Convert the relation parameters to a generic object
        let relationObj: IRelationQuery
        if (typeof relation === 'string') {
          relationObj = {
            select: true,
            forArg: null,
            table: relation
          }
        } else {
          relationObj = relation
        }
        if (relationObj.table) {
          // Culture.Example => Culture_Example
          const PathProps = relationObj.table.split('.')
          const NewAliasName = PathProps.join('_')
          if (relationObj.forArg) {
            RelationArgs.set(relationObj.forArg, NewAliasName)
          }
          try {
            QueryBuilder.expressionMap.findAliasByName(NewAliasName)
          } catch (err) {
            const QueryFielName = PathProps.length > 1 ? relationObj.table : this.getQueryFieldName(relationObj.table)
            if (relationObj.select) {
              QueryBuilder.innerJoinAndSelect(QueryFielName, NewAliasName)
            } else {
              QueryBuilder.innerJoin(QueryFielName, NewAliasName)
            }
          }
        }
      })
    }

    const parseObjToQuery = (obj: Object, mainField: string = QueryModelName, parentProp: string = null) => {
      Object.getOwnPropertyNames(obj).map((prop: string) => {
        const Value = obj[prop]

        // Ignore the GraphQL query parameter if the value is not given (= undefined)
        if (Value !== undefined) {
          const propPath = this.getQueryFieldName(prop, parentProp)

          // If the given value is a relation, join the table and add the conditions into the where
          const RelationValue = RelationArgs.get(propPath)
          if (RelationValue) {
            parseObjToQuery(Value, RelationValue, propPath)
          } else if (!RelationValue && typeof Value !== 'object') {
            // Add the where condition to the query
            const WhereCondition = this.getConditionString(mainField, prop)
            const WhereValueToReplace = { [prop]: Value }
            if (QueryBuilder.expressionMap.wheres.length > 0) {
              if (options.conditionOperator === 'or') {
                QueryBuilder.orWhere(WhereCondition, WhereValueToReplace)
              } else {
                QueryBuilder.andWhere(WhereCondition, WhereValueToReplace)
              }
            } else {
              QueryBuilder.where(WhereCondition, WhereValueToReplace)
            }
          }
        }
      })
    }
    if (where) {
      parseObjToQuery(where)
    }

    return QueryBuilder
  }
}
