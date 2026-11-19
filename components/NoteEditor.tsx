"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import type { RootState } from "@/app/store/store";

import {
  EditorContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  Node as TiptapNode,
  mergeAttributes,
  useEditor,
} from "@tiptap/react";
import type { Editor, NodeViewProps } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "tiptap-markdown";

import {
  ArrowLeft,
  Bold,
  Check,
  Copy,
  Eye,
  EyeOff,
  File as FileIcon,
  FileText,
  ChevronDown,
  Heading,
  Highlighter,
  Image as ImageIcon,
  List,
  ListOrdered,
  Paperclip,
  Pencil,
  Redo2,
  Trash2,
  Undo2,
  X,
} from "lucide-react";

// ============================================
// TYPES
// ============================================

type Category = "Personal" | "Work" | "Ideas" | "Journal" | "To-do" | "Other";

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

const ACCEPT = ".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx";

const ALLOWED_EXT = ACCEPT.split(",").map((e) => e.slice(1));

const MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

const NOTES_API = "https://e0c8z9dp7l.execute-api.ap-south-1.amazonaws.com/dev";

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
        typeof result.body === "string" ? JSON.parse(result.body) : result.body;
    }
  } catch {
    console.error("Invalid API response:", responseText);
    throw new Error("Invalid server response.");
  }

  if (!response.ok || !result?.success) {
    throw new Error(result?.message || "Notes request failed.");
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

async function createNote(userId: string, draft: NoteDraft): Promise<Note> {
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

async function removeNote(userId: string, id: string): Promise<void> {
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

  if (!result.uploadUrl || !result.key || !result.fields) {
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
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`S3 upload failed (${xhr.status}).`));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Upload failed. Check your connection or S3 CORS."));
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
// CREDENTIAL HELPERS
// ============================================

const CREDENTIAL_PATTERN =
  /^\s*(user\s*id|username|user\s*name|login|email|password|passcode|api\s*key|access\s*key|secret|token|access\s*token|refresh\s*token|client\s*id|client\s*secret|account\s*id|pin)\s*[:=]\s*(.+?)\s*$/i;

const SENSITIVE_LABEL = /password|passcode|secret|token|key|pin/i;

interface CredentialData {
  label: string;
  value: string;
}

function parseCredential(line: string): CredentialData | null {
  const match = line.match(CREDENTIAL_PATTERN);

  if (!match) return null;

  return { label: match[1], value: match[2] };
}

// Turns top-level paragraphs like "Password: abc" into credential cards.
function convertCredentialLines(editor: Editor) {
  const { state, view } = editor;
  const credentialType = state.schema.nodes.credential;

  if (!credentialType) return;

  const tr = state.tr;
  let changed = false;

  state.doc.descendants((node, pos) => {
    if (node.type.name !== "paragraph") return false;

    // Only top-level paragraphs can become cards (not list items)
    if (state.doc.resolve(pos).parent.type.name !== "doc") return false;

    const credential = parseCredential(node.textContent);

    if (credential) {
      tr.replaceWith(
        tr.mapping.map(pos),
        tr.mapping.map(pos + node.nodeSize),
        credentialType.create(credential),
      );
      changed = true;
    }

    return false;
  });

  if (changed) {
    tr.setMeta("addToHistory", false);
    tr.setMeta("preventUpdate", true);
    view.dispatch(tr);
  }
}

// ============================================
// MARKDOWN HELPERS
// ============================================

function getMarkdown(editor: Editor): string {
  return (editor.storage as any).markdown.getMarkdown().trim();
}

const LIST_LINE = /^\s*([-*]|\d+[.)])\s+/;

// Older notes used one line per block. Convert them so each line stays its
// own paragraph, keep lists tight, and protect credential values from being
// read as markdown (for example "pa_ss_word").
function legacyToMarkdown(text: string): string {
  const lines = text
    .split("\n")
    .map((line) => line.replace(/\s+$/, ""))
    .filter((line) => line.trim() !== "");

  let output = "";

  lines.forEach((line, index) => {
    let current = line;

    const credential = parseCredential(line);

    if (credential) {
      const escaped = credential.value.replace(/([\\`*_~[\]<>&|])/g, "\\$1");
      current = `${credential.label}: ${escaped}`;
    }

    if (index > 0) {
      const previous = lines[index - 1];
      const bothList = LIST_LINE.test(previous) && LIST_LINE.test(line);
      output += bothList ? "\n" : "\n\n";
    }

    output += current;
  });

  return output;
}

// ============================================
// CREDENTIAL CARD (EDITOR NODE)
// ============================================

function CredentialView({ node, editor, getPos }: NodeViewProps) {
  const { label, value } = node.attrs as CredentialData;

  const sensitive = SENSITIVE_LABEL.test(label);

  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyValue() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard permission may be unavailable.
    }
  }

  // Turn the card back into a normal line so it can be edited
  function editLine() {
    const pos = getPos();

    if (typeof pos !== "number") return;

    editor
      .chain()
      .focus()
      .insertContentAt(
        { from: pos, to: pos + node.nodeSize },
        {
          type: "paragraph",
          content: [{ type: "text", text: `${label}: ${value}` }],
        },
      )
      .run();
  }

  return (
    <NodeViewWrapper contentEditable={false} className="my-2">
      <div className="rounded-xl border border-border bg-surface p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
            {label}
          </span>

          <div className="flex items-center gap-1">
            {sensitive && (
              <button
                type="button"
                onClick={() => setVisible((state) => !state)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft hover:bg-accent-soft"
                aria-label={visible ? "Hide value" : "Reveal value"}>
                {visible ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            )}

            <button
              type="button"
              onClick={copyValue}
              className="flex h-8 items-center gap-1 rounded-lg px-2 text-xs text-ink-soft hover:bg-accent-soft">
              <Copy className="h-3.5 w-3.5" />
              {copied ? "Copied" : "Copy"}
            </button>

            <button
              type="button"
              onClick={editLine}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft hover:bg-accent-soft"
              aria-label="Edit line">
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="break-all font-mono text-sm text-ink">
          {sensitive && !visible
            ? "•".repeat(Math.min(value.length, 18))
            : value}
        </div>
      </div>
    </NodeViewWrapper>
  );
}

const Credential = TiptapNode.create({
  name: "credential",
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,
  priority: 1000,

  addAttributes() {
    return {
      label: { default: "" },
      value: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-credential]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-credential": "" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CredentialView);
  },

  // Saved back to the database as a plain "Label: value" line
  addStorage() {
    return {
      markdown: {
        serialize(state: any, node: any) {
          state.write(`${node.attrs.label}: ${node.attrs.value}`);
          state.closeBlock(node);
        },
        parse: {},
      },
    };
  },

  // Pressing Enter after "Password: abc" turns that line into a card
  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const { selection } = editor.state;
        const { $from, empty } = selection;

        if (
          !empty ||
          $from.depth !== 1 ||
          $from.parent.type.name !== "paragraph"
        ) {
          return false;
        }

        const credential = parseCredential($from.parent.textContent);

        if (!credential) return false;

        return editor
          .chain()
          .insertContentAt({ from: $from.before(), to: $from.after() }, [
            { type: "credential", attrs: credential },
            { type: "paragraph" },
          ])
          .run();
      },
    };
  },
});

// ============================================
// EDITOR STYLES
// ============================================

const EDITOR_CLASS = [
  "min-h-[300px] w-full text-[15px] leading-7 text-ink outline-none break-words",
  "[&_p]:my-1",
  "[&_h1]:mt-3 [&_h1]:mb-1 [&_h1]:text-2xl [&_h1]:font-bold",
  "[&_h2]:mt-3 [&_h2]:mb-1 [&_h2]:text-xl [&_h2]:font-bold",
  "[&_h3]:mt-2 [&_h3]:mb-1 [&_h3]:text-lg [&_h3]:font-semibold",
  "[&_h4]:mt-2 [&_h4]:mb-1 [&_h4]:text-base [&_h4]:font-semibold",
  "[&_h5]:mt-2 [&_h5]:mb-1 [&_h5]:text-sm [&_h5]:font-semibold",
  "[&_h6]:mt-2 [&_h6]:mb-1 [&_h6]:text-xs [&_h6]:font-semibold [&_h6]:uppercase [&_h6]:tracking-wider",
  "[&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-6",
  "[&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-6",
  "[&_li>p]:my-0",
  "[&_strong]:font-semibold",
  "[&_a]:break-all [&_a]:text-blue-500 [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-blue-600",
  "[&_mark]:rounded [&_mark]:bg-yellow-200 [&_mark]:px-1 [&_mark]:text-yellow-950",
  "dark:[&_mark]:bg-yellow-500/30 dark:[&_mark]:text-yellow-100",
  "[&_p.is-editor-empty:first-child::before]:pointer-events-none",
  "[&_p.is-editor-empty:first-child::before]:float-left",
  "[&_p.is-editor-empty:first-child::before]:h-0",
  "[&_p.is-editor-empty:first-child::before]:whitespace-pre-line",
  "[&_p.is-editor-empty:first-child::before]:text-ink-faint/60",
  "[&_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
].join(" ");

const EDITOR_PLACEHOLDER = `Start writing...

## Heading   - Bullet   1. Step
**Bold**   ==Highlight==
Password: your-password`;

// ============================================
// TOOLBAR BUTTON
// ============================================

interface ToolButtonProps {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function ToolButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: ToolButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      // Keep the cursor in the editor when tapping toolbar buttons
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition disabled:opacity-30 ${
        active
          ? "bg-ink text-canvas"
          : "text-ink-soft hover:bg-accent-soft"
      }`}>
      {children}
    </button>
  );
}

// ============================================
// HEADING MENU (H1 - H6)
// ============================================

const HEADING_LEVELS = [1, 2, 3, 4, 5, 6] as const;

const HEADING_SIZES: Record<number, string> = {
  1: "text-2xl font-bold",
  2: "text-xl font-bold",
  3: "text-lg font-semibold",
  4: "text-base font-semibold",
  5: "text-sm font-semibold",
  6: "text-xs font-semibold uppercase tracking-wider",
};

function HeadingMenu({
  editor,
  disabled,
}: {
  editor: Editor | null;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const currentLevel = HEADING_LEVELS.find((level) =>
    editor?.isActive("heading", { level }),
  );

  useEffect(() => {
    if (!open) return;

    function close() {
      setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }

    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [open]);

  function toggleMenu() {
    if (open) {
      setOpen(false);
      return;
    }

    const rect = buttonRef.current?.getBoundingClientRect();

    if (rect) {
      // Fixed position so the toolbar's scroll area can't clip the menu
      setPosition({
        top: rect.bottom + 6,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - 216)),
      });
    }

    setOpen(true);
  }

  function chooseLevel(level: (typeof HEADING_LEVELS)[number]) {
    editor?.chain().focus().toggleHeading({ level }).run();
    setOpen(false);
  }

  function chooseNormal() {
    editor?.chain().focus().setParagraph().run();
    setOpen(false);
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label="Heading level"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Heading"
        disabled={disabled}
        onMouseDown={(event) => event.preventDefault()}
        onClick={toggleMenu}
        className={`flex h-8 shrink-0 items-center gap-0.5 rounded-lg px-1.5 transition disabled:opacity-30 ${
          currentLevel
            ? "bg-ink text-canvas"
            : "text-ink-soft hover:bg-accent-soft"
        }`}>
        <Heading className="h-4 w-4" />

        {currentLevel && (
          <span className="text-[11px] font-semibold">H{currentLevel}</span>
        )}

        <ChevronDown className="h-3 w-3" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-[90]"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setOpen(false)}
          />

          <div
            role="menu"
            style={{ top: position.top, left: position.left }}
            className="fixed z-[91] w-52 rounded-xl border border-border bg-canvas p-1 shadow-xl">
            <button
              type="button"
              role="menuitem"
              onMouseDown={(event) => event.preventDefault()}
              onClick={chooseNormal}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-ink hover:bg-accent-soft">
              Normal text
              {!currentLevel && <Check className="h-4 w-4 text-ink-soft" />}
            </button>

            {HEADING_LEVELS.map((level) => (
              <button
                key={level}
                type="button"
                role="menuitem"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => chooseLevel(level)}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-left text-ink hover:bg-accent-soft">
                <span className={HEADING_SIZES[level]}>Heading {level}</span>

                {currentLevel === level && (
                  <Check className="h-4 w-4 shrink-0 text-ink-soft" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}

// ============================================
// CONFIRM DIALOG
// ============================================

interface ConfirmState {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
}

interface ConfirmDialogProps {
  state: ConfirmState;
  onCancel: () => void;
  onConfirm: () => void;
}

function ConfirmDialog({ state, onCancel, onConfirm }: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center"
      onClick={onCancel}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-border bg-canvas p-5 shadow-2xl">
        <h2 id="confirm-title" className="text-lg font-semibold text-ink">
          {state.title}
        </h2>

        <p id="confirm-message" className="mt-1.5 text-sm text-ink-soft">
          {state.message}
        </p>

        <div className="mt-5 flex gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="h-11 flex-1 rounded-control border border-border text-sm font-medium text-ink hover:bg-accent-soft">
            {state.cancelLabel ?? "Cancel"}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className={`h-11 flex-1 rounded-control text-sm font-medium ${
              state.danger
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-ink text-canvas hover:opacity-90"
            }`}>
            {state.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
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
  const [previewOpen, setPreviewOpen] = useState(false);

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

  // Close preview using Escape key
  useEffect(() => {
    if (!previewOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPreviewOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [previewOpen]);

  async function openFile() {
    if (!userId || opening) return;

    if (isImage) {
      if (thumb) {
        setPreviewOpen(true);
        return;
      }
    }

    setOpening(true);

    try {
      const url =
        thumb || (await fetchDownloadUrl(userId, noteId, attachment.id));

      if (isImage) {
        setThumb(url);
        setPreviewOpen(true);
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : "Couldn't open this file.");
    } finally {
      setOpening(false);
    }
  }

  return (
    <>
      {/* IMAGE ATTACHMENT */}
      {isImage ? (
        <li className="group relative min-w-0 overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-all duration-300 hover:shadow-md">
          <button
            type="button"
            onClick={openFile}
            disabled={opening}
            aria-label="Preview image"
            className="block w-full text-left">
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-accent-soft">
              {thumb ? (
                <img
                  src={thumb}
                  alt={attachment.fileName}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-ink-faint" />
                </div>
              )}

              {/* Preview overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all duration-300 group-hover:bg-black/25">
                <span className="scale-90 rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium text-white opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:scale-100 group-hover:opacity-100">
                  View image
                </span>
              </div>

              {opening && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-sm text-white">
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
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition hover:bg-red-500 disabled:opacity-40">
            <X className="h-4 w-4" />
          </button>
        </li>
      ) : (
        /* DOCUMENT ATTACHMENT */
        <li className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
          <button
            type="button"
            onClick={openFile}
            disabled={opening}
            className="flex min-w-0 flex-1 items-center gap-3 text-left">
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
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-faint hover:bg-red-50 hover:text-red-500 disabled:opacity-40">
            <X className="h-4 w-4" />
          </button>
        </li>
      )}

      {/* FULL SCREEN IMAGE PREVIEW */}
      {previewOpen && thumb && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-3 backdrop-blur-md sm:p-6"
          onClick={() => setPreviewOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Image preview">
          {/* Close button */}
          <button
            type="button"
            onClick={() => setPreviewOpen(false)}
            aria-label="Close image preview"
            className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white shadow-lg backdrop-blur-xl transition hover:rotate-90 hover:bg-white/20">
            <X className="h-5 w-5" />
          </button>

          {/* Image */}
          <img
            src={thumb}
            alt={attachment.fileName}
            onClick={(event) => event.stopPropagation()}
            className="max-h-[92dvh] max-w-full rounded-lg object-contain shadow-2xl"
          />

          {/* Image filename */}
          <div className="absolute bottom-5 left-1/2 max-w-[85vw] -translate-x-1/2 truncate rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs text-white/80 backdrop-blur-xl">
            {attachment.fileName}
          </div>
        </div>
      )}
    </>
  );
}

// ============================================
// NOTE EDITOR
// ============================================

export default function NoteEditor({ mode, initialNote }: Props) {
  const router = useRouter();

  const user = useSelector((state: RootState) => state.user);

  const userId = user?.userId;

  // Form states
  const [title, setTitle] = useState(initialNote?.title || "");

  // Markdown text of the note. The editor keeps this in sync as you type.
  const [content, setContent] = useState(initialNote?.content || "");

  const [contentDirty, setContentDirty] = useState(false);

  const [category, setCategory] = useState<Category>(
    initialNote?.category || "Personal",
  );

  const [attachments, setAttachments] = useState<Attachment[]>(
    initialNote?.attachments ?? [],
  );

  // Files waiting to be uploaded for a new note
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);

  // Active and failed uploads
  const [uploads, setUploads] = useState<UploadItem[]>([]);

  // A new note is created before its attachments are uploaded
  const [persistedNoteId, setPersistedNoteId] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // In-app confirmation dialog (replaces window.confirm)
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  const noteId = mode === "edit" ? initialNote?.id || "" : persistedNoteId;

  const activeUploads = uploads.filter((upload) => !upload.error).length;

  const uploading = activeUploads > 0;

  const totalAttachments =
    attachments.length + pendingFiles.length + activeUploads;

  // ============================================
  // RICH TEXT EDITOR (TIPTAP)
  // ============================================

  const editor = useEditor({
    immediatelyRender: false,

    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
        codeBlock: false,
        code: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Highlight,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          target: "_blank",
          rel: "noopener noreferrer nofollow",
        },
      }),
      Placeholder.configure({ placeholder: EDITOR_PLACEHOLDER }),
      Credential,
      Markdown.configure({
        html: false,
        tightLists: true,
        bulletListMarker: "-",
        linkify: true,
        breaks: false,
        transformPastedText: true,
        transformCopiedText: false,
      }),
    ],

    content: legacyToMarkdown(initialNote?.content || ""),

    editorProps: {
      attributes: {
        class: EDITOR_CLASS,
        spellcheck: "true",
      },

      // Ctrl/Cmd + click opens a link
      handleClick(_view, _pos, event) {
        const anchor = (event.target as HTMLElement).closest("a");

        if (anchor && (event.metaKey || event.ctrlKey)) {
          window.open(anchor.href, "_blank", "noopener,noreferrer");
          return true;
        }

        return false;
      },
    },

    onCreate({ editor }) {
      convertCredentialLines(editor);
    },

    onUpdate({ editor }) {
      setContent(getMarkdown(editor));
      setContentDirty(true);
    },

    onBlur({ editor }) {
      convertCredentialLines(editor);
    },
  });

  // Lock the editor while saving
  useEffect(() => {
    editor?.setEditable(!loading);
  }, [editor, loading]);

  function currentMarkdown(): string {
    if (!editor) return content.trim();

    convertCredentialLines(editor);

    return getMarkdown(editor);
  }

  // ============================================
  // UPLOAD ONE FILE
  // ============================================

  async function uploadOne(file: File, targetNoteId: string): Promise<boolean> {
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
      const { uploadUrl, fields, key } = await requestUploadUrl(
        String(userId),
        targetNoteId,
        file,
      );

      // 2. Upload file directly to S3
      await uploadToS3(uploadUrl, fields, file, (progress) => {
        setUploads((list) =>
          list.map((upload) =>
            upload.id === tempId ? { ...upload, progress } : upload,
          ),
        );
      });

      // 3. Register attachment in DynamoDB
      const attachment = await completeUpload(
        String(userId),
        targetNoteId,
        key,
        file.name,
      );

      setAttachments((list) => [...list, attachment]);

      setUploads((list) => list.filter((upload) => upload.id !== tempId));

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed.";

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
      MAX_FILES - attachments.length - pendingFiles.length - activeUploads;

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

      if (file.size === 0) {
        problems.push(`${file.name}: empty files aren't allowed.`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        problems.push(`${file.name}: larger than 10 MB.`);
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

      setPendingFiles((list) => [...list, ...staged]);

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
    const markdown = currentMarkdown();

    if (!title.trim() && !markdown && pendingFiles.length === 0) return;

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
      content: markdown,
      category,
    };

    try {
      let targetNoteId = noteId;

      if (mode === "new" && !targetNoteId) {
        // 1. Create note first
        const createdNote = await createNote(String(userId), draft);

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
          const success = await uploadOne(pending.file, targetNoteId);

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

      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  // ============================================
  // REMOVE ATTACHMENT
  // ============================================

  async function handleRemoveAttachment(attachmentId: string) {
    if (!userId || !noteId || loading) return;

    setConfirm({
      title: "Remove attachment?",
      message: "This file will be deleted from your note.",
      confirmLabel: "Remove",
      danger: true,
      onConfirm: async () => {
        setError("");

        try {
          await deleteAttachment(String(userId), noteId, attachmentId);

          setAttachments((list) =>
            list.filter((item) => item.id !== attachmentId),
          );
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Could not remove attachment.",
          );
        }
      },
    });
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

    const noteToDelete = initialNote.id;

    setConfirm({
      title: "Delete this note?",
      message: "This can't be undone. Its attachments will be removed too.",
      confirmLabel: "Delete note",
      danger: true,
      onConfirm: async () => {
        setLoading(true);
        setError("");

        try {
          await removeNote(String(userId), noteToDelete);

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
      },
    });
  }

  // ============================================
  // REMOVE PENDING FILE
  // ============================================

  function removePendingFile(id: string) {
    setPendingFiles((list) => list.filter((item) => item.id !== id));
  }

  // ============================================
  // GO BACK
  // ============================================

  function goBack() {
    const originalAttachments = (initialNote?.attachments ?? [])
      .map((attachment) => attachment.key)
      .join();

    const currentAttachments = attachments
      .map((attachment) => attachment.key)
      .join();

    const hasChanges =
      title !== (initialNote?.title || "") ||
      contentDirty ||
      category !== (initialNote?.category || "Personal") ||
      currentAttachments !== originalAttachments ||
      pendingFiles.length > 0;

    if (hasChanges) {
      setConfirm({
        title: "Discard your changes?",
        message: "Anything you've written or attached since the last save will be lost.",
        confirmLabel: "Discard",
        cancelLabel: "Keep editing",
        danger: true,
        onConfirm: () => router.push("/"),
      });

      return;
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
          aria-label="Go back"
          className="flex h-10 w-10 items-center justify-center rounded-control text-ink hover:bg-accent-soft">
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
              aria-label="Delete note"
              className="flex h-10 w-10 items-center justify-center rounded-control text-red-500 hover:bg-red-50 disabled:opacity-40">
              <Trash2 className="h-[18px] w-[18px]" />
            </button>
          )}

          <button
            onClick={saveNote}
            aria-label="Save note"
            disabled={
              loading ||
              uploading ||
              !userId ||
              (!title.trim() && !content.trim() && pendingFiles.length === 0)
            }
            className="flex h-10 w-10 items-center justify-center rounded-control bg-ink text-canvas disabled:opacity-40">
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
              }`}>
              <span
                className={`h-1.5 w-1.5 rounded-full ${CATEGORY_COLORS[cat]}`}
              />
              {cat}
            </button>
          ))}
        </div>

        {/* RICH TEXT EDITOR */}
        <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-surface">
          {/* TOOLBAR */}
          <div className="flex items-center justify-between gap-2 border-b border-border px-2 py-1.5">
            <div className="no-scrollbar flex items-center gap-0.5 overflow-x-auto">
              <HeadingMenu editor={editor} disabled={!editor || loading} />

              <ToolButton
                label="Bold"
                active={editor?.isActive("bold")}
                disabled={!editor || loading}
                onClick={() => editor?.chain().focus().toggleBold().run()}>
                <Bold className="h-4 w-4" />
              </ToolButton>

              <ToolButton
                label="Highlight"
                active={editor?.isActive("highlight")}
                disabled={!editor || loading}
                onClick={() => editor?.chain().focus().toggleHighlight().run()}>
                <Highlighter className="h-4 w-4" />
              </ToolButton>

              <ToolButton
                label="Bullet list"
                active={editor?.isActive("bulletList")}
                disabled={!editor || loading}
                onClick={() =>
                  editor?.chain().focus().toggleBulletList().run()
                }>
                <List className="h-4 w-4" />
              </ToolButton>

              <ToolButton
                label="Numbered list"
                active={editor?.isActive("orderedList")}
                disabled={!editor || loading}
                onClick={() =>
                  editor?.chain().focus().toggleOrderedList().run()
                }>
                <ListOrdered className="h-4 w-4" />
              </ToolButton>

              <span className="mx-1 h-5 w-px shrink-0 bg-border" />

              <ToolButton
                label="Undo"
                disabled={!editor || loading || !editor.can().undo()}
                onClick={() => editor?.chain().focus().undo().run()}>
                <Undo2 className="h-4 w-4" />
              </ToolButton>

              <ToolButton
                label="Redo"
                disabled={!editor || loading || !editor.can().redo()}
                onClick={() => editor?.chain().focus().redo().run()}>
                <Redo2 className="h-4 w-4" />
              </ToolButton>
            </div>

            <span className="hidden shrink-0 text-[10px] font-medium uppercase tracking-wider text-ink-faint sm:block">
              Auto-format on
            </span>
          </div>

          {/* EDITOR */}
          <div className="p-4">
            <EditorContent editor={editor} />
          </div>
        </div>

        {/* ATTACHMENTS */}

        <div className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[11px] uppercase text-ink-faint">
              Attachments
              {totalAttachments > 0 && ` (${totalAttachments}/${MAX_FILES})`}
            </span>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || !userId || totalAttachments >= MAX_FILES}
              className="flex h-9 items-center gap-1.5 rounded-control border-theme border-border px-3 text-[13px] font-medium text-ink-soft hover:bg-accent-soft disabled:opacity-40">
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
            JPG, PNG, WebP, GIF, PDF, DOC or DOCX. Up to {MAX_FILES} files, 10
            MB each.
          </p>

          {(attachments.length > 0 ||
            pendingFiles.length > 0 ||
            uploads.length > 0) && (
            <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {/* SAVED ATTACHMENTS */}
              {attachments.map((attachment) => (
                <AttachmentRow
                  key={attachment.id}
                  attachment={attachment}
                  userId={userId ? String(userId) : undefined}
                  noteId={noteId}
                  disabled={loading}
                  onRemove={() => handleRemoveAttachment(attachment.id)}
                  onError={setError}
                />
              ))}

              {/* FILES WAITING TO UPLOAD */}
              {pendingFiles.map((pending) => (
                <li
                  key={pending.id}
                  className="flex items-center gap-3 rounded-card border-theme border-border bg-surface p-3">
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
                      Ready to upload · {formatSize(pending.file.size)}
                    </span>
                  </span>

                  <button
                    type="button"
                    onClick={() => removePendingFile(pending.id)}
                    disabled={loading}
                    aria-label={`Remove ${pending.file.name}`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-faint hover:bg-red-50 hover:text-red-500 disabled:opacity-40">
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}

              {/* UPLOAD PROGRESS */}
              {uploads.map((upload) => (
                <li
                  key={upload.id}
                  className="rounded-card border-theme border-border bg-surface p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-[13.5px] text-ink">
                      {upload.name}
                    </span>

                    {upload.error ? (
                      <button
                        type="button"
                        onClick={() =>
                          setUploads((list) =>
                            list.filter((item) => item.id !== upload.id),
                          )
                        }
                        className="shrink-0 text-xs font-medium text-ink underline">
                        Dismiss
                      </button>
                    ) : (
                      <span className="shrink-0 font-mono text-[11px] text-ink-faint">
                        {upload.progress}%
                      </span>
                    )}
                  </div>

                  {upload.error ? (
                    <p className="mt-1 text-xs text-red-600">{upload.error}</p>
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

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        {loading && (
          <p className="mt-3 text-sm text-ink-soft">Please wait...</p>
        )}
      </div>

      {confirm && (
        <ConfirmDialog
          state={confirm}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            const action = confirm.onConfirm;

            setConfirm(null);
            void action();
          }}
        />
      )}
     </div>
  );
}