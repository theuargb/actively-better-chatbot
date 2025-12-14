"use client";

import { useMemo } from "react";
import { cn } from "lib/utils";
import { Badge } from "ui/badge";
import { Separator } from "ui/separator";
import { Scale, Calendar, ExternalLink, FileText } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "ui/hover-card";

// Types for Semantyka Legal RAG API response
interface LegalDocumentContent {
  id: string;
  type: "text";
  text: string;
}

interface LegalDocumentAttributes {
  timestamp: number;
  folder: string;
  filename: string;
}

interface LegalDocumentResult {
  file_id: string;
  filename: string;
  score: number;
  attributes: LegalDocumentAttributes;
  content: LegalDocumentContent[];
}

interface SemantykaLegalRAGResponse {
  data: LegalDocumentResult[];
}

interface SemantykaLegalRAGResultProps {
  input: {
    url: string;
    method?: string;
  };
  output: {
    status: number;
    body: SemantykaLegalRAGResponse;
    ok: boolean;
  };
}

// Parse frontmatter from markdown text
function parseFrontmatter(text: string): {
  metadata: Record<string, any>;
  content: string;
} {
  const frontmatterMatch = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);

  if (!frontmatterMatch) {
    // Try parsing as JSON (for _metadata.json files)
    try {
      const jsonData = JSON.parse(text);
      return { metadata: jsonData, content: "" };
    } catch {
      return { metadata: {}, content: text };
    }
  }

  const frontmatterText = frontmatterMatch[1];
  const content = frontmatterMatch[2] || "";

  const metadata: Record<string, any> = {};
  frontmatterText.split("\n").forEach((line) => {
    const colonIndex = line.indexOf(":");
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      let value = line.slice(colonIndex + 1).trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      if (value === "None") {
        metadata[key] = null;
      } else {
        metadata[key] = value;
      }
    }
  });

  return { metadata, content };
}

// Format date from YYYYMMDD number or string
function formatDate(dateNum: number | string | null): string {
  if (!dateNum) return "";
  const str = String(dateNum);
  if (str.length !== 8) return str;
  const year = str.slice(0, 4);
  const month = str.slice(4, 6);
  const day = str.slice(6, 8);
  return `${day}.${month}.${year}`;
}

// Get status badge variant
function getStatusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status?.toLowerCase()) {
    case "active":
      return "default";
    case "inactive":
    case "repealed":
      return "destructive";
    default:
      return "secondary";
  }
}

// Parse result to extract metadata and content
function parseResult(result: LegalDocumentResult) {
  let mergedMetadata: Record<string, any> = {};
  const contentParts: string[] = [];

  for (const contentItem of result.content) {
    if (!contentItem?.text) continue;
    const parsed = parseFrontmatter(contentItem.text);
    mergedMetadata = { ...parsed.metadata, ...mergedMetadata };
    if (parsed.content?.trim()) {
      contentParts.push(parsed.content.trim());
    }
  }

  const docId =
    mergedMetadata.nreg ||
    mergedMetadata.doc_id ||
    result.filename.split("/")[1] ||
    "N/A";

  return {
    metadata: mergedMetadata,
    contentText: contentParts.join("\n\n"),
    docId,
    title: mergedMetadata.title || null,
    relevancePercent: Math.round(result.score * 100),
  };
}

export function SemantykaLegalRAGResult({
  input,
  output,
}: SemantykaLegalRAGResultProps) {
  const results = output.body?.data || [];

  // Extract query from URL
  const query = useMemo(() => {
    try {
      const url = new URL(input.url);
      return decodeURIComponent(url.searchParams.get("q") || "");
    } catch {
      return "";
    }
  }, [input.url]);

  if (!results.length) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Scale className="size-5 text-muted-foreground" />
          <span className="text-sm font-semibold">Пошук законодавства</span>
        </div>
        <div className="flex gap-2">
          <div className="px-2.5">
            <Separator
              orientation="vertical"
              className="bg-gradient-to-b from-border to-transparent from-80%"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            За запитом «{query}» не знайдено результатів
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Scale className="size-5 text-primary" />
        <span className="text-sm font-semibold">Пошук законодавства</span>
        <HoverCard openDelay={200} closeDelay={0}>
          <HoverCardTrigger asChild>
            <span className="hover:text-primary transition-colors text-xs text-muted-foreground cursor-pointer">
              {query && `«${query}»`}
            </span>
          </HoverCardTrigger>
          <HoverCardContent className="w-72">
            <div className="space-y-2">
              <p className="text-xs font-medium">Semantyka Legal RAG API</p>
              <p className="text-xs font-mono break-all text-muted-foreground">
                {input.url}
              </p>
            </div>
          </HoverCardContent>
        </HoverCard>
      </div>

      {/* Results */}
      <div className="flex gap-2">
        <div className="px-2.5">
          <Separator
            orientation="vertical"
            className="bg-gradient-to-b from-border to-transparent from-80%"
          />
        </div>
        <div className="flex flex-col gap-2 pb-2">
          {/* Compact pill results */}
          <div className="flex flex-wrap gap-1.5">
            {results.map((result) => {
              const { metadata, contentText, docId, title, relevancePercent } =
                parseResult(result);

              return (
                <HoverCard key={result.file_id} openDelay={200} closeDelay={0}>
                  <HoverCardTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "group rounded-full bg-secondary pl-1.5 pr-2.5 py-1 text-xs",
                        "flex items-center gap-1.5",
                        "hover:bg-input hover:ring hover:ring-primary/50 transition-all cursor-pointer",
                      )}
                    >
                      <div className="p-1 rounded-full bg-primary/10 text-primary">
                        <Scale className="size-2.5" />
                      </div>
                      <span className="truncate max-w-32 font-medium">
                        {docId}
                      </span>
                      {metadata.status && (
                        <Badge
                          variant={getStatusVariant(metadata.status)}
                          className="text-[10px] px-1 py-0 h-4"
                        >
                          {metadata.status}
                        </Badge>
                      )}
                      <span className="text-muted-foreground text-[10px]">
                        {relevancePercent}%
                      </span>
                    </button>
                  </HoverCardTrigger>

                  <HoverCardContent className="w-80 p-4">
                    {/* Document header */}
                    <div className="flex items-start gap-2 mb-3">
                      <div className="p-1.5 rounded-md bg-primary/10 text-primary shrink-0">
                        <Scale className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-medium">
                            {docId}
                          </span>
                          {metadata.status && (
                            <Badge
                              variant={getStatusVariant(metadata.status)}
                              className="text-xs px-1.5 py-0"
                            >
                              {metadata.status}
                            </Badge>
                          )}
                        </div>
                        {title && (
                          <p className="text-sm mt-1 line-clamp-2 text-foreground">
                            {title}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Content preview */}
                    {contentText && (
                      <div className="relative mb-3">
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent to-popover from-70%" />
                        <p className="text-xs text-muted-foreground max-h-32 overflow-y-auto leading-relaxed">
                          {contentText}
                        </p>
                      </div>
                    )}

                    {/* Metadata footer */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground pt-2 border-t">
                      {metadata.date_current_edition && (
                        <div className="flex items-center gap-1">
                          <Calendar className="size-3" />
                          <span>
                            {formatDate(metadata.date_current_edition)}
                          </span>
                        </div>
                      )}
                      {metadata.source && (
                        <div className="flex items-center gap-1">
                          <ExternalLink className="size-3" />
                          <span>{metadata.source}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 ml-auto">
                        <FileText className="size-3" />
                        <span>{relevancePercent}% match</span>
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              );
            })}
          </div>

          {/* Results count */}
          <p className="text-xs text-muted-foreground">
            Знайдено {results.length} документ(ів)
          </p>
        </div>
      </div>
    </div>
  );
}
