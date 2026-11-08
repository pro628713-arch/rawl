import { tokenizeLine, tokenClass } from "@/lib/highlight";

export function CodeView({ content, language }: { content: string; language: string }) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  return (
    <div dir="ltr" className="overflow-x-auto bg-bg">
      <table className="w-full border-collapse font-mono text-sm leading-relaxed">
        <tbody>
          {lines.map((line, index) => (
            <tr key={index}>
              <td className="w-12 select-none border-l-2 border-accent px-3 text-end align-top text-muted tabular-nums">
                {index + 1}
              </td>
              <td className="whitespace-pre pe-4 text-fg">
                {line.length === 0
                  ? " "
                  : tokenizeLine(line, language).map((token, tokenIndex) => (
                      <span key={tokenIndex} className={tokenClass(token.t)}>
                        {token.v}
                      </span>
                    ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
