require('dotenv').config()

const { getSupabaseAdmin } = require('../src/config/supabase')

const BUCKET_NAME = 'drive'

async function createPrivateDriveBucket() {
  const supabase = getSupabaseAdmin()
  const { data: buckets, error: listError } =
    await supabase.storage.listBuckets()

  if (listError) throw listError

  const bucketExists = buckets.some((bucket) => bucket.name === BUCKET_NAME)

  if (bucketExists) {
    console.log(`Storage bucket "${BUCKET_NAME}" already exists.`)
    return
  }

  const { error: createError } = await supabase.storage.createBucket(
    BUCKET_NAME,
    { public: false },
  )

  if (createError) throw createError

  console.log(`Private storage bucket "${BUCKET_NAME}" created.`)
}

createPrivateDriveBucket().catch((error) => {
  console.error('Could not configure the drive bucket:', error.message)
  process.exitCode = 1
})
