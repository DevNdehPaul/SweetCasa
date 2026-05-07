const multer = require('multer')

const storage = multer.memoryStorage()

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024,
    files: 20,
  },
})

module.exports = upload
