import { DATABASE } from '@constants/tokens';
import type { DrizzleService } from '@lib/types';
import { Inject, Injectable } from '@nestjs/common';
import {
	type PaginatedItems,
	type PaginationInput,
	SortOrder
} from '@utils/graphql/pagination';
import { type SQL, asc, desc } from 'drizzle-orm';
import type { PgTableWithColumns, TableConfig } from 'drizzle-orm/pg-core';

type PageOptions<O extends TableConfig, S extends PgTableWithColumns<O>> = {
	pagination: PaginationInput;
	schema: S;
	where?: SQL;
};

@Injectable()
export class PaginatorService {
	public constructor(
		@Inject(DATABASE) private _drizzleService: DrizzleService
	) {}

	public async paginate<
		O extends TableConfig,
		S extends PgTableWithColumns<O>
	>(options: PageOptions<O, S>): Promise<PaginatedItems> {
		const {
			page = 1,
			size: limit = 10,
			sortBy,
			sortOrder = SortOrder.ASC
		} = options.pagination;
		const { where, schema } = options;

		const offset = (page - 1) * limit;
		const sort = sortBy ? schema[sortBy] : undefined;
		const order = sortOrder === SortOrder.ASC ? asc : desc;

		// Prepare the query to fetch the paginated data
		const query = this._drizzleService
			.select()
			.from(schema)
			.where(where)
			.limit(limit)
			.offset(offset);

		// if a sort field is provided, order the results by that field
		if (sort) {
			query.orderBy(order(sort));
		}

		// Get the paginated data
		const entries = await query.execute();

		return {
			nodes: entries,
			totalCount: entries.length,
			totalPages: Math.ceil(entries.length / limit),
			pageInfo: {
				hasNextPage: entries.length === limit,
				hasPreviousPage: page > 1
			}
		};
	}
}
