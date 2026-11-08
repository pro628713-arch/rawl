import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { ScriptForm } from "@/components/script-form";
import { publishScript } from "@/lib/scripts.functions";
import { emptyDraft, UserError, type Draft } from "@/lib/script-model";
import { markJustPublished, readHandle, saveHandle, saveToken } from "@/lib/vault";

export const Route = createFileRoute("/new")({
  component: NewPage,
});

function NewPage() {
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [handle, setHandle] = useState<string | null>(null);

  useEffect(() => {
    setHandle(readHandle());
  }, []);

  const initial = emptyDraft();
  if (handle) initial.handle = handle;

  return (
    <Shell>
      <h1 className="text-3xl font-semibold">سكربت جديد</h1>
      <p className="mt-2 max-w-2xl text-muted">
        الاسم الظاهر علني. لا نطلب بريدًا. بعد النشر يُحفظ رمز التحرير في هذا المتصفح فقط، وهو
        مفتاح التعديل والحذف.
      </p>
      <div className="mt-6">
        <ScriptForm
          key={handle ?? "fresh"}
          initial={initial}
          submitLabel="نشر"
          pending={pending}
          error={error}
          allowSample
          onSubmit={(draft) => {
            void publish(draft, setPending, setError, navigate);
          }}
        />
      </div>
    </Shell>
  );
}

async function publish(
  draft: Draft,
  setPending: (value: boolean) => void,
  setError: (value: string) => void,
  navigate: ReturnType<typeof useNavigate>,
) {
  setPending(true);
  setError("");
  try {
    const created = await publishScript({ data: draft });
    saveToken(created.slug, created.editToken);
    saveHandle(draft.handle || "guest");
    markJustPublished(created.slug);
    await navigate({ to: "/s/$slug", params: { slug: created.slug } });
  } catch (error) {
    setError(error instanceof UserError || error instanceof Error ? error.message : "تعذّر النشر");
  } finally {
    setPending(false);
  }
}
