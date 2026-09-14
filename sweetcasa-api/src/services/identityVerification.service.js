const crypto = require('crypto')
const { RekognitionClient, CompareFacesCommand, DetectFacesCommand } = require('@aws-sdk/client-rekognition')

const MIN_SIMILARITY = Number(process.env.IDENTITY_FACE_MATCH_THRESHOLD || 90)

function getClient() {
  const region = process.env.AWS_REGION
  if (!region) throw new Error('AWS_REGION is not configured.')
  return new RekognitionClient({ region })
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

function assertImage(file, label) {
  if (!file) throw new Error(`${label} is required.`)
  if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.mimetype)) {
    throw new Error(`${label} must be a JPG or PNG image for automatic face verification.`)
  }
}

async function assertUsableLivePhoto(client, buffer) {
  const out = await client.send(new DetectFacesCommand({
    Image: { Bytes: buffer },
    Attributes: ['DEFAULT'],
  }))
  const faces = out.FaceDetails || []
  if (!faces.length) throw new Error('No face was detected in the verification photo. Retake it with your face clearly visible.')

  // The printed portrait on the ID may also be detected. We intentionally allow
  // multiple faces here because the required pose is the person holding the ID
  // beside their face. CompareFaces will return the matching target face.
  const largest = [...faces].sort((a, b) => {
    const aa = (a.BoundingBox?.Width || 0) * (a.BoundingBox?.Height || 0)
    const bb = (b.BoundingBox?.Width || 0) * (b.BoundingBox?.Height || 0)
    return bb - aa
  })[0]
  if ((largest.Confidence || 0) < 95) {
    throw new Error('The face in the verification photo is not clear enough. Please retake the photo in good lighting.')
  }
}

async function compareIdentityFaces(nationalIdFile, verificationPhotoFile) {
  assertImage(nationalIdFile, 'National ID')
  assertImage(verificationPhotoFile, 'Verification photo')

  const client = getClient()
  await assertUsableLivePhoto(client, verificationPhotoFile.buffer)

  const result = await client.send(new CompareFacesCommand({
    SourceImage: { Bytes: nationalIdFile.buffer },
    TargetImage: { Bytes: verificationPhotoFile.buffer },
    SimilarityThreshold: MIN_SIMILARITY,
    QualityFilter: 'AUTO',
  }))

  const best = (result.FaceMatches || [])
    .map(m => Number(m.Similarity || 0))
    .sort((a, b) => b - a)[0] || 0

  return {
    verified: best >= MIN_SIMILARITY,
    similarity: Number(best.toFixed(2)),
    threshold: MIN_SIMILARITY,
    nationalIdHash: sha256(nationalIdFile.buffer),
    verificationPhotoHash: sha256(verificationPhotoFile.buffer),
  }
}

module.exports = { compareIdentityFaces, sha256 }
