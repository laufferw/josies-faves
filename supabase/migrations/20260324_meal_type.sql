-- Add meal_type column to recipes table
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS meal_type TEXT;

-- Optional: add a check constraint for valid values
ALTER TABLE recipes ADD CONSTRAINT recipes_meal_type_check
  CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack', 'dessert') OR meal_type IS NULL);
