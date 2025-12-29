import { Modal } from "./Modal";
import { Button } from "./Button";

export function ConfirmDialog({
  open,
  title = "Confirm",
  message = "Are you sure?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  danger = false,
  onConfirm,
  onCancel,
  loading = false,
}) {
  return (
    <Modal open={open} title={title} onClose={onCancel}>
      <div style={{ display: "grid", gap: 14 }}>
        <div style={{ color: "#475569", fontWeight: 700, lineHeight: "20px" }}>
          {message}
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelText}
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Working..." : confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
