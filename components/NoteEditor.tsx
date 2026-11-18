
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

// ============================================
// TYPES
// ============================================

type Category =
  | "Personal"
  | "Work"
  | "Ideas"
  | "Journal"
  | "To-do"
  | "Other";

interface Attachment {
  id: string;
  fileName: string;
  contentType: string;
  size: number;
  key: string;
  uploadedAt?: string;
}

interface UploadItem {
  id: string;
  name: string;
  progress: number;
  error?: string;
}

interface PendingFile {
  id: string;
  file: File;
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
}

interface Props {
  mode: "new" | "edit";
  initialNote?: Note;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  note?: T;
  notes?: Note[];
  uploadUrl?: string;
  fields?: Record<string, string>;
  key?: string;
  downloadUrl?: string;
  attachment?: Attachment;
  attachments?: Attachment[];
}

interface UploadUrlResult {
  uploadUrl: string;
  fields: Record<string, string>;
  key: string;
}

// ============================================
// CONSTANTS
// ============================================

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

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ACCEPT =
  ".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx";

const ALLOWED_EXT = ACCEPT.split(",").map((e) => e.slice(1));

const MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  pdf: "application/pdf",
  doc: "application/msword",
  docx:
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

const NOTES_API =
  "https://e0c8z9dp7l.execute-api.ap-south-1.amazonaws.com/dev";

// ============================================
// API REQUEST
// ============================================

async function notesRequest<T = unknown>(
  data: Record<string, unknown>,
): Promise<ApiResponse<T>> {
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

  if (!response.ok || !result?.success) {
    throw new Error(
      result?.message || "Notes request failed.",
    );
  }

  return result as ApiResponse<T>;
}

// ============================================
// FILE HELPERS
// ============================================

function fileExt(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function getContentType(file: File): string {
  const extension = fileExt(file.name);

  return MIME_TYPES[extension] || file.type;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ============================================
// CREATE NOTE
// ============================================

async function createNote(
  userId: string,
  draft: NoteDraft,
): Promise<Note> {
  const result = await notesRequest<Note>({
    action: "create",
    userId,
    ...draft,
    pinned: false,
  });

  if (!result.note?.id) {
    throw new Error("Note ID was not returned by the server.");
  }

  return result.note;
}

// ============================================
// UPDATE NOTE
// ============================================

async function updateNote(
  userId: string,
  id: string,
  draft: NoteDraft,
  pinned: boolean,
): Promise<void> {
  await notesRequest({
    action: "update",
    userId,
    id,
    ...draft,
    pinned,
  });
}

// ============================================
// DELETE NOTE
// ============================================

async function removeNote(
  userId: string,
  id: string,
): Promise<void> {
  await notesRequest({
    action: "delete",
    userId,
    id,
  });
}

// ============================================
// GENERATE S3 UPLOAD URL
// ============================================

async function requestUploadUrl(
  userId: string,
  noteId: string,
  file: File,
): Promise<UploadUrlResult> {
  const result = await notesRequest({
    action: "upload-url",
    userId,
    noteId,
    fileName: file.name,
    contentType: getContentType(file),
  });

  if (
    !result.uploadUrl ||
    !result.key ||
    !result.fields
  ) {
    throw new Error("Upload URL or fields missing from server.");
  }

  return {
    uploadUrl: result.uploadUrl,
    fields: result.fields,
    key: result.key,
  };
}

// ============================================
// UPLOAD FILE TO S3 USING PRESIGNED POST
// ============================================

function uploadToS3(
  uploadUrl: string,
  fields: Record<string, string>,
  file: File,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    const formData = new FormData();

    // Append all presigned fields first
    Object.entries(fields).forEach(([key, value]) => {
      formData.append(key, value);
    });

    // File must be appended last
    formData.append("file", file);

    xhr.open("POST", uploadUrl);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(
          Math.round((event.loaded / event.total) * 100),
        );
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(
          new Error(`S3 upload failed (${xhr.status}).`),
        );
      }
    };

    xhr.onerror = () => {
      reject(
        new Error("Upload failed. Check your connection or S3 CORS."),
      );
    };

    xhr.send(formData);
  });
}

// ============================================
// COMPLETE UPLOAD
// ============================================

async function completeUpload(
  userId: string,
  noteId: string,
  key: string,
  fileName: string,
): Promise<Attachment> {
  const result = await notesRequest({
    action: "complete-upload",
    userId,
    noteId,
    key,
    fileName,
  });

  if (!result.attachment) {
    throw new Error("Attachment metadata was not returned.");
  }

  return result.attachment;
}

// ============================================
// GET DOWNLOAD URL
// ============================================

async function fetchDownloadUrl(
  userId: string,
  noteId: string,
  attachmentId: string,
): Promise<string> {
  const result = await notesRequest({
    action: "get-download-url",
    userId,
    noteId,
    attachmentId,
  });

  if (!result.downloadUrl) {
    throw new Error("Download URL missing.");
  }

  return result.downloadUrl;
}

// ============================================
// DELETE ATTACHMENT
// ============================================

async function deleteAttachment(
  userId: string,
  noteId: string,
  attachmentId: string,
): Promise<void> {
  await notesRequest({
    action: "delete-attachment",
    userId,
    noteId,
    attachmentId,
  });
}

// ============================================
// ATTACHMENT ROW
// ============================================

interface AttachmentRowProps {
  attachment: Attachment;
  userId?: string;
  noteId: string;
  disabled: boolean;
  onRemove: () => void;
  onError: (message: string) => void;
}


function AttachmentRow({
  attachment,
  userId,
  noteId,
  disabled,
  onRemove,
  onError,
}: AttachmentRowProps) {
  const isImage = attachment.contentType.startsWith("image/");

  const [thumb, setThumb] = useState("");
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    if (!isImage || !userId || !noteId) return;

    let cancelled = false;

    fetchDownloadUrl(userId, noteId, attachment.id)
      .then((url) => {
        if (!cancelled) setThumb(url);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [isImage, userId, noteId, attachment.id]);

  async function openFile() {
    if (!userId || opening) return;

    setOpening(true);

    try {
      const url = thumb || await fetchDownloadUrl(
        userId,
        noteId,
        attachment.id
      );

      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      onError(
        err instanceof Error
          ? err.message
          : "Couldn't open this file."
      );
    } finally {
      setOpening(false);
    }
  }

  // Image preview card
  if (isImage) {
    return (
      <li className="group relative min-w-0 overflow-hidden rounded-2xl border border-border bg-surface">
        <button
          type="button"
          onClick={openFile}
          disabled={opening}
          aria-label="Open image attachment"
          className="block w-full text-left"
        >
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-accent-soft">
            {thumb ? (
              <img
                src={thumb}
                alt="Image attachment"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <ImageIcon className="h-8 w-8 text-ink-faint" />
              </div>
            )}

            {opening && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-sm text-white">
                Opening...
              </div>
            )}
          </div>
        </button>

        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          aria-label="Remove image"
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition hover:bg-red-500 disabled:opacity-40"
        >
          <X className="h-4 w-4" />
        </button>
      </li>
    );
  }

  // Document attachment
  return (
    <li className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
      <button
        type="button"
        onClick={openFile}
        disabled={opening}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-ink-soft">
          <FileText className="h-5 w-5" />
        </span>

        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-ink">
            {attachment.fileName}
          </span>
          <span className="text-xs text-ink-faint">
            {opening ? "Opening..." : formatSize(attachment.size)}
          </span>
        </span>
      </button>

      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label="Remove attachment"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-faint hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
      >
        <X className="h-4 w-4" />
      </button>
    </li>
  );
}


// ============================================
// NOTE EDITOR
// ============================================

export default function NoteEditor({
  mode,
  initialNote,
}: Props) {
  const router = useRouter();

  const user = useSelector((state: RootState) => state.user);

  const userId = user?.userId;

  // Form states
  const [title, setTitle] = useState(
    initialNote?.title || "",
  );

  const [content, setContent] = useState(
    initialNote?.content || "",
  );

  const [category, setCategory] = useState<Category>(
    initialNote?.category || "Personal",
  );

  const [attachments, setAttachments] = useState<Attachment[]>(
    initialNote?.attachments ?? [],
  );

  // Files waiting to be uploaded for a new note
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>(
    [],
  );

  // Active and failed uploads
  const [uploads, setUploads] = useState<UploadItem[]>([]);

  // A new note is created before its attachments are uploaded
  const [persistedNoteId, setPersistedNoteId] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const noteId =
    mode === "edit"
      ? initialNote?.id || ""
      : persistedNoteId;

  const activeUploads = uploads.filter(
    (upload) => !upload.error,
  ).length;

  const uploading = activeUploads > 0;

  const totalAttachments =
    attachments.length +
    pendingFiles.length +
    activeUploads;

  // ============================================
  // UPLOAD ONE FILE
  // ============================================

  async function uploadOne(
    file: File,
    targetNoteId: string,
  ): Promise<boolean> {
    const tempId = crypto.randomUUID();

    setUploads((list) => [
      ...list,
      {
        id: tempId,
        name: file.name,
        progress: 0,
      },
    ]);

    try {
      // 1. Get presigned POST URL
      const { uploadUrl, fields, key } =
        await requestUploadUrl(
          String(userId),
          targetNoteId,
          file,
        );

      // 2. Upload file directly to S3
      await uploadToS3(
        uploadUrl,
        fields,
        file,
        (progress) => {
          setUploads((list) =>
            list.map((upload) =>
              upload.id === tempId
                ? { ...upload, progress }
                : upload,
            ),
          );
        },
      );

      // 3. Register attachment in DynamoDB
      const attachment = await completeUpload(
        String(userId),
        targetNoteId,
        key,
        file.name,
      );

      setAttachments((list) => [
        ...list,
        attachment,
      ]);

      setUploads((list) =>
        list.filter((upload) => upload.id !== tempId),
      );

      return true;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Upload failed.";

      setUploads((list) =>
        list.map((upload) =>
          upload.id === tempId
            ? {
                ...upload,
                error: message,
              }
            : upload,
        ),
      );

      return false;
    }
  }

  // ============================================
  // HANDLE FILE SELECTION
  // ============================================

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;

    if (!userId) {
      setError("Please sign in to attach files.");
      return;
    }

    setError("");

    let slots =
      MAX_FILES -
      attachments.length -
      pendingFiles.length -
      activeUploads;

    const problems: string[] = [];
    const accepted: File[] = [];

    for (const file of Array.from(fileList)) {
      if (slots <= 0) {
        problems.push(
          `Only ${MAX_FILES} files fit in one note.`,
        );
        break;
      }

      if (!ALLOWED_EXT.includes(fileExt(file.name))) {
        problems.push(
          `${file.name}: this file type isn't supported.`,
        );
        continue;
      }

      if (file.size === 0) {
        problems.push(`${file.name}: empty files aren't allowed.`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        problems.push(
          `${file.name}: larger than 10 MB.`,
        );
        continue;
      }

      accepted.push(file);
      slots -= 1;
    }

    if (problems.length > 0) {
      setError(problems.join(" "));
    }

    if (accepted.length === 0) return;

    // New note: stage files until the note has been created
    if (mode === "new" && !noteId) {
      const staged = accepted.map((file) => ({
        id: crypto.randomUUID(),
        file,
      }));

      setPendingFiles((list) => [
        ...list,
        ...staged,
      ]);

      return;
    }

    // Existing note: upload immediately
    for (const file of accepted) {
      await uploadOne(file, noteId);
    }
  }

  // ============================================
  // SAVE NOTE
  // ============================================

  async function saveNote() {
    if (!title.trim() && !content.trim()) return;

    if (!userId) {
      setError("Please sign in to save your notes.");
      return;
    }

    if (uploading || loading) {
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
    };

    try {
      let targetNoteId = noteId;

      if (mode === "new" && !targetNoteId) {
        // 1. Create note first
        const createdNote = await createNote(
          String(userId),
          draft,
        );

        targetNoteId = createdNote.id;

        setPersistedNoteId(targetNoteId);
      } else if (targetNoteId) {
        // Update existing or previously created note
        await updateNote(
          String(userId),
          targetNoteId,
          draft,
          initialNote?.pinned ?? false,
        );
      }

      // 2. Upload pending files after note creation
      if (pendingFiles.length > 0) {
        const filesToUpload = [...pendingFiles];

        for (const pending of filesToUpload) {
          const success = await uploadOne(
            pending.file,
            targetNoteId,
          );

          if (!success) {
            throw new Error(
              `Could not upload ${pending.file.name}. You can retry by saving again.`,
            );
          }

          setPendingFiles((list) =>
            list.filter((item) => item.id !== pending.id),
          );
        }
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Save note error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  }

  // ============================================
  // REMOVE ATTACHMENT
  // ============================================

  async function handleRemoveAttachment(
    attachmentId: string,
  ) {
    if (!userId || !noteId || loading) return;

    const confirmed = window.confirm(
      "Are you sure you want to remove this attachment?",
    );

    if (!confirmed) return;

    setError("");

    try {
      await deleteAttachment(
        String(userId),
        noteId,
        attachmentId,
      );

      setAttachments((list) =>
        list.filter((item) => item.id !== attachmentId),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not remove attachment.",
      );
    }
  }

  // ============================================
  // DELETE NOTE
  // ============================================

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
        err instanceof Error
          ? err.message
          : "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  }

  // ============================================
  // REMOVE PENDING FILE
  // ============================================

  function removePendingFile(id: string) {
    setPendingFiles((list) =>
      list.filter((item) => item.id !== id),
    );
  }

  // ============================================
  // GO BACK
  // ============================================

  function goBack() {
    const originalAttachments = (
      initialNote?.attachments ?? []
    )
      .map((attachment) => attachment.key)
      .join();

    const currentAttachments = attachments
      .map((attachment) => attachment.key)
      .join();

    const hasChanges =
      title !== (initialNote?.title || "") ||
      content !== (initialNote?.content || "") ||
      category !== (initialNote?.category || "Personal") ||
      currentAttachments !== originalAttachments ||
      pendingFiles.length > 0;

    if (hasChanges) {
      if (!window.confirm("Discard your changes?")) return;
    }

    router.push("/");
  }

  // ============================================
  // UI
  // ============================================

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
              (!title.trim() &&
                !content.trim() &&
                pendingFiles.length === 0)
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
            Last edited{" "}
            {new Date(
              initialNote.updatedAt,
            ).toLocaleString()}
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

        {/* ATTACHMENTS */}

        <div className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[11px] uppercase text-ink-faint">
              Attachments
              {totalAttachments > 0 &&
                ` (${totalAttachments}/${MAX_FILES})`}
            </span>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={
                loading ||
                !userId ||
                totalAttachments >= MAX_FILES
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
            JPG, PNG, WebP, GIF, PDF, DOC or DOCX. Up to{" "}
            {MAX_FILES} files, 10 MB each.
          </p>

          {(attachments.length > 0 ||
            pendingFiles.length > 0 ||
            uploads.length > 0) && (
<ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">              {/* SAVED ATTACHMENTS */}

              {attachments.map((attachment) => (
                <AttachmentRow
                  key={attachment.id}
                  attachment={attachment}
                  userId={
                    userId ? String(userId) : undefined
                  }
                  noteId={noteId}
                  disabled={loading}
                  onRemove={() =>
                    handleRemoveAttachment(attachment.id)
                  }
                  onError={setError}
                />
              ))}

              {/* FILES WAITING TO UPLOAD */}

              {pendingFiles.map((pending) => (
                <li
                  key={pending.id}
                  className="flex items-center gap-3 rounded-card border-theme border-border bg-surface p-3"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-ink-soft">
                    {pending.file.type.startsWith("image/") ? (
                      <ImageIcon className="h-5 w-5" />
                    ) : (
                      <FileIcon className="h-5 w-5" />
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium text-ink">
                      {pending.file.name}
                    </span>

                    <span className="block text-[11px] text-ink-faint">
                      Ready to upload ·{" "}
                      {formatSize(pending.file.size)}
                    </span>
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      removePendingFile(pending.id)
                    }
                    disabled={loading}
                    aria-label={`Remove ${pending.file.name}`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-faint hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}

              {/* UPLOAD PROGRESS */}

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
                            list.filter(
                              (item) => item.id !== upload.id,
                            ),
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
                        style={{
                          width: `${upload.progress}%`,
                        }}
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

        {error && (
          <p className="mt-3 text-sm text-red-600">
            {error}
          </p>
        )}

        {loading && (
          <p className="mt-3 text-sm text-ink-soft">
            Please wait...
          </p>
        )}
      </div>
    </div>
  );
}
