-- Add the new Diet Tracker profiles without changing existing ownership.
INSERT OR IGNORE INTO profiles (slug, display_name, status) VALUES
  ('andreia', 'Andreia', 'pending'),
  ('marcelo', 'Marcelo', 'pending');
