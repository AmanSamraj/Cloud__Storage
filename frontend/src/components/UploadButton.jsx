import { useRef } from 'react'
import Icon from './Icon'

function UploadButton({ onSelect, mobile = false }) {
  const inputRef = useRef(null)

  function handleChange(event) {
    const [file] = event.target.files || []
    if (file) onSelect(file)
    event.target.value = ''
  }

  return (
    <>
      <button className={mobile ? 'mobile-upload-button flex items-center gap-2 sm:hidden' : 'upload-button hidden items-center gap-2 sm:flex'} onClick={() => inputRef.current?.click()} type="button">
        <Icon name="upload" size={17} />
        Upload
      </button>
      <input accept=".pdf,.zip,.json,.doc,.docx,.xls,.xlsx,.gif,.jpg,.jpeg,.png,.webp,.csv,.txt" className="hidden" onChange={handleChange} ref={inputRef} type="file" />
    </>
  )
}

export default UploadButton
