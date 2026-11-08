import { createFileRoute } from "@tanstack/react-router";
import { mimeFor, rawHeaders } from "@/lib/raw-mime";

export const Route = createFileRoute("/raw/$slug/$file")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { readRaw } = await import("@/lib/scripts.server");
        let filename = params.file;
        try {
          filename = decodeURIComponent(params.file);
        } catch {
          filename = params.file;
        }
        const file = await readRaw(params.slug, filename);
        if (!file) return new Response("not found\n", { status: 404 });
        return new Response(file.content, {
          headers: rawHeaders(mimeFor(file.language), file.siblings),
        });
      },
    },
  },
});
