const crypto = require('crypto')
const algorithm = 'aes-256-cbc'
const secretKey1 = process.env.SECRET_KEY_1 // Account Session and Todo Data
const secretKey2 = process.env.SECRET_KEY_2 // OTP Verification Code
const secretKey3 = process.env.SECRET_KEY_3 // Forgot Password Credentials
const secretKey4 = process.env.SECRET_KEY_4 // Backup Codes Credentials
const iv = crypto.randomBytes(16)

const encrypt = (text, method) => {
    let cipher = crypto.createCipheriv(algorithm, Buffer.from(eval(`secretKey${method}`)), iv)
    let encrypted = Buffer.concat([cipher.update(text), cipher.final()])
    return { iv: iv.toString('hex'), data: encrypted.toString('hex') }
}

const decrypt = (hash, method) => {
    let decipher = crypto.createDecipheriv(algorithm, Buffer.from(eval(`secretKey${method}`)), Buffer.from(hash.iv, 'hex'))
    let decrypted = Buffer.concat([decipher.update(Buffer.from(hash.data, 'hex')), decipher.final()])
    return decrypted.toString()
}

module.exports = { encrypt, decrypt }