ALTER TABLE public.live_greeting_cards
  ADD COLUMN IF NOT EXISTS prompt_en text,
  ADD COLUMN IF NOT EXISTS prompt_lang text,
  ADD COLUMN IF NOT EXISTS animation_prompt text,
  ADD COLUMN IF NOT EXISTS animation_prompt_en text;