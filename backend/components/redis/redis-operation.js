class RedisOP {
    #instance = null
    constructor(instance) {
        this.#instance = instance
    }

    /**
     * 判断指定的key是否存在
     * 
     * @param {string} key 
     */
    isKeyExists(key) {
        return new Promise((resolve, reject) => {
            this.#instance.exists(key, (err, result) => {
                if (err) reject(err)
                else
                    resolve(result)
            })
        })
    }

    /**
     * 设置key的过期时间
     * 
     * @param {string} key 
     * @param {number} ttl 
     */
    setKeyExpire(key, ttl) {
        return new Promise((resolve, reject) => {
            this.#instance.expire(key, ttl, (err, result) => {
                if (err) reject(err)
                else
                    resolve(result)
            })
        })
    }

    /**
     * 创建一个具有秒级TTL的string类型Key
     * 
     * @param {string} key 
     * @param {string} value 
     * @param {number} secTTL 
     */
    createKeyWithSecTTL(key, value, secTTL) {
        return new Promise((resolve, reject) => {
            this.#instance.set(key, value, 'EX', secTTL, (err, result) => {
                if (err) reject(err)
                else
                    resolve(result)
            })
        })
    }

    /**
     * 判断hash类型key中指定的field是否存在
     * 
     * @param {string} key 
     * @param {string} field 
     */
    isFieldExists(key, field) {
        return new Promise((resolve, reject) => {
            this.#instance.hexists(key, field, (err, result) => {
                if (err) reject(err)
                else
                    resolve(result)
            })
        })
    }

    /**
     * 设定hash类型key中多个field的值
     * 
     * @param {string} key 
     * @param {string | string[]} valueArray 
     */
    setValue(key, valueArray) {
        return new Promise((resolve, reject) => {
            this.#instance.hmset(key, valueArray, (err, result) => {
                if (err) reject(err)
                else
                    resolve(result)
            })
        })
    }


    /**
     * 获取hash类型key中指定field的值
     * 
     * @param {string} key 
     * @param {array} field 
     */
    getValue(key, field) {
        return new Promise((resolve, reject) => {
            this.#instance.hmget(key, field, (err, result) => {
                if (err) reject(err)
                else
                    resolve(result)
            })
        })
    }

    /**
     * 获取list类型key中指定范围的list
     * 
     * @param {string} key 
     * @param {number} start 
     * @param {number} end 
     */
    getListFromRange(key, start, end) {
        return new Promise((resolve, reject) => {
            this.#instance.lrange(key, start, end, (err, result) => {
                if (err) reject(err)
                else
                    resolve(result)
            })
        })
    }

    /**
     * 将数据添加到List的头部
     * 
     * @param {string} key 
     * @param {string | string[]} data 
     */
    pushToList(key, data) {
        return new Promise((resolve, reject) => {
            this.#instance.lpush(key, data, (err, result) => {
                if (err) reject(err)
                else
                    resolve(result)
            })
        })
    }

    /**
     * 通过游标遍历所有的key
     * 
     * @param {number} cursor 
     */
    scanKey(cursor) {
        return new Promise((resolve, reject) => {
            this.#instance.scan(cursor, (err, result) => {
                if (err) reject(err)
                else
                    resolve(result)
            })
        })
    }

    /**
     * 通过游标遍历所有的Set类型的key
     * 
     * @param {number} cursor 
     */
    scanSet(key, cursor) {
        return new Promise((resolve, reject) => {
            this.#instance.sscan(key, cursor, (err, result) => {
                if (err) reject(err)
                else
                    resolve(result)
            })
        })
    }

    /**
     * 删除Set中的成员
     * 
     * @param {string} key 
     * @param {string | string[]} memberValue 
     */
    removeSetMember(key, memberValue) {
        return new Promise((resolve, reject) => {
            this.#instance.srem(key, memberValue, (err, result) => {
                if (err) reject(err)
                else
                    resolve(result)
            })
        })
    }


    /**
     * 添加Set中的成员
     * 
     * @param {string} key 
     * @param {string | string[]} memberValue 
     */
    addSetMember(key, memberValue) {
        return new Promise((resolve, reject) => {
            this.#instance.sadd(key, memberValue, (err, result) => {
                if (err) reject(err)
                else
                    resolve(result)
            })
        })
    }

}


exports.RedisOP = RedisOP
