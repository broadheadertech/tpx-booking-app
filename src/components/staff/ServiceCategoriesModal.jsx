import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import Modal from '../common/Modal'
import { Plus, Trash2, Tag, Eye, EyeOff } from 'lucide-react'

/**
 * Super-admin / IT-admin manager for the configurable service category list.
 * Adding/removing here changes the dropdown staff see when creating a service.
 */
const ServiceCategoriesModal = ({ isOpen, onClose }) => {
  const { user } = useCurrentUser()
  const categories = useQuery(api.services.serviceCategories.listServiceCategories, { include_inactive: true }) || []
  const addCategory = useMutation(api.services.serviceCategories.addServiceCategory)
  const setActive = useMutation(api.services.serviceCategories.setServiceCategoryActive)
  const removeCategory = useMutation(api.services.serviceCategories.removeServiceCategory)

  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const handleAdd = async () => {
    if (!newName.trim() || !user?._id) return
    setBusy(true); setError('')
    try {
      await addCategory({ name: newName.trim(), actor_id: user._id })
      setNewName('')
    } catch (e) {
      setError(e?.message || 'Failed to add category')
    } finally {
      setBusy(false)
    }
  }

  const handleToggle = async (c) => {
    try { await setActive({ id: c._id, is_active: !c.is_active, actor_id: user._id }) }
    catch (e) { setError(e?.message || 'Error') }
  }

  const handleRemove = async (c) => {
    if (!window.confirm(`Remove category "${c.name}"? Services already using it keep their value, but it won't appear in the dropdown.`)) return
    try { await removeCategory({ id: c._id, actor_id: user._id }) }
    catch (e) { setError(e?.message || 'Error') }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Service Categories" size="md" variant="dark">
      <div className="space-y-4">
        <p className="text-sm text-gray-400">
          The categories staff can assign to services. Changes here update the category dropdown everywhere.
        </p>

        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="New category name"
            className="flex-1 bg-[#0D0D0D] border border-[#333] rounded-lg px-3 py-2 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-[var(--color-primary)]"
          />
          <button
            onClick={handleAdd}
            disabled={busy || !newName.trim()}
            className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium disabled:opacity-50 flex items-center gap-1"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2 text-red-300 text-sm">{error}</div>
        )}

        <div className="rounded-lg border border-[#333] divide-y divide-[#333] max-h-80 overflow-y-auto">
          {categories.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">No categories yet. Add one above.</div>
          ) : (
            categories.map((c) => (
              <div key={c._id} className={`flex items-center justify-between px-4 py-2.5 ${c.is_active ? '' : 'opacity-50'}`}>
                <div className="flex items-center gap-2 min-w-0">
                  <Tag className="w-4 h-4 text-[var(--color-primary)] flex-shrink-0" />
                  <span className="text-white text-sm truncate">{c.name}</span>
                  {!c.is_active && <span className="text-[10px] text-gray-500">(hidden)</span>}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => handleToggle(c)} title={c.is_active ? 'Hide from dropdown' : 'Show in dropdown'} className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-[#252525]">
                    {c.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button onClick={() => handleRemove(c)} title="Delete" className="p-1.5 rounded text-red-400 hover:bg-red-500/10">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <button onClick={onClose} className="w-full py-3 border border-[#555] text-gray-300 font-semibold rounded-xl hover:bg-[#2A2A2A] hover:text-white transition-colors">
          Close
        </button>
      </div>
    </Modal>
  )
}

export default ServiceCategoriesModal
