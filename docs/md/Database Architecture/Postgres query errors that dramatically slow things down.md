**Postgres query errors that dramatically slow things down**\
\
Why do they hurt your system and what to do instead...

## **1. Missing indexes on WHERE / JOIN columns**

**The #1 killer.**

**Mistake**

****SELECT \* FROM orders WHERE user_id = 123;

...but orders.user_id is **not indexed**.

**Why it's bad**

- Forces a **sequential scan** over the entire table

- Gets exponentially worse as data grows

**Fix**

****CREATE INDEX idx_orders_user_id ON orders(user_id);

💡 Rule of thumb:\
If a column is used in WHERE, JOIN, ORDER BY, or GROUP BY
**frequently**, it probably needs an index.

## **2. Using functions on indexed columns in WHERE**

**This silently disables your index.**

**Mistake**

****SELECT \* FROM users

WHERE LOWER(email) = \'test@example.com\';

**Why it's bad**

- Postgres **cannot use the index** on email

- Turns an indexed lookup into a full scan

**Fix options**

****\-- Option 1: functional index

CREATE INDEX idx_users_lower_email ON users (LOWER(email));

\-- Option 2: store normalized data

store emails lowercase



## **3. SELECT \* on large tables**

**Very common, very expensive.**

**Mistake**

****SELECT \* FROM events WHERE created_at \> now() - interval \'1
day\';

**Why it's bad**

- Reads unnecessary columns from disk

- Breaks index-only scans

- Increases memory and network usage

**Fix**

****SELECT id, user_id, created_at FROM events

WHERE created_at \> now() - interval \'1 day\';



## **4. Inefficient JOINs (wrong order or missing indexes)**

**JOINs without indexes = disaster.**

**Mistake**

****SELECT \*

FROM orders o

JOIN users u ON o.user_id = u.id;

...but orders.user_id is not indexed.

**Why it's bad**

- Causes nested loop joins over large datasets

- Can turn into **O(n²)** behavior

**Fix**

****CREATE INDEX idx_orders_user_id ON orders(user_id);

💡 Always index:

- Foreign keys

- Columns used in joins on large tables

## **5. Using LIKE \'%something%\'**

**Leading wildcards kill indexes.**

**Mistake**

****SELECT \* FROM products WHERE name LIKE \'%shoe%\';

**Why it's bad**

- B-tree indexes **cannot** be used

- Full table scan every time

**Fix options**

- Use GIN + pg_trgm

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_products_name_trgm

ON products USING gin (name gin_trgm_ops);



## **6. Not using LIMIT on large result sets**

**Especially bad in APIs.**

**Mistake**

****SELECT \* FROM logs ORDER BY created_at DESC;

**Why it's bad**

- Sorts the **entire table**

- Transfers massive result sets

**Fix**

****SELECT \* FROM logs

ORDER BY created_at DESC

LIMIT 100;



## **7. ORDER BY without supporting index**

**Hidden sort cost.**

**Mistake**

****SELECT \* FROM orders ORDER BY created_at DESC;

**Why it's bad**

- Requires an explicit sort

- Uses memory or spills to disk

**Fix**

****CREATE INDEX idx_orders_created_at_desc

ON orders(created_at DESC);



## **8. Overusing subqueries instead of JOINs (or vice versa)**

**Not always bad --- but often misused.**

**Mistake**

****SELECT \*

FROM orders

WHERE user_id IN (

SELECT id FROM users WHERE is_active = true

);

**Why it's bad**

- Can materialize large subquery results

- Harder for planner to optimize

**Fix**

****SELECT o.\*

FROM orders o

JOIN users u ON o.user_id = u.id

WHERE u.is_active = true;



## **9. Using OFFSET for deep pagination**

**Works... until it doesn't.**

**Mistake**

****SELECT \* FROM orders

ORDER BY id

LIMIT 50 OFFSET 100000;

**Why it's bad**

- Postgres still scans and discards 100k rows

- Gets slower with every page

**Fix (keyset pagination)**

****SELECT \* FROM orders

WHERE id \> 100000

ORDER BY id

LIMIT 50;



## **10. Ignoring EXPLAIN ANALYZE**

**Flying blind.**

**Mistake**

- Assuming the planner is doing what you think

**Fix**

****EXPLAIN ANALYZE

SELECT \...

Look for:

- Seq Scan on big tables

- High Actual Time

- Huge row counts compared to estimates

## **11. Too many OR conditions**

**Prevents good index usage.**

**Mistake**

****WHERE status = \'new\'

OR status = \'pending\'

OR status = \'processing\';

**Fix**

****WHERE status IN (\'new\', \'pending\', \'processing\');

(Still may need an index on status.)

## **12. Not vacuuming / analyzing tables**

**Stats lie → bad plans.**

**Problem**

- Autovacuum disabled or misconfigured

- Planner uses bad row estimates

**Fix**

****VACUUM ANALYZE table_name;



## **If I had to pick the Top 5 worst offenders**

1.  Missing indexes on joins & filters

2.  Functions on indexed columns

3.  SELECT \* on large tables

4.  LIKE \'%term%\' without trigram index

5.  OFFSET-based pagination
