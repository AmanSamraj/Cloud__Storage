function FileContextMenu({ file, position, onClose, onDelete, onDownload, onMove, onRename, onPublicLink, onShare }) {
  return (
    <div className="file-context-menu" onMouseDown={(event) => event.stopPropagation()} style={{ left: position.x, top: position.y }}>
      <p className="context-file-name">{file.name}</p>
      <button onClick={() => { onDownload(file); onClose() }} type="button">Download</button>
      <button onClick={() => { onShare(file); onClose() }} type="button">Share</button>
      <button onClick={() => { onPublicLink(file); onClose() }} type="button">Public link</button>
      <button onClick={() => { onRename(file); onClose() }} type="button">Rename</button>
      <button onClick={() => { onMove(file); onClose() }} type="button">Move to folder</button>
      <button className="context-delete" onClick={() => { onDelete(file); onClose() }} type="button">Delete</button>
    </div>
  )
}

export default FileContextMenu
