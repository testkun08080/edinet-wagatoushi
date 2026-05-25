# @edinet/db

Drizzle ORM schema and shared queries for D1 / SQLite.

The schema mirrors `apps/wrapper/sql/d1_schema.sql` (kept for reference during migration). Generate migrations from this TypeScript schema:

```bash
pnpm --filter @edinet/db db:generate
```

Use from `apps/api`:

```ts
import { drizzle } from "drizzle-orm/d1";
import * as schema from "@edinet/db/schema";
import { getCompanyBySecCode } from "@edinet/db/queries";

const db = drizzle(env.EDINET_DB, { schema });
const company = await getCompanyBySecCode(db, "73180");
```
