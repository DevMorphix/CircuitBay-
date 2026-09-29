import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, fieldErrors } from '../../lib/api.js'
import { useApi } from '../../lib/useApi.js'
import { linesToList, mediaUrl, rupees, btn } from './format.js'
import { Empty, Field, LoadState, PageTitle, Panel, Pill, Uploader } from './ui.jsx'

const LEVELS = ['Beginner', 'Intermediate', 'Advanced']
const BADGES = ['Student Kit', 'Beginner Friendly', 'Low stock', 'New']

// ---------------------------------------------------------------- list --
export function Products() {
  const [q, setQ] = useState('')
  const { data, error, loading, reload } = useApi(`/admin/products?limit=100${q ? `&q=${encodeURIComponent(q)}` : ''}`)

  return (
    <>
      <PageTitle
        title="Products"
        subtitle="Prices in rupees. Stock changes save immediately."
        action={<Link to="/admin/products/new" className={btn.primary}>+ New product</Link>}
      />
      <input
        type="search"
        placeholder="Search name or id, then press Enter"
        aria-label="Search products"
        className="field mb-4 max-w-sm"
        onKeyDown={(e) => e.key === 'Enter' && setQ(e.currentTarget.value.trim())}
      />
      <Panel>
        <LoadState loading={loading} error={error}>
          {data?.products.length === 0 ? (
            <Empty>No products found.</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-ink-400">
                  <tr>
                    <th className="py-2 pr-4">Product</th>
                    <th className="py-2 pr-4">Category</th>
                    <th className="py-2 pr-4">Price</th>
                    <th className="py-2 pr-4">Stock</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {data?.products.map((p) => (
                    <tr key={p.id} className="hover:bg-surface-soft">
                      <td className="py-3 pr-4">
                        <Link to={`/admin/products/${p.id}`} className="font-semibold text-brand-700 hover:underline">
                          {p.name}
                        </Link>
                        <p className="text-xs text-ink-400">{p.id}</p>
                      </td>
                      <td className="py-3 pr-4 text-ink-600">{p.category}</td>
                      <td className="py-3 pr-4 font-medium text-ink-900">{rupees(p.price)}</td>
                      <td className="py-3 pr-4">
                        <StockEditor product={p} onSaved={reload} />
                      </td>
                      <td className="py-3">{p.active ? <Pill tone="active">Live</Pill> : <Pill tone="muted">Hidden</Pill>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </LoadState>
      </Panel>
    </>
  )
}

function StockEditor({ product, onSaved }) {
  const [value, setValue] = useState(String(product.stock))
  const [state, setState] = useState('')
  const dirty = value !== String(product.stock)
  const save = async () => {
    setState('saving')
    try {
      await api.patch(`/admin/products/${product.id}/stock`, { stock: Math.max(0, Number(value) || 0) })
      setState('saved')
      onSaved()
    } catch {
      setState('error')
    }
  }
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min="0"
        aria-label={`Stock for ${product.name}`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && dirty && save()}
        className={`field w-20! py-1.5! ${product.stock === 0 ? 'border-navy-800/40!' : ''}`}
      />
      {dirty && (
        <button type="button" onClick={save} className={btn.link}>
          {state === 'saving' ? '…' : 'Save'}
        </button>
      )}
      {state === 'error' && <span className="text-xs text-navy-800">Failed</span>}
    </div>
  )
}

// -------------------------------------------------------------- editor --
export function ProductEditor() {
  const { id } = useParams()
  const isNew = !id
  const { data, error, loading } = useApi(isNew ? null : `/admin/products/${id}`)
  const categories = useApi('/categories')

  return (
    <>
      <PageTitle title={isNew ? 'New product' : 'Edit product'} action={<Link to="/admin/products" className={btn.link}>← All products</Link>} />
      <LoadState loading={loading || categories.loading} error={error ?? categories.error}>
        {(isNew || data) && categories.data && <ProductForm product={data?.product} categories={categories.data.categories} />}
      </LoadState>
    </>
  )
}

const specsToText = (specs = {}) => Object.entries(specs).map(([k, v]) => `${k}: ${v}`).join('\n')
const textToSpecs = (text) =>
  Object.fromEntries(
    linesToList(text)
      .map((l) => l.split(':'))
      .filter((parts) => parts.length >= 2)
      .map(([k, ...v]) => [k.trim(), v.join(':').trim()]),
  )

function ProductForm({ product, categories }) {
  const navigate = useNavigate()
  const isNew = !product
  const [images, setImages] = useState(product?.imageKeys ?? [])
  const [datasheetKey, setDatasheetKey] = useState(product?.datasheetKey ?? null)
  const [badges, setBadges] = useState(product?.badges ?? [])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState({ message: '', fields: {} })
  const [saved, setSaved] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    const d = Object.fromEntries(new FormData(e.currentTarget))
    const payload = {
      name: d.name,
      category: d.category,
      kit: d.kit === 'on',
      level: d.level || null,
      price: Number(d.price),
      stock: Number(d.stock),
      brand: d.brand || null,
      type: d.type || null,
      badges,
      forWhat: d.forWhat || null,
      build: d.build || null,
      inside: linesToList(d.inside ?? ''),
      specs: textToSpecs(d.specs ?? ''),
      images,
      datasheetKey,
      active: d.active === 'on',
    }
    setBusy(true)
    setSaved(false)
    setErr({ message: '', fields: {} })
    try {
      if (isNew) {
        await api.post('/admin/products', { id: d.id, ...payload })
        navigate(`/admin/products/${d.id}`, { replace: true })
      } else {
        await api.put(`/admin/products/${product.id}`, payload)
      }
      setSaved(true)
    } catch (e2) {
      setErr({ message: e2.message, fields: fieldErrors(e2) })
    } finally {
      setBusy(false)
    }
  }

  const hide = async () => {
    if (!window.confirm(`Hide "${product.name}" from the shop? Past orders keep it; you can re-enable it later.`)) return
    await api.del(`/admin/products/${product.id}`)
    navigate('/admin/products')
  }

  const fe = err.fields
  return (
    <form onSubmit={submit} className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
      <div className="grid content-start gap-5">
        <Panel title="Basics">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" id="p-name" name="name" required defaultValue={product?.name} error={fe.name} className="sm:col-span-2" />
            {isNew && <Field label="URL id" id="p-id" name="id" required pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="esp32-starter-kit" hint="Lowercase letters, numbers and dashes. Becomes /shop/product/<id> and can't be changed later." error={fe.id} className="sm:col-span-2" />}
            <Field label="Category" id="p-cat">
              <select id="p-cat" name="category" className="field" defaultValue={product?.category ?? categories[0]?.slug}>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Skill level" id="p-level">
              <select id="p-level" name="level" className="field" defaultValue={product?.level ?? ''}>
                <option value="">—</option>
                {LEVELS.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </Field>
            <Field label="Price (₹, incl. GST display)" id="p-price" name="price" type="number" min="0" step="0.01" required defaultValue={product?.price} error={fe.price} />
            <Field label="Stock" id="p-stock" name="stock" type="number" min="0" step="1" required defaultValue={product?.stock ?? 0} error={fe.stock} />
            <Field label="Brand" id="p-brand" name="brand" defaultValue={product?.brand ?? ''} />
            <Field label="Type" id="p-type" name="type" defaultValue={product?.type ?? ''} placeholder="Sensor, Microcontroller, Kit…" />
            <label className="flex items-center gap-2 text-sm text-ink-900">
              <input type="checkbox" name="kit" defaultChecked={product?.kit} className="h-4 w-4 accent-brand-600" /> This is a project kit
            </label>
            <label className="flex items-center gap-2 text-sm text-ink-900">
              <input type="checkbox" name="active" defaultChecked={product?.active ?? true} className="h-4 w-4 accent-brand-600" /> Visible in the shop
            </label>
          </div>
        </Panel>

        <Panel title="Description">
          <div className="grid gap-4">
            <Field as="textarea" rows={3} label="What it's for (shown first — describe the use, then specs)" id="p-for" name="forWhat" defaultValue={product?.forWhat ?? ''} />
            <Field label="You'll build (kits)" id="p-build" name="build" defaultValue={product?.build ?? ''} placeholder="Line follower, obstacle avoider, maze solver" />
            <Field as="textarea" rows={5} label="What's inside (one item per line)" id="p-inside" name="inside" defaultValue={(product?.inside ?? []).join('\n')} />
            <Field as="textarea" rows={5} label="Specs (one per line, Name: value)" id="p-specs" name="specs" defaultValue={specsToText(product?.specs)} placeholder={'MCU: ESP32-WROOM-32\nFlash: 4MB'} />
          </div>
        </Panel>
      </div>

      <div className="grid content-start gap-5">
        <Panel title="Photos" action={<Uploader folder="products" multiple label="Add photos" onUploaded={(u) => setImages((k) => [...k, ...u.map((x) => x.key)])} />}>
          {images.length === 0 ? (
            <p className="text-sm text-ink-600">No photos yet. The first photo is the main image.</p>
          ) : (
            <ul className="grid grid-cols-3 gap-3">
              {images.map((key, i) => (
                <li key={key} className="group relative">
                  <img src={mediaUrl(key)} alt="" className="aspect-square w-full rounded-lg border border-black/10 object-cover" />
                  <div className="mt-1 flex justify-between text-xs">
                    <button type="button" className={btn.link} disabled={i === 0} onClick={() => setImages((k) => [k[i], ...k.filter((_, j) => j !== i)])}>
                      {i === 0 ? 'Main' : 'Make main'}
                    </button>
                    <button type="button" className="font-semibold text-ink-400 hover:text-navy-800" onClick={() => setImages((k) => k.filter((_, j) => j !== i))}>
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Badges">
          <div className="flex flex-wrap gap-2">
            {BADGES.map((b) => (
              <label key={b} className={`cursor-pointer rounded-full border px-3 py-1 text-sm font-semibold ${badges.includes(b) ? 'border-brand-600 bg-brand-500/10 text-brand-700' : 'border-black/10 text-ink-600'}`}>
                <input type="checkbox" className="sr-only" checked={badges.includes(b)} onChange={() => setBadges((x) => (x.includes(b) ? x.filter((y) => y !== b) : [...x, b]))} />
                {b}
              </label>
            ))}
          </div>
        </Panel>

        <Panel title="Datasheet (PDF)" action={<Uploader folder="datasheets" accept="application/pdf" label={datasheetKey ? 'Replace' : 'Upload'} onUploaded={(u) => setDatasheetKey(u[0].key)} />}>
          {datasheetKey ? (
            <p className="flex justify-between text-sm">
              <a href={mediaUrl(datasheetKey)} target="_blank" rel="noreferrer" className={btn.link}>View datasheet</a>
              <button type="button" className="font-semibold text-ink-400 hover:text-navy-800" onClick={() => setDatasheetKey(null)}>Remove</button>
            </p>
          ) : (
            <p className="text-sm text-ink-600">None yet.</p>
          )}
        </Panel>

        <div className="card sticky bottom-4 grid gap-3 p-4">
          {err.message && <p role="alert" className="text-sm font-medium text-navy-800">{err.message}</p>}
          {saved && <p role="status" className="text-sm font-medium text-brand-700">Saved. Checkout and stock use this now — click “Publish site changes” to update the product pages.</p>}
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={busy} className={btn.primary}>
              {busy ? 'Saving…' : isNew ? 'Create product' : 'Save changes'}
            </button>
            {!isNew && (
              <>
                <a href={`/shop/product/${product.id}`} target="_blank" rel="noreferrer" className={btn.secondary}>View on site</a>
                {product.active && (
                  <button type="button" onClick={hide} className={btn.danger}>Hide</button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </form>
  )
}
