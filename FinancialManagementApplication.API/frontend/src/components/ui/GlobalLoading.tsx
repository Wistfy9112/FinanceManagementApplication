import React, { useSyncExternalStore } from "react";

// Global busy counter — single source of truth chống spam click khi đang ghi DB.
// Dùng module singleton để mọi component (kể cả component定義 trong App.tsx)
// đều có thể trigger overlay mà không cần prop-drilling.

let busyCount = 0;
let busyMessage: string | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function subscribeGlobalBusy(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function getGlobalBusySnapshot(): number {
  return busyCount;
}

export function getGlobalBusyMessage(): string | null {
  return busyMessage;
}

export function isGlobalBusy(): boolean {
  return busyCount > 0;
}

function pushBusy(message?: string) {
  busyCount += 1;
  if (message) busyMessage = message;
  emit();
}

function popBusy() {
  busyCount = Math.max(0, busyCount - 1);
  if (busyCount === 0) busyMessage = null;
  emit();
}

/**
 * Chạy fn với overlay loading toàn màn hình.
 * Cho phép chạy chồng (counting) — dùng cho các tác vụ đọc (loadData).
 */
export async function runWithGlobalLoading<T>(
  fn: () => Promise<T>,
  message?: string
): Promise<T> {
  pushBusy(message);
  try {
    return await fn();
  } finally {
    popBusy();
  }
}

/**
 * Chạy fn với chế độ ĐỘC QUYỀN (exclusive):
 * - Nếu hệ thống đang bận (đang xử lý DB) thì bỏ qua lệnh mới → chống spam ghi đè.
 * - Trả về undefined khi bị chặn để caller có thể bỏ qua.
 * Increment diễn ra ĐỒNG BỘ nên double-click nhanh cũng chỉ 1 request đi qua.
 */
export async function runExclusiveGlobalLoading<T>(
  fn: () => Promise<T>,
  message?: string
): Promise<T | undefined> {
  if (busyCount > 0) {
    return undefined;
  }
  pushBusy(message);
  try {
    return await fn();
  } finally {
    popBusy();
  }
}

export function useGlobalBusy() {
  const count = useSyncExternalStore(subscribeGlobalBusy, getGlobalBusySnapshot);
  const message = useSyncExternalStore(
    subscribeGlobalBusy,
    getGlobalBusyMessage
  );
  return { isBusy: count > 0, busyCount: count, busyMessage: message };
}

function Spinner({ size = 44 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: "4px solid rgba(124,92,255,0.18)",
        borderTopColor: "#7C5CFF",
        animation: "global-loading-spin 0.8s linear infinite",
      }}
    />
  );
}

/**
 * Overlay chặn toàn màn hình khi đang xử lý.
 * - Chặn mọi click (pointer-events) → user không thể spam button.
 * - Hiển thị spinner + message để user biết hệ thống đang xử lý.
 */
export function GlobalLoadingOverlay({ message }: { message?: string }) {
  const { isBusy, busyMessage } = useGlobalBusy();
  if (!isBusy) return null;
  const text = message || busyMessage || "Đang xử lý, vui lòng đợi...";

  return (
    <div
      data-testid="global-loading"
      role="status"
      aria-live="polite"
      aria-label={text}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(5,6,10,0.62)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        cursor: "wait",
      }}
    >
      <style>{`@keyframes global-loading-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "14px",
          background: "#101522",
          border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: "16px",
          padding: "28px 36px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          minWidth: "260px",
          maxWidth: "90vw",
          textAlign: "center",
        }}
      >
        <Spinner />
        <div
          style={{
            fontWeight: 700,
            fontSize: "15px",
            color: "#F4F5FA",
            letterSpacing: "-0.01em",
          }}
        >
          {text}
        </div>
        <div style={{ fontSize: "12px", color: "#9AA4B5", lineHeight: 1.5 }}>
          Vui lòng không nhấn thêm hay tắt trang
        </div>
      </div>
    </div>
  );
}

/**
 * Nút bấm có sẵn trạng thái busy: tự disable + hiện spinner mini khi global busy.
 * Dùng để thay thế nhanh các nút ghi DB mà không cần sửa nhiều logic.
 */
export function BusyButton({
  children,
  disabled,
  loading,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  const { isBusy } = useGlobalBusy();
  const showLoading = loading ?? isBusy;
  return (
    <button {...rest} disabled={disabled || showLoading}>
      {showLoading ? (
        <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              width: "14px",
              height: "14px",
              border: "2px solid rgba(255,255,255,0.35)",
              borderTopColor: "#fff",
              borderRadius: "50%",
              animation: "global-loading-spin 0.6s linear infinite",
              display: "inline-block",
            }}
          />
          <span>Đang xử lý...</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}
