export default function ContextMenu({ ctx, ctxClosing: _ctxClosing, ctxMenuRef, onReact, onReply, onEdit, onCopy, onDelete, l }) {
  if (!ctx) return null;

  const handleReact = (emoji) => {
    onReact(ctx.msg, emoji);
  };

  return (
    <div ref={ctxMenuRef} className="ctx-menu product-menu" style={{ left: ctx.x, top: ctx.y }} onClick={e => e.stopPropagation()}>
      <div className="ctx-reactions">
        {["👍","❤️","😂","😮","😢","🔥"].map(em => (
          <button key={em} className="ctx-react" type="button" onClick={() => handleReact(em)}>{em}</button>
        ))}
      </div>
      <div className="menu-line" />
      {ctx.msg?._out && !ctx.msg?._temp && (ctx.msg?._text || ctx.msg?._img || ctx.msg?._voice) && (
        <button className="ctx-item" onClick={() => onEdit(ctx.msg)}>
          <span className="ci">✎</span>{l("Изменить", "Edit")}
        </button>
      )}
      <button className="ctx-item" onClick={() => onReply(ctx.msg)}>
        <span className="ci">↩</span>{l("Ответить", "Reply")}
      </button>
      {ctx.msg?._text && (
        <button className="ctx-item" onClick={() => onCopy(ctx.msg)}>
          <span className="ci">▣</span>{l("Копировать", "Copy")}
        </button>
      )}
      <div className="menu-line" />
      <button className="ctx-item danger" onClick={() => onDelete(ctx.msg)}>
        <span className="ci">♜</span>{l("Удалить", "Delete")}
      </button>
    </div>
  );
}