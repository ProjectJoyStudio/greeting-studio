import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Coins, ImagePlus, Loader2, Plus, Trash2, Users, Wand2, Check } from "lucide-react";
import { toast } from "sonner";

import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  addPvgPersonPhoto,
  generatePvgScene,
  openPvgProject,
  refreshPvgProject,
  removePvgPerson,
  renamePvgPerson,
  savePvgPerson,
  savePvgProject,
  selectPvgScene,
} from "@/lib/personal-video/pvg.functions";
import { detectFaces, fileToBase64, optimizeImage, readImage } from "@/lib/personal-video/photo-tools";
import {
  PVG_MAX_PEOPLE,
  pvgPriceCredits,
  validatePvgProject,
  type PvgIssueField,
  type PvgProject,
} from "@/lib/personal-video/types";

export function PersonalVideoPage({ projectId }: { projectId?: string | undefined }) {
  const { t } = useI18n();
  const { isAuthenticated } = useAuth();
  const open = useServerFn(openPvgProject);
  const save = useServerFn(savePvgProject);
  const savePerson = useServerFn(savePvgPerson);
  const addPhoto = useServerFn(addPvgPersonPhoto);
  const rename = useServerFn(renamePvgPerson);
  const removePerson = useServerFn(removePvgPerson);
  const generate = useServerFn(generatePvgScene);
  const refresh = useServerFn(refreshPvgProject);
  const chooseScene = useServerFn(selectPvgScene);

  const [project, setProject] = useState<PvgProject | null>(null);
  const [balance, setBalance] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [occasion, setOccasion] = useState("");
  const [description, setDescription] = useState("");
  const personInput = useRef<HTMLInputElement>(null);
  const groupInput = useRef<HTMLInputElement>(null);
  const extraInput = useRef<HTMLInputElement>(null);
  const replaceFor = useRef<string | null>(null);
  const extraFor = useRef<string | null>(null);

  // --- open or start the project -----------------------------------------
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    void (async () => {
      const res = await open({ data: { projectId } });
      if (cancelled) return;
      setProject(res.project);
      setBalance(res.balance);
      setRecipientName(res.project.recipientName);
      setOccasion(res.project.occasion);
      setDescription(res.project.sceneDescription);
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, projectId, open]);

  // --- automatic draft saving after every change --------------------------
  useEffect(() => {
    if (!project) return;
    if (
      recipientName === project.recipientName &&
      occasion === project.occasion &&
      description === project.sceneDescription
    ) {
      return;
    }
    const timer = setTimeout(() => {
      void save({
        data: { projectId: project.id, recipientName, occasion, sceneDescription: description },
      }).then(() =>
        setProject((prev) =>
          prev ? { ...prev, recipientName, occasion, sceneDescription: description } : prev,
        ),
      );
    }, 700);
    return () => clearTimeout(timer);
  }, [recipientName, occasion, description, project, save]);

  // --- creation keeps running in the background ---------------------------
  const hasRunning = Boolean(
    project?.scenes.some((s) => s.status === "pending" || s.status === "processing"),
  );
  useEffect(() => {
    if (!project || !hasRunning) return;
    const timer = setInterval(() => {
      void refresh({ data: { projectId: project.id } }).then((res) => {
        if (res.project) setProject(res.project);
        setBalance(res.balance);
      });
    }, 5000);
    return () => clearInterval(timer);
  }, [project, hasRunning, refresh]);

  const issues = useMemo(() => {
    if (!project) return [];
    return validatePvgProject(
      { ...project, recipientName, occasion, sceneDescription: description },
      balance,
    );
  }, [project, recipientName, occasion, description, balance]);

  const issueFor = useCallback(
    (field: PvgIssueField) => issues.find((i) => i.field === field) ?? null,
    [issues],
  );

  const price = pvgPriceCredits(project?.people.length ?? 1);
  const canGenerate = Boolean(project) && issues.length === 0 && busy === null && !hasRunning;

  // --- photo handling -----------------------------------------------------
  async function handlePersonFile(file: File) {
    if (!project) return;
    setBusy("person");
    try {
      const image = await readImage(file);
      const optimized = await optimizeImage(image);
      const res = await savePerson({
        data: {
          projectId: project.id,
          personId: replaceFor.current ?? undefined,
          optimizedBase64: optimized.base64,
          originalBase64: await fileToBase64(file),
          contentType: optimized.contentType,
          faceQuality: "good",
          source: "individual",
        },
      });
      if (res.project) setProject(res.project);
      toast.success(t("pvg_saved"));
    } catch {
      toast.error(t("pvg_scene_failed"));
    } finally {
      replaceFor.current = null;
      setBusy(null);
      if (personInput.current) personInput.current.value = "";
    }
  }

  async function handleGroupFile(file: File) {
    if (!project) return;
    setBusy("group");
    try {
      const room = PVG_MAX_PEOPLE - project.people.length;
      const faces = await detectFaces(file, Math.max(0, room));
      if (!faces || faces.length === 0) {
        toast.error(t("pvg_no_faces"));
        return;
      }
      let latest = project;
      for (const face of faces) {
        const res = await savePerson({
          data: {
            projectId: project.id,
            optimizedBase64: face.photo.base64,
            contentType: face.photo.contentType,
            faceQuality: face.quality,
            source: "group",
          },
        });
        if (res.project) latest = res.project;
      }
      setProject(latest);
      toast.success(`${t("pvg_faces_found")}: ${faces.length}`);
    } catch {
      toast.error(t("pvg_no_faces"));
    } finally {
      setBusy(null);
      if (groupInput.current) groupInput.current.value = "";
    }
  }

  async function handleExtraFile(file: File) {
    if (!project || !extraFor.current) return;
    setBusy("extra");
    try {
      const optimized = await optimizeImage(await readImage(file));
      const res = await addPhoto({
        data: {
          projectId: project.id,
          personId: extraFor.current,
          base64: optimized.base64,
          contentType: optimized.contentType,
        },
      });
      if (res.project) setProject(res.project);
    } finally {
      extraFor.current = null;
      setBusy(null);
      if (extraInput.current) extraInput.current.value = "";
    }
  }

  async function runGenerate() {
    if (!project) return;
    setBusy("generate");
    try {
      const res = await generate({ data: { projectId: project.id } });
      if (res.project) setProject(res.project);
      if (!res.ok) {
        const first = res.issues[0];
        toast.error(first ? t(first.key) : t("pvg_scene_failed"));
      }
    } catch {
      toast.error(t("pvg_scene_failed"));
    } finally {
      setBusy(null);
    }
  }

  if (!isAuthenticated) {
    return (
      <SiteLayout>
        <PageHeader title={t("pvg_title")} subtitle={t("pvg_sub")} />
        <div className="mx-auto max-w-3xl px-5 pb-24">
          <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            {t("pvg_login")}
          </Link>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <PageHeader title={t("pvg_title")} subtitle={t("pvg_sub")} />

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-4 pb-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:px-6">
        {/* Left — the project ------------------------------------------- */}
        <div className="min-w-0 space-y-6">
          <div className="rounded-3xl border border-border/60 bg-card/70 p-6 shadow-warm">
            <h2 className="font-display text-lg font-semibold tracking-tight">{t("pvg_basics")}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label={t("pvg_recipient")} error={issueFor("recipientName") && t("pvg_err_recipient")}>
                <input
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  maxLength={120}
                  placeholder={t("pvg_recipient_ph")}
                  className="w-full rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-sm outline-none transition focus:border-primary/60"
                />
              </Field>
              <Field label={t("pvg_occasion")} error={issueFor("occasion") && t("pvg_err_occasion")}>
                <input
                  value={occasion}
                  onChange={(e) => setOccasion(e.target.value)}
                  maxLength={120}
                  placeholder={t("pvg_occasion_ph")}
                  className="w-full rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-sm outline-none transition focus:border-primary/60"
                />
              </Field>
            </div>

            <div className="mt-5">
              <Field
                label={t("pvg_scene")}
                error={issueFor("sceneDescription") && t("pvg_err_description")}
              >
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={7}
                  maxLength={4000}
                  placeholder={t("pvg_scene_ph")}
                  className="w-full resize-none rounded-2xl border border-border/60 bg-background/70 p-4 text-sm leading-relaxed outline-none transition focus:border-primary/60"
                />
              </Field>
              <p className="mt-2 text-xs text-muted-foreground">{t("pvg_scene_hint")}</p>
            </div>
          </div>

          {/* People ---------------------------------------------------- */}
          <div className="rounded-3xl border border-border/60 bg-card/70 p-6 shadow-warm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="inline-flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
                <Users className="h-4 w-4 text-primary" />
                {t("pvg_people")}
              </h2>
              <span className="text-xs text-muted-foreground">
                {project?.people.length ?? 0}/{PVG_MAX_PEOPLE}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{t("pvg_people_hint")}</p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {(project?.people ?? []).map((person) => (
                <div
                  key={person.id}
                  className="rounded-2xl border border-border/60 bg-background/60 p-4"
                >
                  <div className="flex items-start gap-3">
                    {person.photoUrl ? (
                      <img
                        src={person.photoUrl}
                        alt={person.name || t("pvg_person_fallback")}
                        className="h-16 w-16 shrink-0 rounded-xl object-cover"
                      />
                    ) : (
                      <span className="h-16 w-16 shrink-0 rounded-xl bg-muted" />
                    )}
                    <div className="min-w-0 flex-1">
                      <input
                        defaultValue={person.name}
                        placeholder={t("pvg_name_ph")}
                        onBlur={(e) => {
                          if (!project) return;
                          const value = e.target.value;
                          if (value === person.name) return;
                          void rename({
                            data: { projectId: project.id, personId: person.id, name: value },
                          }).then(() =>
                            setProject((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    people: prev.people.map((p) =>
                                      p.id === person.id ? { ...p, name: value } : p,
                                    ),
                                  }
                                : prev,
                            ),
                          );
                        }}
                        className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm font-medium outline-none focus:border-primary/60"
                      />
                      <p className="mt-1 truncate text-[11px] text-muted-foreground">
                        {person.name.trim() || t("pvg_person_fallback")}
                        {person.source === "group" ? ` · ${t("pvg_source_group")}` : ""}
                      </p>
                    </div>
                  </div>

                  {person.faceQuality === "low" && (
                    <p className="mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-[11px] text-destructive">
                      {t("pvg_quality_low")}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <MiniButton
                      onClick={() => {
                        replaceFor.current = person.id;
                        personInput.current?.click();
                      }}
                    >
                      {t("pvg_replace_photo")}
                    </MiniButton>
                    <MiniButton
                      onClick={() => {
                        extraFor.current = person.id;
                        extraInput.current?.click();
                      }}
                    >
                      <ImagePlus className="h-3.5 w-3.5" />
                      {t("pvg_add_photos")}
                      {person.extraPhotoCount > 0 ? ` (${person.extraPhotoCount})` : ""}
                    </MiniButton>
                    <MiniButton
                      onClick={() => {
                        if (!project) return;
                        void removePerson({
                          data: { projectId: project.id, personId: person.id },
                        }).then((res) => res.project && setProject(res.project));
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t("pvg_remove_person")}
                    </MiniButton>
                  </div>
                </div>
              ))}
            </div>

            {issueFor("people") && (
              <p className="mt-4 text-xs text-destructive">{t(issueFor("people")!.key)}</p>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={busy !== null || (project?.people.length ?? 0) >= PVG_MAX_PEOPLE}
                onClick={() => {
                  replaceFor.current = null;
                  personInput.current?.click();
                }}
                className="inline-flex items-center gap-2 rounded-full border border-border/60 px-5 py-2.5 text-sm font-medium transition hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy === "person" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {t("pvg_add_person")}
              </button>
              <button
                type="button"
                disabled={busy !== null || (project?.people.length ?? 0) >= PVG_MAX_PEOPLE}
                onClick={() => groupInput.current?.click()}
                className="inline-flex items-center gap-2 rounded-full border border-border/60 px-5 py-2.5 text-sm font-medium transition hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy === "group" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                {t("pvg_add_group")}
              </button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{t("pvg_upload_hint")}</p>

            <input
              ref={personInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handlePersonFile(file);
              }}
            />
            <input
              ref={groupInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleGroupFile(file);
              }}
            />
            <input
              ref={extraInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleExtraFile(file);
              }}
            />
          </div>
        </div>

        {/* Right — price and the five variations -------------------------- */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-border/60 bg-card/70 p-6 shadow-warm lg:sticky lg:top-24">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-sm font-medium">
                <Coins className="h-4 w-4 text-primary" />
                {t("pvg_price")}
              </span>
              <span className="font-display text-2xl">
                {project?.creditsCharged || price}{" "}
                <span className="text-sm text-muted-foreground">{t("pvg_credits_word")}</span>
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{t("pvg_paid_note")}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("pvg_balance")}: {balance} {t("pvg_credits_word")}
            </p>
            {issueFor("credits") && (
              <p className="mt-2 text-xs text-destructive">{t("pvg_err_credits")}</p>
            )}

            <button
              type="button"
              disabled={!canGenerate}
              onClick={runGenerate}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gold-gradient px-6 py-3 text-sm font-semibold text-primary-foreground shadow-warm transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy === "generate" || hasRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              {busy === "generate" || hasRunning ? t("pvg_generating") : t("pvg_generate")}
            </button>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              {t("pvg_attempts")}: {project?.generationsUsed ?? 0}/{project?.generationsLimit ?? 5}
            </p>
            {issueFor("generations") && (
              <p className="mt-2 text-center text-xs text-destructive">{t("pvg_err_generations")}</p>
            )}
          </div>

          {(project?.scenes.length ?? 0) > 0 && (
            <div className="rounded-3xl border border-border/60 bg-card/60 p-5">
              <h2 className="font-display text-base font-semibold tracking-tight">
                {t("pvg_variations")}
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {project!.scenes.map((scene) => (
                  <div key={scene.id} className="overflow-hidden rounded-2xl border border-border/60">
                    <div className="relative aspect-video w-full bg-muted/40">
                      {scene.status === "ready" && scene.imageUrl ? (
                        <img
                          src={scene.imageUrl}
                          alt={`${t("pvg_variation")} ${scene.variationIndex}`}
                          className="h-full w-full select-none object-cover"
                          draggable={false}
                          onContextMenu={(e) => e.preventDefault()}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center gap-2 text-xs text-muted-foreground">
                          {scene.status === "failed" ? (
                            t("pvg_scene_failed")
                          ) : (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin text-primary" />
                              {t("pvg_scene_working")}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 p-3">
                      <span className="text-xs font-medium">
                        {t("pvg_variation")} {scene.variationIndex}
                      </span>
                      {scene.status === "ready" && (
                        <button
                          type="button"
                          onClick={() => {
                            if (!project) return;
                            void chooseScene({
                              data: { projectId: project.id, sceneId: scene.id },
                            }).then((res) => res.project && setProject(res.project));
                          }}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                            project!.selectedSceneId === scene.id
                              ? "border border-primary/60 bg-primary/10 text-primary"
                              : "bg-gold-gradient text-primary-foreground"
                          }`}
                        >
                          <Check className="h-3.5 w-3.5" />
                          {project!.selectedSceneId === scene.id ? t("pvg_selected") : t("pvg_use_scene")}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | null | false;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
      {error ? <span className="mt-1 block text-xs text-destructive">{error}</span> : null}
    </label>
  );
}

function MiniButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1.5 text-[11px] font-medium transition hover:border-primary/50"
    >
      {children}
    </button>
  );
}