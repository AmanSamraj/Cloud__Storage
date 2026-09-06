import { useEffect, useState } from 'react'
import { getCurrentUser, logout } from './api/auth'
import { createFolder, deleteFile, deleteFolder, getFileDownloadUrl, getFolderContents, getFolderTree, getRootContents, updateFile, updateFolder, uploadFile } from './api/folders'
import AuthPage from './components/AuthPage'
import { Breadcrumbs, ViewToggle } from './components/Breadcrumbs'
import FileList from './components/FileGrid'
import FileContextMenu from './components/FileContextMenu'
import FolderDialog from './components/FolderDialog'
import Icon from './components/Icon'
import MoveFolderDialog from './components/MoveFolderDialog'
import MoveFileDialog from './components/MoveFileDialog'
import PublicLinkModal from './components/PublicLinkModal'
import PublicSharePage from './components/PublicSharePage'
import RecentPage from './components/RecentPage'
import SearchResults from './components/SearchResults'
import ShareModal from './components/ShareModal'
import Sidebar from './components/Sidebar'
import StarredPage from './components/StarredPage'
import Topbar from './components/Topbar'
import TrashPage from './components/TrashPage'
import UploadButton from './components/UploadButton'

const rootContents = { folder: null, path: [{ id: null, name: 'My Drive' }], children: { folders: [], files: [] } }

function Dashboard({ onLogout, user }) {
  const [activeItem, setActiveItem] = useState('My Drive')
  const [currentFolderId, setCurrentFolderId] = useState(null)
  const [contents, setContents] = useState(rootContents)
  const [view, setView] = useState('grid')
  const [dialog, setDialog] = useState(null)
  const [fileMenu, setFileMenu] = useState(null)
  const [searchParams, setSearchParams] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function loadContents(folderId = currentFolderId) {
    setLoading(true)
    setError('')
    try {
      const result = folderId ? await getFolderContents(folderId) : await getRootContents()
      setContents(result)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadContents(currentFolderId) }, [currentFolderId])

  function openFolder(folder) { setCurrentFolderId(folder.id); setActiveItem('My Drive') }
  function navigateTo(folderId) { setCurrentFolderId(folderId); setActiveItem('My Drive') }

  async function handleCreate(name) {
    await createFolder(name, currentFolderId)
    await loadContents()
  }

  async function handleRename(name) {
    await updateFolder(dialog.folder.id, { name })
    await loadContents()
  }

  async function handleMove(parentId) {
    await updateFolder(dialog.folder.id, { parentId })
    await loadContents()
  }

  async function handleDelete(folder) {
    if (!window.confirm(`Delete "${folder.name}" and its nested folders?`)) return
    try {
      await deleteFolder(folder.id)
      await loadContents()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function handleUpload(file) {
    setUploading(true)
    setError('')
    try {
      await uploadFile(file, currentFolderId)
      await loadContents()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setUploading(false)
    }
  }

  async function openMoveDialog(folder) {
    try {
      const result = await getFolderTree()
      setDialog({ type: 'move', folder, folders: result.folders })
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function openFileMoveDialog(file) {
    try {
      const result = await getFolderTree()
      setDialog({ type: 'file-move', file, folders: result.folders })
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function handleFileRename(name) {
    await updateFile(dialog.file.id, { name })
    await loadContents()
  }

  async function handleFileMove(folderId) {
    await updateFile(dialog.file.id, { folderId })
    await loadContents()
  }

  async function handleFileDelete(file) {
    if (!window.confirm(`Move "${file.name}" to trash?`)) return
    try {
      await deleteFile(file.id)
      await loadContents()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function handleFileDownload(file) {
    try {
      const result = await getFileDownloadUrl(file.id)
      window.location.assign(result.url)
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  function openShare(resource, resourceType) {
    setDialog({ type: 'share', resource: { name: resource.name, resourceId: resource.id, resourceType } })
  }

  function openPublicLink(file) {
    setDialog({ type: 'public-link', resource: file })
  }

  function handleSidebarNavigate(item) {
    setActiveItem(item)
    if (item === 'My Drive') {
      setSearchParams(null)
      setCurrentFolderId(null)
    } else if (item === 'Starred') {
      setSearchParams(null)
    } else if (item === 'Recent') {
      setSearchParams(null)
    } else if (item === 'Trash') {
      setSearchParams(null)
    } else if (item === 'Shared' || item === 'Shared with me') {
      setSearchParams({ owner: 'shared' })
    }
  }

  function handleSelectSearchResult(item) {
    if (item.resourceType === 'folder') {
      setActiveItem('My Drive')
      setSearchParams(null)
      openFolder(item)
    } else if (item.resourceType === 'file') {
      handleFileDownload(item)
    }
  }

  return (
    <div className="app-shell" onClick={() => setFileMenu(null)}>
      <Sidebar activeItem={activeItem} onNavigate={handleSidebarNavigate} onNewFolder={() => setDialog({ type: 'create' })} />
      <div className="app-content">
        <Topbar
          onSelectResult={handleSelectSearchResult}
          onUpload={handleUpload}
          onViewAllResults={(p) => {
            setActiveItem('Search')
            setSearchParams(p)
          }}
          onLogout={onLogout}
          user={user}
        />
        <main className="dashboard-main px-5 pb-12 pt-7 sm:px-8 lg:px-10">
          <div className="mobile-nav mb-7 flex gap-2 overflow-x-auto lg:hidden">
            {['My Drive', 'Shared', 'Starred', 'Recent', 'Trash'].map((item) => (
              <button
                className={`mobile-nav-item ${
                  activeItem === item || (item === 'Shared' && activeItem === 'Shared with me')
                    ? 'mobile-nav-active'
                    : ''
                }`}
                key={item}
                onClick={() => handleSidebarNavigate(item === 'Shared' ? 'Shared with me' : item)}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>

          {activeItem === 'Trash' ? (
            <TrashPage
              onBackToDrive={() => {
                setActiveItem('My Drive')
                setSearchParams(null)
                loadContents(currentFolderId)
              }}
              onFolderRestored={() => {
                loadContents(currentFolderId)
              }}
            />
          ) : activeItem === 'Starred' ? (
            <StarredPage
              onBackToDrive={() => {
                setActiveItem('My Drive')
                setSearchParams(null)
                loadContents(currentFolderId)
              }}
              onDownloadFile={handleFileDownload}
              onFileContextMenu={(event, file) => {
                event.preventDefault()
                setFileMenu({ file, position: { x: event.clientX, y: event.clientY } })
              }}
              onOpenFolder={(folder) => {
                setActiveItem('My Drive')
                setSearchParams(null)
                openFolder(folder)
              }}
              onPublicLink={openPublicLink}
              onShare={openShare}
            />
          ) : activeItem === 'Recent' ? (
            <RecentPage
              onBackToDrive={() => {
                setActiveItem('My Drive')
                setSearchParams(null)
                loadContents(currentFolderId)
              }}
              onDownloadFile={handleFileDownload}
              onFileContextMenu={(event, file) => {
                event.preventDefault()
                setFileMenu({ file, position: { x: event.clientX, y: event.clientY } })
              }}
              onOpenFolder={(folder) => {
                setActiveItem('My Drive')
                setSearchParams(null)
                openFolder(folder)
              }}
              onPublicLink={openPublicLink}
              onShare={openShare}
            />
          ) : searchParams ? (
            <SearchResults
              initialParams={searchParams}
              onClose={() => {
                setActiveItem('My Drive')
                setSearchParams(null)
              }}
              onDownloadFile={handleFileDownload}
              onFileContextMenu={(event, file) => {
                event.preventDefault()
                setFileMenu({ file, position: { x: event.clientX, y: event.clientY } })
              }}
              onOpenFolder={(folder) => {
                setActiveItem('My Drive')
                setSearchParams(null)
                openFolder(folder)
              }}
              onPublicLink={openPublicLink}
              onShare={openShare}
            />
          ) : (
            <>
              <section className="dashboard-heading flex flex-wrap items-end justify-between gap-5">
                <div>
                  <Breadcrumbs items={contents.path} onNavigate={navigateTo} />
                  <div className="mt-7 flex items-end gap-4">
                    <div>
                      <p className="eyebrow">Sunday, September 06, 2026</p>
                      <h1 className="mt-2 font-display text-4xl font-bold tracking-[-0.04em] text-ink sm:text-5xl">
                        Good morning, {user?.display_name?.split(' ')[0] || 'Aman'}.
                      </h1>
                    </div>
                    <span className="hidden pb-1 text-3xl sm:block">&#9788;</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <UploadButton mobile onSelect={handleUpload} />
                  <ViewToggle onChange={setView} view={view} />
                </div>
              </section>

              {error && (
                <div className="error-banner mt-8">
                  <span>{error}</span>
                  <button onClick={() => loadContents()} type="button">
                    Retry
                  </button>
                </div>
              )}

              <section className="mt-12">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-xl font-bold tracking-tight text-ink">
                      {contents.folder?.name || 'Folders'}
                    </h2>
                    <p className="mt-1 text-sm text-muted">Keep your work beautifully organised.</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="hidden text-xs text-muted sm:block">
                      {uploading ? 'Uploading...' : ''}
                    </span>
                    <button
                      className="new-inline-button"
                      onClick={() => setDialog({ type: 'create' })}
                      type="button"
                    >
                      <Icon name="plus" size={15} /> New folder
                    </button>
                  </div>
                </div>
                {loading ? (
                  <div className="empty-state">
                    <p className="text-sm text-muted">Loading your folders...</p>
                  </div>
                ) : (
                  <FileList
                    files={contents.children.files}
                    folders={contents.children.folders}
                    onDelete={handleDelete}
                    onFileContextMenu={(event, file) => {
                      event.preventDefault()
                      setFileMenu({ file, position: { x: event.clientX, y: event.clientY } })
                    }}
                    onMove={openMoveDialog}
                    onOpen={openFolder}
                    onRename={(folder) => setDialog({ type: 'rename', folder })}
                    onShare={(folder) => openShare(folder, 'folder')}
                    view={view}
                  />
                )}
              </section>
            </>
          )}
        </main>
      </div>

      {dialog?.type === 'create' && <FolderDialog confirmLabel="Create folder" onClose={() => setDialog(null)} onSubmit={handleCreate} title="Create a new folder" />}
      {dialog?.type === 'rename' && <FolderDialog confirmLabel="Save name" initialName={dialog.folder.name} onClose={() => setDialog(null)} onSubmit={handleRename} title="Rename folder" />}
      {dialog?.type === 'move' && <MoveFolderDialog folders={dialog.folders} movingFolder={dialog.folder} onClose={() => setDialog(null)} onSubmit={handleMove} />}
      {dialog?.type === 'file-rename' && <FolderDialog confirmLabel="Save name" initialName={dialog.file.name} onClose={() => setDialog(null)} onSubmit={handleFileRename} title="Rename file" />}
      {dialog?.type === 'file-move' && <MoveFileDialog file={dialog.file} folders={dialog.folders} onClose={() => setDialog(null)} onSubmit={handleFileMove} />}
      {dialog?.type === 'share' && <ShareModal onClose={() => setDialog(null)} resource={dialog.resource} />}
      {dialog?.type === 'public-link' && <PublicLinkModal onClose={() => setDialog(null)} resource={dialog.resource} />}
      {fileMenu && <FileContextMenu file={fileMenu.file} onClose={() => setFileMenu(null)} onDelete={handleFileDelete} onDownload={handleFileDownload} onMove={openFileMoveDialog} onPublicLink={openPublicLink} onRename={(file) => setDialog({ type: 'file-rename', file })} onShare={(file) => openShare(file, 'file')} position={fileMenu.position} />}
    </div>
  )
}

function AuthenticatedApp() {
  const [user, setUser] = useState(undefined)

  useEffect(() => {
    getCurrentUser()
      .then(setUser)
      .catch(() => setUser(null))
  }, [])

  if (user === undefined) {
    return <div className="auth-loading">Loading your workspace...</div>
  }

  if (!user) {
    return <AuthPage onAuthenticated={setUser} />
  }

  return <Dashboard onLogout={() => logout().then(() => setUser(null))} user={user} />
}

function App() {
  const match = window.location.pathname.match(/^\/share\/([^/]+)$/)
  if (match) return <PublicSharePage token={match[1]} />
  return <AuthenticatedApp />
}

export default App
