import Icon from './Icon'
import StarButton from './StarButton'

const folderColors = ['folder-coral', 'folder-yellow', 'folder-blue', 'folder-green']

function FolderCard({ folder, index, onOpen, onRename, onMove, onDelete, onShare }) {
  return (
    <div className="folder-card group">
      <div className="flex items-start justify-between">
        <div className={`folder-icon ${folderColors[index % folderColors.length]}`}><Icon name="folder" size={22} /></div>
        <div className="flex items-center gap-1">
          <StarButton isStarred={folder.is_starred || folder.isStarred} resourceId={folder.id} resourceType="folder" size={16} />
          <span className="rounded-md p-1.5 text-muted transition group-hover:bg-[#f0ece4]"><Icon name="more" size={17} /></span>
        </div>
      </div>
      <button className="mt-4 w-full text-left" onDoubleClick={() => onOpen(folder)} onClick={() => onOpen(folder)} type="button">
        <p className="truncate text-sm font-bold text-ink group-hover:text-coral">{folder.name}</p>
        <p className="mt-1 text-xs text-muted">Folder · {formatDate(folder.updated_at)}</p>
      </button>
      <div className="folder-actions mt-3 flex gap-1 border-t border-[#eee9e1] pt-3">
        <button onClick={() => onRename(folder)} type="button">Rename</button>
        <button onClick={() => onMove(folder)} type="button">Move</button>
        <button onClick={() => onShare(folder)} type="button">Share</button>
        <button className="folder-delete" onClick={() => onDelete(folder)} type="button">Delete</button>
      </div>
    </div>
  )
}

function FileCard({ file, onContextMenu }) {
  return (
    <div className="file-card group relative text-left" onContextMenu={(event) => onContextMenu(event, file)}>
      <div className="file-preview file-blue">
        <div className="file-paper">
          <div className="file-lines"><span /><span /><span /></div>
          <strong>{file.mime_type?.split('/').pop()?.toUpperCase() || 'FILE'}</strong>
        </div>
        <div className="absolute right-2 top-2 z-10">
          <StarButton isStarred={file.is_starred || file.isStarred} resourceId={file.id} resourceType="file" size={16} />
        </div>
      </div>
      <p className="mt-4 truncate text-sm font-bold text-ink">{file.name}</p>
      <p className="mt-1 text-xs text-muted">{formatType(file.mime_type)} · {formatBytes(file.size_bytes)}</p>
      <p className="mt-1 text-[11px] text-muted">Updated {formatDate(file.updated_at)}</p>
    </div>
  )
}

function FileList({ folders = [], files = [], view = 'grid', onOpen, onRename, onMove, onDelete, onShare, onFileContextMenu, onViewRecent }) {
  const hasItems = folders.length || files.length

  if (!hasItems) {
    return <div className="empty-state"><Icon name="folder" size={27} /><p className="mt-3 font-semibold text-ink">This folder is empty</p><p className="mt-1 text-sm text-muted">Create a folder to start organising your drive.</p></div>
  }

  if (view === 'list') {
    return (
      <div className="file-list">
        {[...folders.map((folder) => ({ ...folder, kind: 'Folder' })), ...files.map((file) => ({ ...file, kind: 'File' }))].map((item, index) => (
          <div className="file-list-row" key={item.id} onContextMenu={(event) => item.kind === 'File' && onFileContextMenu(event, item)}>
            <div className="flex shrink-0 items-center">
              <StarButton isStarred={item.is_starred || item.isStarred} resourceId={item.id} resourceType={item.kind.toLowerCase()} size={15} />
            </div>
            <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onDoubleClick={() => item.kind === 'Folder' && onOpen(item)} onClick={() => item.kind === 'Folder' && onOpen(item)} type="button">
              <div className={item.kind === 'Folder' ? `folder-icon compact ${folderColors[index % folderColors.length]}` : 'file-badge file-blue'}>{item.kind === 'Folder' ? <Icon name="folder" size={17} /> : 'FILE'}</div>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{item.name}</span>
              <span className="hidden text-xs text-muted sm:block">{item.kind === 'Folder' ? 'Folder' : `${formatType(item.mime_type)} · ${formatBytes(item.size_bytes)}`}</span>
            </button>
            <span className="hidden text-xs text-muted md:block">Updated {formatDate(item.updated_at)}</span>
            {item.kind === 'Folder' && <div className="flex gap-1"><button className="list-action" onClick={() => onRename(item)} type="button">Rename</button><button className="list-action" onClick={() => onMove(item)} type="button">Move</button><button className="list-action" onClick={() => onShare(item)} type="button">Share</button><button className="list-action list-delete" onClick={() => onDelete(item)} type="button">Delete</button></div>}
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      {folders.length > 0 && <div className="folder-grid">{folders.map((folder, index) => <FolderCard folder={folder} index={index} key={folder.id} onDelete={onDelete} onMove={onMove} onOpen={onOpen} onRename={onRename} onShare={onShare} />)}</div>}
      <div className="mt-10 flex items-center justify-between"><h2 className="font-display text-xl font-bold tracking-tight text-ink">Recent files</h2><button className="text-xs font-bold uppercase tracking-[0.15em] text-coral" onClick={onViewRecent} type="button">View all</button></div>
      {files.length > 0 ? <div className="file-grid mt-4">{files.map((file) => <FileCard file={file} key={file.id} onContextMenu={onFileContextMenu} />)}</div> : <p className="mt-4 text-sm text-muted">No files in this folder yet.</p>}
    </>
  )
}

function formatBytes(bytes = 0) {
  if (!bytes) return 'Empty file'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`
}

function formatType(mimeType = '') {
  if (!mimeType) return 'FILE'
  return mimeType.split('/').pop().split('.').pop().toUpperCase()
}

function formatDate(value) {
  if (!value) return 'unknown date'
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

export default FileList
