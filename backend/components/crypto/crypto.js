class DESCrypto {
    //#key = 'XCE927=='
    #key = 'ST83=@XV'
    #iv = Buffer.from([0x1, 0x2, 0x3, 0x4, 0x5, 0x6, 0x7, 0x8])

    encrypt(str) {
        const crypto = require('crypto')

        let cipher = crypto.createCipheriv('des-cbc', this.#key, this.#iv)
        cipher.setAutoPadding(true) // 显式启用PKCS5 padding
        let encrypted = cipher.update(str, 'utf8', 'base64')
        encrypted += cipher.final('base64')

        return encrypted
    }

    encryptWithKey(str, key) {
        const crypto = require('crypto')

        let cipher = crypto.createCipheriv('des-cbc', key, this.#iv)
        cipher.setAutoPadding(true) // 显式启用PKCS5 padding
        let encrypted = cipher.update(str, 'utf8', 'base64')
        encrypted += cipher.final('base64')

        return encrypted
    }


    decrypt(strBase64) {
        const crypto = require('crypto')

        let decipher = crypto.createDecipheriv('des-cbc', this.#key, this.#iv)
        decipher.setAutoPadding(true) // 显式启用PKCS5 padding
        let decrypted = decipher.update(strBase64, 'base64', 'utf-8')
        decrypted += decipher.final('utf-8')

        return decrypted
    }
}

class AESCrypto {
    ramdomString(length) {
        const t = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678'
        let str = ''
        for (let i = 0; i < length; i++) str += t.charAt(Math.floor(Math.random() * t.length))
        return str
    }
    encrypt(data, key, iv) {
        const crypto = require('crypto')
        iv = Buffer.from(key, 'utf8') || iv

        let cipher = crypto.createCipheriv('aes-128-cbc', key, iv)
        cipher.setAutoPadding(true) // 显式启用PKCS5 padding
        let encrypted = cipher.update(data, 'utf8', 'base64')
        encrypted += cipher.final('base64')

        return encrypted
    }
}


class HashMD5 {
    static getMD5String(strToHash) {
        const crypto = require('crypto')
        return crypto.createHash('md5').update(strToHash).digest('hex')
    }
}

class RSACrypto {
    static encrypt(data, publicKey) {
        const crypto = require('crypto')

        const opts = {
            key: publicKey,
            padding: crypto.constants.RSA_PKCS1_PADDING,
        }
        const encryptedData = crypto.publicEncrypt(
            opts,
            Buffer.from(data)
        )

        return encryptedData.toString("base64")
    }
}


exports.DESCrypto = DESCrypto
exports.AESCrypto = AESCrypto
exports.HashMD5 = HashMD5
exports.RSACrypto = RSACrypto