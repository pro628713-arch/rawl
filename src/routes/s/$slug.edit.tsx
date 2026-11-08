import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell, fieldClass } from "@/components/shell";
import { ScriptForm } from "@/components/script-form";
import { Button } from "@/components/ui/button";
import { deleteScript, getScript, saveScript } from "@/lib/scripts.functions";
import { type Draft, type Lang } from "@/lib/script-model";
import { dropToken, readToken, saveHandle, saveToken } from "@/lib/vault";

export const Route = createFileRoute("/s/$slug/edit")({
  loader: ({ params }) => getScript({ data: { slug: params.slug } }),
  component: EditPage,
  pendingComponent: () => (
    <Shell>
      <p className="text-muted">جارٍ فتح المحرّر…</p>
    </Shell>
  ),
});

function EditPage() {
  const data = Route.useLoaderData();
  const navigate = useNavigate();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    setToken(readToken(data.slug));
  }, [data.slug]);

  const draft: Draft = {
    title: data.title,
    summary: data.summary,
    handle: data.handle,
    tags: data.tags.join(", "),
    license: data.license,
    message: "",
    files: data.files.map((file) => ({
      filename: file.filename,
      language: file.language as Lang,
      content: file.content,
    })),
  };

  return (
    <Shell>
      <h1 className="text-3xl font-semibold">تعديل {data.title}</h1>
      {token === null ? <p className="mt-4 text-muted">جارٍ التحقق من رمز التحرير…</p> : null}
      {token === "" ? (
        <form
          className="mt-4 grid max-w-xl gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const value = String(form.get("token") ?? "").trim();
            saveToken(data.slug, value);
            setToken(value);
          }}
        >
          <p className="text-muted">هذا المتصفح لا يملك رمز التحرير. الصقه إن حفظته.</p>
          <input name="token" dir="ltr" className={`${fieldClass} font-mono`} required />
          <Button type="submit">متابعة</Button>
        </form>
      ) : null}
      {token ? (
        <div className="mt-6 grid gap-8">
          <ScriptForm
            key={data.updatedAt}
            initial={draft}
            submitLabel="حفظ النسخة"
            pending={pending}
            error={error}
            onSubmit={(next) => {
              void (async () => {
                setPending(true);
                setError("");
                try {
                  await saveScript({ data: { slug: data.slug, editToken: token, draft: next } });
                  saveHandle(next.handle);
                  await router.invalidate();
                  await navigate({ to: "/s/$slug", params: { slug: data.slug } });
                } catch (caught) {
                  setError(caught instanceof Error ? caught.message : "تعذّر الحفظ");
                } finally {
                  setPending(false);
                }
              })();
            }}
          />
          <div className="rounded-lg border border-line p-4">
            <h2 className="font-semibold">حذف السكربت</h2>
            <p className="mt-1 text-sm text-muted">يحذف هذا السكربت فقط، وبرمز التحرير.</p>
            {confirming ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="primary"
                  onClick={() => {
                    void (async () => {
                      setPending(true);
                      try {
                        await deleteScript({ data: { slug: data.slug, editToken: token } });
                        dropToken(data.slug);
                        await navigate({ to: "/" });
                      } catch (caught) {
                        setError(caught instanceof Error ? caught.message : "تعذّر الحذف");
                        setPending(false);
                      }
                    })();
                  }}
                >
                  تأكيد الحذف
                </Button>
                <Button variant="ghost" onClick={() => setConfirming(false)}>
                  إلغاء
                </Button>
              </div>
            ) : (
              <Button variant="ghost" className="mt-3" onClick={() => setConfirming(true)}>
                حذف
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </Shell>
  );
}
