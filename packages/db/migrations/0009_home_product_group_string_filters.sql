UPDATE "home_product_group" AS g
SET "filters" = (
  SELECT jsonb_object_agg(key, CASE WHEN jsonb_typeof(value) = 'number'
    THEN to_jsonb(value #>> '{}') ELSE value END)
  FROM jsonb_each(g."filters")
)
WHERE EXISTS (
  SELECT 1 FROM jsonb_each(g."filters") WHERE jsonb_typeof(value) = 'number'
);
