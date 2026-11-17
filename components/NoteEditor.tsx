"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import type { RootState } from "@/app/store/store";
import {
  ArrowLeft,
  Check,
  File as FileIcon,
  FileText,
  Image as ImageIcon,
  Paperclip,
  Trash2,
  X,
} from "lucide-react";

type Category =
  | "Personal"
  | "Work"
  | "Ideas"
  | "Journal"
  | "To-do"
  | "Other";

interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  key: string; // S3 object key
}

interface UploadItem {
  id: string;
  name: string;
  progress: number;
  error?: string;
}

interface Note {
  id: string;
  userId?: string;
  title: string;
  content: string;
  category: Category;
  pinned: boolean;
  attachments?: Attachment[];
  createdAt: string;
  updatedAt: string;
}

interface NoteDraft {
  title: string;
  content: string;
  category: Category;
  attachments: Attachment[];
}

interface Props {
  mode: "new" | "edit";
  initialNote?: Note;
}interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  note?: T;
  notes?: Note[];
  deleted?: { id: string };
  uploadUrl?: string;
  url?: string;
  key?: string;
}

const CATEGORIES: Category[] = [
  "Personal",
  "Work",
  "Ideas",
  "Journal",
  "To-do",
  "Other",
];

const CATEGORY_COLORS: Record<Category, string> = {
  Personal: "bg-blue-400",
  Work: "bg-purple-400",
  Ideas: "bg-amber-400",
  Journal: "bg-pink-400",
  "To-do": "bg-green-400",
  Other: "bg-gray-400",
};

// ---- Attachment limits ----
const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ACCEPT =
  ".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip";

const ALLOWED_EXT = ACCEPT.split(",").map((e) => e.slice(1));

const NOTES_API =
  "https://e0c8z9dp7l.execute-api.ap-south-1.amazonaws.com/dev";

// ============================================
// API REQUEST - ALL OPERATIONS USE POST
// ============================================

async function notesRequest<T = unknown>(
  data: Record<string, unknown>,
): Promise<ApiResponse<T>> {
  console.log("Notes API request:", data);

  const response = await fetch(NOTES_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
    cache: "no-store",
  });

  const responseText = await response.text();

  let result: any;

  try {
    result = JSON.parse(responseText);

    // Handle nested Lambda/API Gateway response
    if (result?.body !== undefined) {
      result =
        typeof result.body === "string"
          ? JSON.parse(result.body)
          : result.body;
    }
  } catch {
    console.error("Invalid API response:", responseText);
    throw new Error("Invalid server response.");
  }

  console.log("Notes API response:", result);

  if (!response.ok || !result?.success) {
    throw new Error(result?.message || "Notes request failed.");
  }

  return result as ApiResponse<T>;
}

// ============================================
// ATTACHMENT HELPERS (S3 via pre-signed URLs)
// ============================================

function fileExt(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function requestUploadUrl(userId: string, file: File) {
  const result = await notesRequest({
    action: "getUploadUrl",
    userId,
    fileName: file.name,
    fileType: file.type || "application/octet-stream",
    fileSize: file.size,
  });

  if (!result.uploadUrl || !result.key) {
    throw new Error("Upload URL missing from server response.");
  }

  return { uploadUrl: result.uploadUrl, key: result.key };
}

function putFile(
  url: string,
  file: File,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("PUT", url);
    xhr.setRequestHeader(
      "Content-Type",
      file.type || "application/octet-stream",
    );

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Upload failed (${xhr.status}).`));

    xhr.onerror = () =>
      reject(new Error("Upload failed. Check your connection."));

    xhr.send(file);
  });
}

async function fetchDownloadUrl(userId: string, key: string) {
  const result = await notesRequest({
    action: "getDownloadUrl",
    userId,
    key,
  });

  if (!result.url) throw new Error("Download URL missing.");

  return result.url;
}

// ============================================
// ATTACHMENT ROW
// ============================================

interface AttachmentRowProps {
  attachment: Attachment;
  userId?: string;
  disabled: boolean;
  onRemove: () => void;
  onError: (message: string) => void;
}

function AttachmentRow({
  attachment,
  userId,
  disabled,
  onRemove,
  onError,
}: AttachmentRowProps) {
  const isImage = attachment.type.startsWith("image/");
  const isPdfOrDoc =
    attachment.type === "application/pdf" ||
    attachment.type.startsWith("text/") ||
    /word|sheet|presentation|excel|powerpoint/.test(attachment.type);

  const [thumb, setThumb] = useState("");
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    if (!isImage || !userId) return;

    let cancelled = false;

    fetchDownloadUrl(userId, attachment.key)
      .then((url) => {
        if (!cancelled) setThumb(url);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [isImage, userId, attachment.key]);

  async function openFile() {
    if (!userId || opening) return;

    setOpening(true);

    try {
      const url = await fetchDownloadUrl(userId, attachment.key);

      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      onError(
        err instanceof Error ? err.message : "Couldn't open this file.",
      );
    } finally {
      setOpening(false);
    }
  }

  return (
    <li className="flex items-center gap-3 rounded-card border-theme border-border bg-surface p-2">
      <button
        type="button"
        onClick={openFile}
        disabled={opening}
        aria-label={`Open ${attachment.name}`}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-accent-soft text-ink-soft">
          {isImage && thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumb}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : isImage ? (
            <ImageIcon className="h-5 w-5" />
          ) : isPdfOrDoc ? (
            <FileText className="h-5 w-5" />
          ) : (
            <FileIcon className="h-5 w-5" />
          )}
        </span>

        <span className="min-w-0">
          <span className="block truncate text-[13.5px] font-medium text-ink">
            {attachment.name}
          </span>
          <span className="block font-mono text-[11px] uppercase text-ink-faint">
            {opening ? "Opening..." : formatSize(attachment.size)}
          </span>
        </span>
      </button>

      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label={`Remove ${attachment.name}`}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-faint hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
      >
        <X className="h-4 w-4" />
      </button>
    </li>
  );
}

// ============================================
// CREATE NOTE (API)
// ============================================

async function createNote(userId: string, draft: NoteDraft): Promise<void> {
  await notesRequest<Note>({
    action: "create",
    userId,
    ...draft,
    pinned: false,
  });
}

// ============================================
// UPDATE NOTE (API)
// ============================================

async function updateNote(
  userId: string,
  id: string,
  draft: NoteDraft,
  pinned: boolean,
): Promise<void> {
  await notesRequest<Note>({
    action: "update",
    userId,
    id,
    ...draft,
    pinned,
  });
}

// ============================================
// DELETE NOTE (API)
// ============================================

async function removeNote(userId: string, id: string): Promise<void> {
  await notesRequest({
    action: "delete",
    userId,
    id,
  });
}

// ============================================
// NOTE EDITOR (full-page create / edit)
// Notes list lives in NoteCard.tsx (API based)
// ============================================

export default function NoteEditor({ mode, initialNote }: Props) {
  const router = useRouter();

  // Redux user
  const user = useSelector((state: RootState) => state.user);

  const userId = user?.userId;

  // Form states
  const [title, setTitle] = useState(initialNote?.title || "");

  const [content, setContent] = useState(initialNote?.content || "");

  const [category, setCategory] = useState<Category>(
    initialNote?.category || "Personal",
  );

  const [attachments, setAttachments] = useState<Attachment[]>(
    initialNote?.attachments ?? [],
  );
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const activeUploads = uploads.filter((u) => !u.error).length;
  const uploading = activeUploads > 0;

  // ATTACHMENTS
  async function uploadOne(file: File) {
    const tempId = crypto.randomUUID();

    setUploads((list) => [
      ...list,
      { id: tempId, name: file.name, progress: 0 },
    ]);

    try {
      const { uploadUrl, key } = await requestUploadUrl(
        String(userId),
        file,
      );

      await putFile(uploadUrl, file, (progress) =>
        setUploads((list) =>
          list.map((u) => (u.id === tempId ? { ...u, progress } : u)),
        ),
      );

      setAttachments((list) => [
        ...list,
        {
          id: crypto.randomUUID(),
          name: file.name,
          type: file.type || "application/octet-stream",
          size: file.size,
          key,
        },
      ]);

      setUploads((list) => list.filter((u) => u.id !== tempId));
    } catch (err) {
      setUploads((list) =>
        list.map((u) =>
          u.id === tempId
            ? {
                ...u,
                error:
                  err instanceof Error ? err.message : "Upload failed.",
              }
            : u,
        ),
      );
    }
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;

    if (!userId) {
      setError("Please sign in to attach files.");
      return;
    }

    setError("");

    let slots = MAX_FILES - attachments.length - activeUploads;
    const problems: string[] = [];
    const accepted: File[] = [];

    for (const file of Array.from(fileList)) {
      if (slots <= 0) {
        problems.push(`Only ${MAX_FILES} files fit in one note.`);
        break;
      }

      if (!ALLOWED_EXT.includes(fileExt(file.name))) {
        problems.push(`${file.name}: this file type isn't supported.`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        problems.push(`${file.name}: larger than 10 MB.`);
        continue;
      }

      accepted.push(file);
      slots -= 1;
    }

    if (problems.length > 0) setError(problems.join(" "));

    await Promise.all(accepted.map(uploadOne));
  }

  // CREATE / UPDATE NOTE
  async function saveNote() {
    if (!title.trim() && !content.trim()) return;

    if (!userId) {
      setError("Please sign in to save your notes.");
      return;
    }

    if (uploading) {
      setError("Wait for your files to finish uploading.");
      return;
    }

    if (mode === "edit" && !initialNote?.id) {
      setError("Note ID is missing.");
      return;
    }

    setLoading(true);
    setError("");

    const draft: NoteDraft = {
      title: title.trim() || "Untitled note",
      content: content.trim(),
      category,
      attachments,
    };

    try {
      if (mode === "new") {
        await createNote(
          String(userId),
          draft,
        );
      } else {
        await updateNote(
          String(userId),
          initialNote!.id,
          draft,
          initialNote!.pinned ?? false,
        );
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Save note error:", err);

      setError(
        err instanceof Error ? err.message : "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  }

  // DELETE NOTE
  async function deleteNote() {
    if (!initialNote?.id || loading) return;

    if (!userId) {
      setError("Please sign in to delete notes.");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this note?",
    );

    if (!confirmed) return;

    setLoading(true);
    setError("");

    try {
      await removeNote(
        String(userId),
        initialNote.id,
      );

      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Delete note error:", err);

      setError(
        err instanceof Error ? err.message : "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  }

  // GO BACK
  function goBack() {
    if (
      title !== (initialNote?.title || "") ||
      content !== (initialNote?.content || "") ||
      category !== (initialNote?.category || "Personal") ||
      attachments.map((a) => a.key).join() !==
        (initialNote?.attachments ?? []).map((a) => a.key).join()
    ) {
      if (!window.confirm("Discard your changes?")) return;
    }

    router.push("/");
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b-theme border-border bg-canvas px-3 py-2.5">
        <button
          onClick={goBack}
          disabled={loading}
          className="flex h-10 w-10 items-center justify-center rounded-control text-ink hover:bg-accent-soft"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <span className="text-[13px] font-medium text-ink-soft">
          {mode === "edit" ? "Edit note" : "New note"}
        </span>

        <div className="flex items-center gap-1">
          {mode === "edit" && (
            <button
              onClick={deleteNote}
              disabled={loading}
              className="flex h-10 w-10 items-center justify-center rounded-control text-red-500 hover:bg-red-50 disabled:opacity-40"
            >
              <Trash2 className="h-[18px] w-[18px]" />
            </button>
          )}

          <button
            onClick={saveNote}
            disabled={
              loading ||
              uploading ||
              !userId ||
              (!title.trim() && !content.trim())
            }
            className="flex h-10 w-10 items-center justify-center rounded-control bg-ink text-canvas disabled:opacity-40"
          >
            <Check className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 flex-col px-5 pb-8 pt-5">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          autoFocus={mode === "new"}
          disabled={loading}
          className="w-full bg-transparent font-display text-[26px] font-semibold text-ink placeholder:text-ink-faint/60 focus:outline-none"
        />

        {initialNote && (
          <p className="mt-1.5 font-mono text-[11px] uppercase text-ink-faint">
            Last edited {new Date(initialNote.updatedAt).toLocaleString()}
          </p>
        )}

        <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              disabled={loading}
              onClick={() => setCategory(cat)}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-control border-theme px-3.5 py-1.5 text-[13px] font-medium ${
                category === cat
                  ? "border-transparent bg-cat-journal text-on-accent"
                  : "border-border text-ink-soft hover:bg-accent-soft"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${CATEGORY_COLORS[cat]}`}
              />
              {cat}
            </button>
          ))}
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Start writing..."
          disabled={loading}
          className="mt-5 w-full flex-1 resize-none bg-transparent text-[16px] leading-relaxed text-ink placeholder:text-ink-faint/60 focus:outline-none"
          rows={12}
        />

        {/* Attachments */}
        <div className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[11px] uppercase text-ink-faint">
              Attachments
              {attachments.length > 0 &&
                ` (${attachments.length}/${MAX_FILES})`}
            </span>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={
                loading ||
                !userId ||
                attachments.length + activeUploads >= MAX_FILES
              }
              className="flex h-9 items-center gap-1.5 rounded-control border-theme border-border px-3 text-[13px] font-medium text-ink-soft hover:bg-accent-soft disabled:opacity-40"
            >
              <Paperclip className="h-4 w-4" />
              Attach files
            </button>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => {
                handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          <p className="mt-1 text-xs text-ink-faint">
            Images, PDF, Word, Excel, PowerPoint, text, CSV or ZIP. Up to{" "}
            {MAX_FILES} files, 10 MB each.
          </p>

          {(attachments.length > 0 || uploads.length > 0) && (
            <ul className="mt-3 grid gap-2">
              {attachments.map((attachment) => (
                <AttachmentRow
                  key={attachment.id}
                  attachment={attachment}
                  userId={userId ? String(userId) : undefined}
                  disabled={loading}
                  onRemove={() =>
                    setAttachments((list) =>
                      list.filter((a) => a.id !== attachment.id),
                    )
                  }
                  onError={setError}
                />
              ))}

              {uploads.map((upload) => (
                <li
                  key={upload.id}
                  className="rounded-card border-theme border-border bg-surface p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-[13.5px] text-ink">
                      {upload.name}
                    </span>

                    {upload.error ? (
                      <button
                        type="button"
                        onClick={() =>
                          setUploads((list) =>
                            list.filter((u) => u.id !== upload.id),
                          )
                        }
                        className="shrink-0 text-xs font-medium text-ink underline"
                      >
                        Dismiss
                      </button>
                    ) : (
                      <span className="shrink-0 font-mono text-[11px] text-ink-faint">
                        {upload.progress}%
                      </span>
                    )}
                  </div>

                  {upload.error ? (
                    <p className="mt-1 text-xs text-red-600">
                      {upload.error}
                    </p>
                  ) : (
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-accent-soft">
                      <div
                        className="h-full rounded-full bg-ink transition-all"
                        style={{ width: `${upload.progress}%` }}
                      />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {!userId && (
          <p className="mt-3 text-sm text-ink-soft">
            Sign in to save notes. Notes are stored in your account.
          </p>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        {loading && (
          <p className="mt-3 text-sm text-ink-soft">Please wait...</p>
        )}
      </div>
    </div>
  );
}