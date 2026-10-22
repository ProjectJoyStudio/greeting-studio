CREATE TABLE public.memory_book_video_jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 book_id uuid NOT NULL REFERENCES public.memory_book_projects(id) ON DELETE CASCADE,
 user_id uuid NOT NULL,
 source_material_id uuid NOT NULL,
 provider text NOT NULL DEFAULT 'runpod',
 provider_job_id text,
 status text NOT NULL DEFAULT 'submitting',
 fragments jsonb NOT NULL DEFAULT '[]'::jsonb,
 output_path text NOT NULL,
 output_result jsonb,
 material_id uuid,
 last_error jsonb,
 started_at timestamptz NOT NULL DEFAULT now(),
 completed_at timestamptz,
 lease_until timestamptz,
 CONSTRAINT memory_book_video_job_status CHECK (status IN ('submitting','queued','running','ready','finalizing','completed','failed','discarded'))
);
GRANT SELECT ON public.memory_book_video_jobs TO authenticated;
GRANT ALL ON public.memory_book_video_jobs TO service_role;
ALTER TABLE public.memory_book_video_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read video jobs" ON public.memory_book_video_jobs FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE UNIQUE INDEX memory_book_video_one_active_job ON public.memory_book_video_jobs(book_id) WHERE status IN ('submitting','queued','running','ready','finalizing');
CREATE INDEX memory_book_video_jobs_owner ON public.memory_book_video_jobs(user_id, book_id, started_at DESC);