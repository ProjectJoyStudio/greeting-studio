import { createFileRoute } from "@tanstack/react-router";
import { LiveGreetingEditor } from "@/components/live-cards/LiveGreetingTextStep";

export const Route = createFileRoute("/test-live-save")({
  component: TestLiveSavePage,
});

function TestLiveSavePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <p className="mb-4 text-xs text-muted-foreground">Internal test route — verify empty-text confirmation.</p>
      <LiveGreetingEditor
        animationId="test-animation-id"
        videoUrl="http://localhost:8080/favicon.ico"
        aspectRatio="1:1"
      />
    </div>
  );
}
