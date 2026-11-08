import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/shell";

export const Route = createFileRoute("/workers")({
  component: WorkersPage,
});

const STEPS = [
  "نزّل الحزمة من الزر. بداخلها Worker واحد وملف schema لقاعدة D1.",
  "من لوحة Cloudflare أنشئ قاعدة D1 باسم rawi، ثم ضع معرفها مكان REPLACE_WITH_D1_DATABASE_ID في wrangler.toml.",
  "اربط القاعدة بالـ Worker تحت الاسم DB. الجداول تُنشأ وحدها عند أول زيارة، ويمكنك أيضًا تطبيق schema.sql.",
  "انشر بـ wrangler deploy، أو الصق محتوى src/index.js في محرّر الـ Worker في اللوحة.",
];

function WorkersPage() {
  return (
    <Shell>
      <p className="font-mono text-xs text-accent">CLOUDFLARE WORKERS</p>
      <h1 className="mt-2 text-3xl font-semibold">ارفع راوي على Workers</h1>
      <p className="mt-3 max-w-2xl text-muted">
        نفس المنتج: نشر، روابط خام، نجوم، وتفرّع. النسخة داخل الحزمة تخزّن في D1 وليس في قاعدة
        المعاينة، حتى تبقى بياناتك على حسابك في Cloudflare.
      </p>
      <a
        href="/rawi-cloudflare.zip"
        download
        className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-ink"
      >
        تنزيل rawi-cloudflare.zip
      </a>
      <ol className="mt-8 grid max-w-2xl gap-4">
        {STEPS.map((step, index) => (
          <li key={step} className="rounded-lg border border-line bg-surface p-4">
            <span className="font-mono text-xs text-accent">{index + 1}</span>
            <p className="mt-2">{step}</p>
          </li>
        ))}
      </ol>
    </Shell>
  );
}
