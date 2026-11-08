import { useState } from "react";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/shell";
import {
  LANGS,
  LICENSES,
  SAMPLE_DRAFT,
  langFromFilename,
  type Draft,
  type Lang,
} from "@/lib/script-model";

export function ScriptForm({
  initial,
  submitLabel,
  pending,
  error,
  allowSample,
  onSubmit,
}: {
  initial: Draft;
  submitLabel: string;
  pending: boolean;
  error: string;
  allowSample?: boolean;
  onSubmit: (draft: Draft) => void;
}) {
  const [draft, setDraft] = useState(initial);

  function patch(partial: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...partial }));
  }

  function patchFile(index: number, partial: Partial<Draft["files"][number]>) {
    setDraft((current) => ({
      ...current,
      files: current.files.map((file, fileIndex) =>
        fileIndex === index ? { ...file, ...partial } : file,
      ),
    }));
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(draft);
      }}
    >
      <label className="grid gap-2 text-sm">
        العنوان
        <input
          className={fieldClass}
          value={draft.title}
          maxLength={80}
          required
          onChange={(event) => patch({ title: event.target.value })}
        />
      </label>
      <label className="grid gap-2 text-sm">
        الوصف
        <textarea
          className={fieldClass}
          rows={3}
          maxLength={500}
          value={draft.summary}
          onChange={(event) => patch({ summary: event.target.value })}
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="grid gap-2 text-sm">
          اسم القلم
          <input
            className={fieldClass}
            value={draft.handle}
            maxLength={20}
            placeholder="guest"
            onChange={(event) => patch({ handle: event.target.value })}
          />
        </label>
        <label className="grid gap-2 text-sm">
          الرخصة
          <select
            className={fieldClass}
            value={draft.license}
            onChange={(event) => patch({ license: event.target.value })}
          >
            {LICENSES.map((license) => (
              <option key={license} value={license}>
                {license}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm">
          وسوم
          <input
            className={fieldClass}
            value={draft.tags}
            placeholder="ui, http"
            onChange={(event) => patch({ tags: event.target.value })}
          />
        </label>
      </div>
      <label className="grid gap-2 text-sm">
        ملاحظة النسخة
        <input
          className={fieldClass}
          value={draft.message}
          maxLength={140}
          placeholder="ماذا تغيّر؟"
          onChange={(event) => patch({ message: event.target.value })}
        />
      </label>
      <div className="grid gap-4">
        {draft.files.map((file, index) => (
          <fieldset key={index} className="grid gap-3 rounded-lg border border-line bg-surface p-4">
            <legend className="px-2 text-sm text-muted">ملف {index + 1}</legend>
            <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
              <input
                dir="ltr"
                className={`${fieldClass} font-mono`}
                value={file.filename}
                spellCheck={false}
                onChange={(event) => {
                  const filename = event.target.value;
                  const detected = langFromFilename(filename);
                  patchFile(index, detected ? { filename, language: detected } : { filename });
                }}
              />
              <select
                className={fieldClass}
                value={file.language}
                onChange={(event) => patchFile(index, { language: event.target.value as Lang })}
              >
                {LANGS.map((lang) => (
                  <option key={lang.id} value={lang.id}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              dir="ltr"
              spellCheck={false}
              className={`${fieldClass} min-h-64 font-mono text-sm leading-relaxed`}
              value={file.content}
              onChange={(event) => patchFile(index, { content: event.target.value })}
            />
            {draft.files.length > 1 ? (
              <Button
                variant="quiet"
                className="justify-self-start px-0"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    files: current.files.filter((_, fileIndex) => fileIndex !== index),
                  }))
                }
              >
                إزالة الملف
              </Button>
            ) : null}
          </fieldset>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="ghost"
          disabled={draft.files.length >= 6}
          onClick={() =>
            setDraft((current) => ({
              ...current,
              files: [
                ...current.files,
                { filename: `file-${current.files.length + 1}.txt`, language: "text", content: "" },
              ],
            }))
          }
        >
          إضافة ملف
        </Button>
        {allowSample ? (
          <Button variant="quiet" onClick={() => setDraft(SAMPLE_DRAFT)}>
            املأ مثالًا
          </Button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-accent">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "جارٍ الحفظ…" : submitLabel}
      </Button>
    </form>
  );
}
