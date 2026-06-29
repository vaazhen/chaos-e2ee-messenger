import { PhotoIcon, DocIcon } from "./Icons";

export default function AttachmentMenu({ showAttachMenu, onClose, onPhotoClick, onDocClick, l }) {
  if (!showAttachMenu) return null;

  return (
    <div className="attach-menu" onClick={e => e.stopPropagation()}>
      <div className="attach-menu-item" onClick={() => { onClose(); onPhotoClick(); }}>
        <PhotoIcon />
        <span>{l ? l("Фото или видео", "Photo or video") : "Photo or video"}</span>
      </div>
      <div className="attach-menu-item" onClick={() => { onClose(); onDocClick(); }}>
        <DocIcon />
        <span>{l ? l("Документ", "Document") : "Document"}</span>
      </div>
    </div>
  );
}