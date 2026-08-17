update app_settings
set value = (
  ((value #- '{generators,gpt_image_1_mini}') #- '{generators,gpt_image_1_mini_low}')
  || jsonb_build_object('generators',
       (((value->'generators') - 'gpt_image_1_mini') - 'gpt_image_1_mini_low')
       || jsonb_build_object(
            'gpt_image_15_low', jsonb_build_object('enabled', true, 'parallel', 'auto'),
            'gpt_image_15_medium', jsonb_build_object('enabled', true, 'parallel', 'auto')
          ))
  || jsonb_build_object('functions',
       (value->'functions')
       || jsonb_build_object(
            'greeting_cards.image',
              jsonb_set(value->'functions'->'greeting_cards.image', '{primary}',
                case when value->'functions'->'greeting_cards.image'->>'primary' = 'gpt_image_1_mini'
                     then '"gpt_image_15_low"'::jsonb
                     else coalesce(value->'functions'->'greeting_cards.image'->'primary','null'::jsonb) end),
            'live_cards.start_image',
              jsonb_set(value->'functions'->'live_cards.start_image', '{primary}',
                case when value->'functions'->'live_cards.start_image'->>'primary' = 'gpt_image_1_mini_low'
                     then '"gpt_image_15_medium"'::jsonb
                     else coalesce(value->'functions'->'live_cards.start_image'->'primary','null'::jsonb) end)
          ))
)
where key = 'generator_control';