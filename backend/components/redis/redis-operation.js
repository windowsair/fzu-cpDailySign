//// TDOO: 调用堆栈看不到
function cb(err, result) {
    let [resolve, reject] = this
    if (err) {
        console.log(err)
        reject(err)
    }
    else
        resolve(result)
}

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
            this.#instance.exists(key, cb.bind([resolve, reject]))
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
            this.#instance.expire(key, ttl, cb.bind([resolve, reject]))
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
            this.#instance.set(key, value, 'EX', secTTL, cb.bind([resolve, reject]))
        })
    }

    /**
     * 删除指定的一个或多个key
     *
     * @param {string | string []} key
     */
    deleteKey(key) {
        return new Promise((resolve, reject) => {
            this.#instance.del(key, cb.bind([resolve, reject]))
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
            this.#instance.hexists(key, field, cb.bind([resolve, reject]))
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
            this.#instance.hmset(key, valueArray, cb.bind([resolve, reject]))
        })
    }


    /**
     * 获取hash类型key中指定field的值
     *
     * @param {string} key
     * @param {array} field
     * @param {bool=false} parseAll 是否需要对结果字符串进行解析
     */
    getValue(key, field, parseAll = false) {
        return new Promise((resolve, reject) => {
            this.#instance.hmget(key, field, (err, result) => {
                if (err) {
                    console.log(err)
                    reject(err)
                    return
                }

                let resultCopy = result
                if (parseAll) {
                    resultCopy = result.map((item) => {
                        try {
                            item = JSON.parse(item)
                        } catch (e) {
                            if (e instanceof SyntaxError) {
                                item = item
                            } else {
                                throw e
                            }
                        }
                        return item
                    })
                }
                resolve(resultCopy)
            })
        })
    }

    /**
     * 删除hash类型key中多个field的值
     *
     * @param {string} key
     * @param {string | string[]} valueArray
     */
    delValue(key, valueArray) {
        return new Promise((resolve, reject) => {
            this.#instance.hdel(key, valueArray, cb.bind([resolve, reject]))
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
            this.#instance.lrange(key, start, end, cb.bind([resolve, reject]))
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
            this.#instance.lpush(key, data, cb.bind([resolve, reject]))
        })
    }

    /**
     * 通过游标遍历所有的key
     *
     * @param {number} cursor
     */
    scanKey(cursor) {
        return new Promise((resolve, reject) => {
            this.#instance.scan(cursor, cb.bind([resolve, reject]))
        })
    }

    /**
     * 通过游标遍历所有的Set类型的key
     *
     * @param {number} cursor
     */
    scanSet(key, cursor) {
        return new Promise((resolve, reject) => {
            this.#instance.sscan(key, cursor, cb.bind([resolve, reject]))
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
            this.#instance.srem(key, memberValue, cb.bind([resolve, reject]))
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
            this.#instance.sadd(key, memberValue, cb.bind([resolve, reject]))
        }
        )
    }

    /**
     * 判断Set内是否存在指定的成员
     *
     * @param {string} key
     * @param {string | stirng[]} memberValue
     */
    isMemberOfSet(key, memberValue) {
        return new Promise((resolve, reject) => {
            this.#instance.sismember(key, memberValue, cb.bind([resolve, reject]))
        })
    }

}


exports.RedisOP = RedisOP
