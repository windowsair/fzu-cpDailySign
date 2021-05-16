class DESCrypto {
    #iv = Buffer.from([0x1, 0x2, 0x3, 0x4, 0x5, 0x6, 0x7, 0x8])

    /**
     * 使用默认的IV block进行加密
     * @param {*} data 待加密的数据
     * @param {string} key  DES密钥
     */
    encrypt(data, key) {
        const crypto = require('crypto')

        let cipher = crypto.createCipheriv('des-cbc', key, this.#iv)
        cipher.setAutoPadding(true) // 显式启用PKCS5 padding
        let encrypted = cipher.update(Buffer.from(data), 'utf8', 'base64')
        encrypted += cipher.final('base64')

        return encrypted
    }

    /**
     * 使用的IV block进行解密
     * @param {string} strBase64 待解密的数据, Base64表示
     * @param {string} key DES密钥
     */
    decrypt(strBase64, key) {
        const crypto = require('crypto')

        let decipher = crypto.createDecipheriv('des-cbc', key, this.#iv)
        decipher.setAutoPadding(true) // 显式启用PKCS5 padding
        let decrypted = decipher.update(strBase64, 'base64', 'utf-8')
        decrypted += decipher.final('utf-8')

        return decrypted
    }
}

class AESCrypto {
    #iv = Buffer.from([0x1, 0x2, 0x3, 0x4, 0x5, 0x6, 0x7, 0x8, 0x9, 0x1, 0x2, 0x3, 0x4, 0x5, 0x6, 0x7])

    ramdomString(length) {
        const t = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678'
        let str = ''
        for (let i = 0; i < length; i++) str += t.charAt(Math.floor(Math.random() * t.length))
        return str
    }

    encrypt(data, key) {
        const crypto = require('crypto')
        // iv = Buffer.from(key, 'utf8') || iv

        let cipher = crypto.createCipheriv('aes-128-cbc', key, this.#iv)
        cipher.setAutoPadding(true) // 显式启用PKCS5 padding
        let encrypted = cipher.update(data, 'utf8', 'base64')
        encrypted += cipher.final('base64')

        return encrypted
    }

    /**
     * 使用的IV block进行解密
     * @param {string} strBase64 待解密的数据, Base64表示
     * @param {string} key AES密钥
     */
    decrypt(strBase64, key) {
        const crypto = require('crypto')

        let decipher = crypto.createDecipheriv('aes-128-cbc', key, this.#iv)
        decipher.setAutoPadding(true) // 显式启用PKCS5 padding
        let decrypted = decipher.update(strBase64, 'base64', 'utf-8')
        decrypted += decipher.final('utf-8')

        return decrypted
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